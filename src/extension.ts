import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import {
  buildRigConfig,
  buildRigSnapshot,
  buildScanResult,
  buildUpdatedCss,
  extractParamsFromCss,
  extractTailwindParams,
  extractCssImportsFromCss,
  extractCssLinksFromHtml,
  RigEditPlan,
  RigScanResult
} from "./rig-engine";

const OUTPUT_CHANNEL_NAME = "Rigger";
const STATE_KEY = "rigger.ui.state";
const ONBOARDING_KEY = "rigger.onboarding.complete";
const TELEMETRY_KEY = "rigger.telemetry.optIn";
const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";

let output: vscode.OutputChannel;
let lastScan: RigScanResult | null = null;
let lastEditPlan: RigEditPlan | null = null;
let currentOverrides: Record<string, string | number> = {};

export function activate(context: vscode.ExtensionContext) {
  output = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  logAiSettingsStatus();

  context.subscriptions.push(
    vscode.commands.registerCommand("rigger.openPanel", () => {
      RiggerPanel.createOrShow(context);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("rigger.rigItUp", async () => {
      if (!RiggerPanel.currentPanel) {
        RiggerPanel.createOrShow(context);
      }
      await RiggerPanel.currentPanel?.runRigPipeline();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("rigger.applyEdits", async () => {
      await RiggerPanel.currentPanel?.applyRigEdits();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("rigger.resetOnboarding", async () => {
      await context.globalState.update(ONBOARDING_KEY, false);
      await context.globalState.update(TELEMETRY_KEY, false);
      vscode.window.showInformationMessage("Rigger: Onboarding reset.");
      RiggerPanel.currentPanel?.refreshState();
    })
  );
}

export function deactivate() {
  output?.dispose();
}

class RiggerPanel {
  static currentPanel: RiggerPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly context: vscode.ExtensionContext;

  private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    this.panel = panel;
    this.context = context;

    this.panel.onDidDispose(() => this.dispose(), null, context.subscriptions);
    this.panel.webview.onDidReceiveMessage((message) => this.handleMessage(message));

    this.panel.webview.html = getWebviewHtml(panel.webview, context);
  }

  static createOrShow(context: vscode.ExtensionContext) {
    const column = vscode.window.activeTextEditor?.viewColumn;

    if (RiggerPanel.currentPanel) {
      RiggerPanel.currentPanel.panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "rigger",
      "Rigger",
      column ?? vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, "webview", "dist"),
          vscode.Uri.joinPath(context.extensionUri, "demo")
        ]
      }
    );

    RiggerPanel.currentPanel = new RiggerPanel(panel, context);
  }

  dispose() {
    RiggerPanel.currentPanel = undefined;
    this.panel.dispose();
  }

  private postMessage(message: unknown) {
    this.panel.webview.postMessage(message);
  }

  refreshState() {
    this.postMessage({ type: "state", payload: this.getState() });
  }

  private handleMessage(message: any) {
    switch (message?.type) {
      case "ready":
      case "requestState":
        this.postMessage({ type: "state", payload: this.getState() });
        break;
      case "persistState":
        this.context.workspaceState.update(STATE_KEY, message.payload);
        break;
      case "completeOnboarding": {
        const telemetryOptIn = Boolean(message.payload?.telemetryOptIn);
        this.context.globalState.update(ONBOARDING_KEY, true);
        this.context.globalState.update(TELEMETRY_KEY, telemetryOptIn);
        this.postMessage({ type: "state", payload: this.getState() });
        break;
      }
      case "rigItUp":
        this.runRigPipeline();
        break;
      case "applyEdits":
        this.applyRigEdits();
        break;
      case "updateVars":
        this.applyVariableOverrides(message.payload);
        break;
      case "openSource":
        this.openSourceLocation(message.payload);
        break;
      case "openDemo":
        this.openDemoPage();
        break;
      case "openGradientsDemo":
        this.openGradientsWorkspace();
        break;
      case "openExternal":
        if (message.payload?.url) {
          this.openExternalUrl(String(message.payload.url));
        }
        break;
      case "openPreview":
        if (message.payload?.url) {
          this.openPreviewUrl(String(message.payload.url), message.payload?.target);
        }
        break;
      case "exportSnapshot":
        this.exportSnapshot(message.payload);
        break;
      case "requestLivePreview":
        this.applyRigEdits();
        break;
      case "selectCss":
        if (message.payload?.file) {
          this.scanWithCssFile(message.payload.file);
        }
        break;
      case "log":
        log(`WEBVIEW: ${message.payload}`);
        break;
      default:
        break;
    }
  }

  private getState() {
    const defaultState = {
      layout: { left: 28, right: 72, rightTop: 60, rightBottom: 40 },
      density: "comfortable",
      lastGroup: "Colour",
      livePreview: false,
      previewUrl: "http://localhost:5173",
      previewTarget: "simpleBrowser"
    };
    const storedState = this.context.workspaceState.get<any>(STATE_KEY, defaultState);
    const previewTarget =
      storedState.previewTarget ?? (storedState.embedPreview ? "embedded" : defaultState.previewTarget);
    const uiState = { ...defaultState, ...storedState, previewTarget };
    const onboardingComplete = this.context.globalState.get<boolean>(ONBOARDING_KEY, false);
    const telemetryOptIn = this.context.globalState.get<boolean>(TELEMETRY_KEY, false);
    const demoUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "demo", "index.html")
    );
    return {
      uiState,
      onboarding: {
        complete: onboardingComplete,
        telemetryOptIn
      },
      demoUrl: demoUri.toString()
    };
  }

  async runRigPipeline() {
    log("Rig pipeline started");

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showWarningMessage("Rigger: No workspace folder open.");
      this.postMessage({ type: "scanError", payload: "No workspace folder open." });
      return;
    }

    const root = workspaceFolder.uri.fsPath;
    const diagnostics: string[] = [];
    const projectType = await detectProjectType(root, diagnostics);

    const { file: cssFile, candidates } = await findPrimaryCssFile(root, projectType, diagnostics);
    if (!cssFile) {
      vscode.window.showWarningMessage("Rigger: No CSS file found to scan.");
      this.postMessage({ type: "scanError", payload: "No CSS file found to scan." });
      return;
    }

    const content = fs.readFileSync(cssFile, "utf-8");
    const cssParams = extractParamsFromCss(content, cssFile);
    const tailwindParams = await loadTailwindParams(root, diagnostics);
    const params = [...cssParams, ...tailwindParams];
    lastScan = buildScanResult(
      content,
      cssFile,
      root,
      projectType,
      diagnostics,
      candidates,
      params
    );
    lastEditPlan = null;
    currentOverrides = {};

    log(`Detected ${projectType} project. Params: ${lastScan.params.length}`);
    this.postMessage({ type: "scanResult", payload: lastScan });
  }

  async applyRigEdits() {
    if (!lastScan || !lastScan.cssFile) {
      vscode.window.showWarningMessage("Rigger: Run Rig it up first.");
      return;
    }

    const isTest =
      this.context.extensionMode === vscode.ExtensionMode.Test ||
      process.env.RIGGER_AUTO_APPLY === "1";

    const cssPath = lastScan.cssFile;
    const cssUri = vscode.Uri.file(cssPath);
    const originalContent = fs.readFileSync(cssPath, "utf-8");

    const updatedCss = buildUpdatedCss(originalContent, lastScan.params, currentOverrides);
    const configJson = buildRigConfig(lastScan);

    lastEditPlan = { cssFile: cssPath, updatedCss, configJson };

    if (!isTest) {
      await showDiff(cssUri, updatedCss);

      const confirm = await vscode.window.showInformationMessage(
        "Apply Rigger edits to your workspace?",
        { modal: true },
        "Apply",
        "Cancel"
      );

      if (confirm !== "Apply") {
        this.postMessage({ type: "applyStatus", payload: { applied: false } });
        return;
      }
    }

    const edit = new vscode.WorkspaceEdit();
    const doc = await vscode.workspace.openTextDocument(cssUri);
    const fullRange = new vscode.Range(doc.positionAt(0), doc.positionAt(originalContent.length));
    edit.replace(cssUri, fullRange, updatedCss);

    const configUri = vscode.Uri.file(path.join(lastScan.root, "rig.config.json"));
    try {
      await vscode.workspace.fs.stat(configUri);
      const configDoc = await vscode.workspace.openTextDocument(configUri);
      const configRange = new vscode.Range(
        configDoc.positionAt(0),
        configDoc.positionAt(configDoc.getText().length)
      );
      edit.replace(configUri, configRange, configJson);
    } catch {
      edit.createFile(configUri, { ignoreIfExists: true });
      edit.insert(configUri, new vscode.Position(0, 0), configJson);
    }

    const success = await vscode.workspace.applyEdit(edit);
    if (success) {
      log("Rig edits applied");
      vscode.window.showInformationMessage("Rigger: Edits applied.");
      this.postMessage({ type: "applyStatus", payload: { applied: true } });
    } else {
      vscode.window.showErrorMessage("Rigger: Failed to apply edits.");
      this.postMessage({ type: "applyStatus", payload: { applied: false } });
    }
  }

  async applyVariableOverrides(payload: { values?: Record<string, string | number> }) {
    if (!lastScan || !lastScan.cssFile) return;
    currentOverrides = payload?.values ?? currentOverrides;

    const cssPath = lastScan.cssFile;
    const cssUri = vscode.Uri.file(cssPath);
    const originalContent = fs.readFileSync(cssPath, "utf-8");
    const updatedCss = buildUpdatedCss(originalContent, lastScan.params, currentOverrides);

    const edit = new vscode.WorkspaceEdit();
    const doc = await vscode.workspace.openTextDocument(cssUri);
    const fullRange = new vscode.Range(doc.positionAt(0), doc.positionAt(originalContent.length));
    edit.replace(cssUri, fullRange, updatedCss);
    await vscode.workspace.applyEdit(edit);
  }

  async scanWithCssFile(cssFile: string) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return;
    const root = workspaceFolder.uri.fsPath;
    const diagnostics: string[] = [`Using selected CSS file: ${cssFile}`];
    const projectType = await detectProjectType(root, diagnostics);
    if (!fs.existsSync(cssFile)) {
      vscode.window.showWarningMessage("Rigger: Selected CSS file no longer exists.");
      return;
    }
    const content = fs.readFileSync(cssFile, "utf-8");
    const { candidates } = await findPrimaryCssFile(root, projectType, []);
    const cssParams = extractParamsFromCss(content, cssFile);
    const tailwindParams = await loadTailwindParams(root, diagnostics);
    const params = [...cssParams, ...tailwindParams];
    lastScan = buildScanResult(
      content,
      cssFile,
      root,
      projectType,
      diagnostics,
      candidates,
      params
    );
    lastEditPlan = null;
    currentOverrides = {};
    this.postMessage({ type: "scanResult", payload: lastScan });
  }

  async openSourceLocation(payload: { file?: string; line?: number; column?: number }) {
    if (!payload?.file) return;
    try {
      const uri = vscode.Uri.file(payload.file);
      const doc = await vscode.workspace.openTextDocument(uri);
      const line = Math.max((payload.line ?? 1) - 1, 0);
      const column = Math.max((payload.column ?? 1) - 1, 0);
      const position = new vscode.Position(line, column);
      const editor = await vscode.window.showTextDocument(doc, { preview: true });
      editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
      editor.selection = new vscode.Selection(position, position);
    } catch (error) {
      vscode.window.showWarningMessage(`Rigger: Unable to open source file. ${String(error)}`);
    }
  }

  async openDemoPage() {
    try {
      const uri = vscode.Uri.joinPath(this.context.extensionUri, "demo", "index.html");
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc, { preview: true });
    } catch (error) {
      vscode.window.showWarningMessage(`Rigger: Unable to open demo page. ${String(error)}`);
    }
  }

  async openGradientsWorkspace() {
    try {
      const uri = vscode.Uri.joinPath(
        this.context.extensionUri,
        "demo-workspace",
        "gradients-bg"
      );
      await vscode.workspace.fs.stat(uri);
      await vscode.commands.executeCommand("vscode.openFolder", uri, true);
    } catch (error) {
      vscode.window.showWarningMessage(
        `Rigger: Unable to open gradient demo workspace. ${String(error)}`
      );
    }
  }

  async openExternalUrl(url: string) {
    try {
      await vscode.env.openExternal(vscode.Uri.parse(url));
    } catch (error) {
      vscode.window.showWarningMessage(`Rigger: Unable to open link. ${String(error)}`);
    }
  }

  async openPreviewUrl(url: string, target?: "simpleBrowser" | "external" | "embedded") {
    if (target === "embedded") return;
    if (target === "external") {
      try {
        await vscode.env.openExternal(vscode.Uri.parse(url));
      } catch (error) {
        vscode.window.showWarningMessage(`Rigger: Unable to open preview. ${String(error)}`);
      }
      return;
    }
    try {
      await vscode.commands.executeCommand("simpleBrowser.show", url);
    } catch {
      try {
        await vscode.env.openExternal(vscode.Uri.parse(url));
      } catch (error) {
        vscode.window.showWarningMessage(`Rigger: Unable to open preview. ${String(error)}`);
      }
    }
  }

  async exportSnapshot(payload?: { values?: Record<string, string | number> }) {
    if (!lastScan) return;
    const overrides = payload?.values ?? {};
    const snapshot = buildRigSnapshot(lastScan, overrides);
    const snapshotUri = vscode.Uri.file(path.join(lastScan.root, "rig.snapshot.json"));

    const edit = new vscode.WorkspaceEdit();
    try {
      await vscode.workspace.fs.stat(snapshotUri);
      const doc = await vscode.workspace.openTextDocument(snapshotUri);
      const range = new vscode.Range(
        doc.positionAt(0),
        doc.positionAt(doc.getText().length)
      );
      edit.replace(snapshotUri, range, snapshot);
    } catch {
      edit.createFile(snapshotUri, { ignoreIfExists: true });
      edit.insert(snapshotUri, new vscode.Position(0, 0), snapshot);
    }

    const success = await vscode.workspace.applyEdit(edit);
    if (success) {
      vscode.window.showInformationMessage("Rigger: Snapshot exported.");
    } else {
      vscode.window.showErrorMessage("Rigger: Failed to export snapshot.");
    }
  }
}

async function detectProjectType(root: string, diagnostics: string[]) {
  const packageJsonPath = path.join(root, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps?.react) {
        diagnostics.push("Detected react dependency in package.json");
        return "react" as const;
      }
    } catch (error) {
      diagnostics.push(`Failed to parse package.json: ${String(error)}`);
    }
  }

  const indexHtml = path.join(root, "index.html");
  if (fs.existsSync(indexHtml)) {
    diagnostics.push("Detected index.html");
    return "vanilla" as const;
  }

  diagnostics.push("Unknown project type");
  return "unknown" as const;
}

const TAILWIND_CONFIG_FILES = [
  "tailwind.config.js",
  "tailwind.config.cjs",
  "tailwind.config.mjs",
  "tailwind.config.ts"
];

function findTailwindConfig(root: string): string | null {
  for (const file of TAILWIND_CONFIG_FILES) {
    const full = path.join(root, file);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

async function loadTailwindParams(root: string, diagnostics: string[]) {
  const configPath = findTailwindConfig(root);
  if (!configPath) {
    const packageJsonPath = path.join(root, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps?.tailwindcss) {
          diagnostics.push("Tailwind dependency found, but no tailwind.config file detected.");
        }
      } catch (error) {
        diagnostics.push(`Failed to parse package.json for Tailwind: ${String(error)}`);
      }
    }
    return [];
  }

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    const params = extractTailwindParams(content, configPath);
    diagnostics.push(`Tailwind tokens: ${params.length} from ${path.basename(configPath)}`);
    return params;
  } catch (error) {
    diagnostics.push(`Tailwind parse failed: ${String(error)}`);
    return [];
  }
}

async function findPrimaryCssFile(
  root: string,
  projectType: "react" | "vanilla" | "unknown",
  diagnostics: string[]
) {
  const candidates = await findCssCandidates(root, projectType, diagnostics);
  const sorted = candidates.sort((a, b) => b.score - a.score);
  const top = sorted[0];
  if (top) {
    diagnostics.push(`Using CSS file: ${top.file}`);
  } else {
    diagnostics.push("No CSS files found");
  }
  return { file: top?.file ?? null, candidates: sorted };
}

async function findCssCandidates(
  root: string,
  projectType: "react" | "vanilla" | "unknown",
  diagnostics: string[]
) {
  const entries = [
    "index.html",
    "src/main.tsx",
    "src/main.jsx",
    "src/main.ts",
    "src/main.js",
    "src/index.tsx",
    "src/index.jsx",
    "src/index.ts",
    "src/index.js",
    "src/App.tsx",
    "src/App.jsx",
    "app/layout.tsx",
    "app/page.tsx",
    "pages/_app.tsx",
    "pages/index.tsx"
  ];

  const preferredCss = [
    "src/index.css",
    "src/styles.css",
    "src/App.css",
    "src/global.css",
    "styles/globals.css",
    "styles.css",
    "style.css"
  ];

  const candidates = new Map<string, { file: string; score: number; reason: string }>();
  const exclude = "**/{node_modules,dist,build,coverage,.git,.next,out}/**";

  const addCandidate = (file: string, score: number, reason: string) => {
    if (!file.endsWith(".css")) return;
    if (!fs.existsSync(file)) return;
    if (file.endsWith(".min.css")) return;
    const isModule = file.endsWith(".module.css");
    const adjustedScore = isModule ? Math.max(1, Math.round(score * 0.5)) : score;
    const tag = isModule && !reason.includes("module") ? `${reason} (module)` : reason;
    const existing = candidates.get(file);
    if (existing) {
      existing.score += adjustedScore;
      existing.reason = `${existing.reason}; ${tag}`;
    } else {
      candidates.set(file, { file, score: adjustedScore, reason: tag });
    }
  };

  for (const css of preferredCss) {
    addCandidate(path.join(root, css), 6, "preferred");
  }

  for (const entry of entries) {
    const full = path.join(root, entry);
    if (!fs.existsSync(full)) continue;
    const content = fs.readFileSync(full, "utf-8");
    const dir = path.dirname(full);
    const importRegex = /import\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+\.css[^'"]*)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(content))) {
      const target = resolveCssPath(root, dir, match[1]);
      addCandidate(target, 10, `import in ${entry}`);
    }
    if (entry.endsWith(".html")) {
      const links = extractCssLinksFromHtml(content);
      for (const link of links) {
        const target = resolveCssPath(root, dir, link);
        addCandidate(target, 8, `link in ${entry}`);
      }
    }
  }

  const jsFiles = await vscode.workspace.findFiles(
    "**/*.{ts,tsx,js,jsx}",
    exclude
  );
  const moduleImportRegex = /import\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+\.module\.css)['"]/g;
  const moduleFilesToScan = jsFiles.slice(0, 200);
  for (const uri of moduleFilesToScan) {
    const rel = path.relative(root, uri.fsPath);
    const content = fs.readFileSync(uri.fsPath, "utf-8");
    let match: RegExpExecArray | null;
    moduleImportRegex.lastIndex = 0;
    while ((match = moduleImportRegex.exec(content))) {
      const target = resolveCssPath(root, path.dirname(uri.fsPath), match[1]);
      addCandidate(target, 6, `module import in ${rel}`);
    }
  }

  const moduleCssFiles = await vscode.workspace.findFiles("**/*.module.css", exclude);
  for (const uri of moduleCssFiles) {
    addCandidate(uri.fsPath, 3, "module css");
  }

  const cssFiles = await vscode.workspace.findFiles("**/*.css", exclude);
  const cssFilesToScan = cssFiles.slice(0, 120);
  for (const uri of cssFilesToScan) {
    const rel = path.relative(root, uri.fsPath);
    const content = fs.readFileSync(uri.fsPath, "utf-8");
    const imports = extractCssImportsFromCss(content);
    for (const imp of imports) {
      const target = resolveCssPath(root, path.dirname(uri.fsPath), imp);
      addCandidate(target, 5, `@import in ${rel}`);
    }
  }
  for (const uri of cssFiles) {
    addCandidate(uri.fsPath, 1, "discovered");
  }

  if (projectType === "react") {
    for (const css of ["src/index.css", "src/App.css"]) {
      addCandidate(path.join(root, css), 4, "react default");
    }
  }

  if (projectType === "vanilla") {
    for (const css of ["styles.css", "style.css"]) {
      addCandidate(path.join(root, css), 4, "vanilla default");
    }
  }

  const list = Array.from(candidates.values());
  diagnostics.push(`CSS candidates: ${list.length}`);
  return list;
}

function resolveCssPath(root: string, baseDir: string, target: string) {
  const cleaned = target.split(/[?#]/)[0];
  if (cleaned.startsWith("/")) {
    return path.join(root, cleaned);
  }
  if (cleaned.startsWith(".")) {
    return path.resolve(baseDir, cleaned);
  }
  return path.join(root, cleaned);
}

async function showDiff(originalUri: vscode.Uri, updatedContent: string) {
  const tempDoc = await vscode.workspace.openTextDocument({
    content: updatedContent,
    language: "css"
  });

  await vscode.commands.executeCommand(
    "vscode.diff",
    originalUri,
    tempDoc.uri,
    "Rigger: Preview CSS Changes"
  );
}

function log(message: string) {
  const timestamp = new Date().toLocaleTimeString();
  output.appendLine(`[${timestamp}] ${message}`);
}

interface RiggerAiSettings {
  provider: "openai" | "none";
  model: string;
  baseUrl: string;
  apiKey: string;
  apiKeySource: "setting" | "env" | "none";
}

function getAiSettings(): RiggerAiSettings {
  const cfg = vscode.workspace.getConfiguration("rigger");
  const provider = cfg.get<"openai" | "none">("ai.provider", "openai");
  const model = cfg.get<string>("ai.model", DEFAULT_OPENAI_MODEL);
  const baseUrl = cfg.get<string>("ai.baseUrl", DEFAULT_OPENAI_BASE_URL);
  const settingKey = cfg.get<string>("ai.apiKey", "").trim();
  const envKey = (process.env.OPENAI_API_KEY ?? "").trim();
  const apiKey = settingKey || envKey || "";
  const apiKeySource: "setting" | "env" | "none" = settingKey
    ? "setting"
    : envKey
    ? "env"
    : "none";

  return { provider, model, baseUrl, apiKey, apiKeySource };
}

function logAiSettingsStatus() {
  const ai = getAiSettings();
  if (ai.provider !== "openai") {
    log("AI provider disabled (rigger.ai.provider=none).");
    return;
  }
  if (!ai.apiKey) {
    log("AI provider openai configured, but no API key found (set rigger.ai.apiKey or OPENAI_API_KEY).");
    return;
  }
  log(`AI provider openai active. model=${ai.model} baseUrl=${ai.baseUrl} keySource=${ai.apiKeySource}`);
}

function getWebviewHtml(webview: vscode.Webview, context: vscode.ExtensionContext) {
  const devMode =
    process.env.RIGGER_DEV_WEBVIEW === "1" ||
    vscode.workspace.getConfiguration("rigger").get<boolean>("devWebview");

  const nonce = getNonce();
  if (devMode) {
    const devUrl = "http://localhost:5173";
    const csp = [
      "default-src 'none';",
      `img-src ${webview.cspSource} https:;`,
      `style-src ${webview.cspSource} 'unsafe-inline' ${devUrl};`,
      `script-src 'unsafe-eval' ${devUrl};`,
      `connect-src ${devUrl} ws://localhost:5173;`,
      `frame-src ${webview.cspSource} http://localhost:* http://127.0.0.1:*;`,
      "font-src https: data:;"
    ].join(" ");

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Rigger</title>
</head>
<body>
<div id="root"></div>
<script type="module" src="${devUrl}/src/main.tsx"></script>
</body>
</html>`;
  }

  const manifestPath = path.join(context.extensionPath, "webview", "dist", ".vite", "manifest.json");
  let manifest: any;
  try {
    const manifestRaw = fs.readFileSync(manifestPath, "utf-8");
    manifest = JSON.parse(manifestRaw);
  } catch (error) {
    const csp = [
      "default-src 'none';",
      `style-src ${webview.cspSource} 'unsafe-inline';`,
      `script-src 'nonce-${nonce}';`
    ].join(" ");
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Rigger</title>
</head>
<body>
<div style="padding:16px;font-family:Segoe UI, sans-serif;">
  <h3>Rigger webview not built</h3>
  <p>Run <code>npm run build:webview</code> or enable dev mode (rigger.devWebview).</p>
</div>
<script nonce="${nonce}"></script>
</body>
</html>`;
  }

  const entry = manifest["index.html"];
  const scriptFile = entry.file;
  const styleFile = entry.css?.[0];

  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "webview", "dist", scriptFile)
  );
  const styleUri = styleFile
    ? webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, "webview", "dist", styleFile)
      )
    : undefined;

  const csp = [
    "default-src 'none';",
    `img-src ${webview.cspSource} https: data:;`,
    `style-src ${webview.cspSource} 'unsafe-inline';`,
    `script-src 'nonce-${nonce}';`,
    `frame-src ${webview.cspSource} http://localhost:* http://127.0.0.1:*;`,
    "font-src https: data:;"
  ].join(" ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Rigger</title>
${styleUri ? `<link href="${styleUri}" rel="stylesheet" />` : ""}
</head>
<body>
<div id="root"></div>
<script nonce="${nonce}" type="module" src="${scriptUri}"></script>
</body>
</html>`;
}

function getNonce() {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
