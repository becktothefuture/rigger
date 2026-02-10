import React from "react";
import { Slider } from "./components/ui/slider";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from "./components/ui/resizable";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./components/ui/collapsible";
import { vscode } from "./vscode";
import { BootstrapState, RigGroup, RigParam, RigScanResult, UiState } from "./types";

const defaultUiState: UiState = {
  layout: { left: 28, right: 72, rightTop: 60, rightBottom: 40 },
  density: "comfortable",
  lastGroup: "Colour",
  livePreview: false,
  previewUrl: "http://localhost:5173",
  previewTarget: "simpleBrowser"
};

const groupOrder: RigGroup[] = [
  "Colour",
  "Typography",
  "Spacing",
  "Radius",
  "Shadow",
  "Motion",
  "Other"
];

function groupParams(params: RigParam[]) {
  const grouped = new Map<RigGroup, RigParam[]>();
  for (const group of groupOrder) grouped.set(group, []);
  for (const param of params) {
    const list = grouped.get(param.group) ?? [];
    list.push(param);
    grouped.set(param.group, list);
  }
  return grouped;
}

function useDebouncedCallback<T extends (...args: any[]) => void>(callback: T, delay = 200) {
  const timeout = React.useRef<number | null>(null);
  return (...args: Parameters<T>) => {
    if (timeout.current) window.clearTimeout(timeout.current);
    timeout.current = window.setTimeout(() => callback(...args), delay);
  };
}

export default function App() {
  const [uiState, setUiState] = React.useState<UiState>(defaultUiState);
  const [scanResult, setScanResult] = React.useState<RigScanResult | null>(null);
  const [values, setValues] = React.useState<Record<string, string | number>>({});
  const [selectedParam, setSelectedParam] = React.useState<RigParam | null>(null);
  const [fineMode, setFineMode] = React.useState(false);
  const [hasApplied, setHasApplied] = React.useState(false);
  const [isScanning, setIsScanning] = React.useState(false);
  const [scanError, setScanError] = React.useState<string | null>(null);
  const [confidenceFilter, setConfidenceFilter] = React.useState<"all" | "medium" | "high">(
    "medium"
  );
  const [isReady, setIsReady] = React.useState(false);
  const [onboardingComplete, setOnboardingComplete] = React.useState(false);
  const [telemetryOptIn, setTelemetryOptIn] = React.useState(false);
  const [demoUrl, setDemoUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    document.documentElement.setAttribute("data-density", uiState.density);
  }, [uiState.density]);

  React.useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      if (message?.type === "state") {
        const payload = message.payload as BootstrapState | UiState;
        const rawState = (payload as BootstrapState)?.uiState ?? (payload as UiState);
        const legacyEmbed = (rawState as { embedPreview?: boolean })?.embedPreview ?? false;
        const previewTarget =
          (rawState as UiState).previewTarget ?? (legacyEmbed ? "embedded" : defaultUiState.previewTarget);
        const nextState: UiState = {
          ...defaultUiState,
          ...rawState,
          previewTarget,
          layout: { ...defaultUiState.layout, ...(rawState as UiState).layout }
        };
        setUiState(nextState);
        const onboarding = (payload as BootstrapState)?.onboarding;
        if (onboarding) {
          setOnboardingComplete(Boolean(onboarding.complete));
          setTelemetryOptIn(Boolean(onboarding.telemetryOptIn));
        }
        const demo = (payload as BootstrapState)?.demoUrl;
        if (demo) setDemoUrl(demo);
        document.documentElement.setAttribute("data-density", nextState.density);
        window.setTimeout(() => setIsReady(true), 80);
      }
      if (message?.type === "scanResult") {
        const next = message.payload as RigScanResult;
        setScanResult(next);
        const nextValues: Record<string, string | number> = {};
        next.params.forEach((param) => {
          nextValues[param.id] = param.default;
        });
        setValues(nextValues);
        setHasApplied(false);
        setIsScanning(false);
        setScanError(null);
      }
      if (message?.type === "scanError") {
        setIsScanning(false);
        setScanError(String(message.payload || "Scan failed"));
      }
      if (message?.type === "applyStatus") {
        setHasApplied(Boolean(message.payload?.applied));
      }
    };

    window.addEventListener("message", handler);
    vscode?.postMessage({ type: "requestState" });
    vscode?.postMessage({ type: "ready" });
    return () => window.removeEventListener("message", handler);
  }, []);

  const persistState = (next: UiState) => {
    setUiState(next);
    vscode?.postMessage({ type: "persistState", payload: next });
  };

  const updateOverrides = useDebouncedCallback((nextValues: Record<string, string | number>) => {
    if (!hasApplied) {
      if (uiState.livePreview) {
        vscode?.postMessage({ type: "requestLivePreview" });
      }
      return;
    }
    vscode?.postMessage({ type: "updateVars", payload: { values: nextValues } });
  }, 250);

  const handleValueChange = (param: RigParam, value: string | number) => {
    const nextValues = { ...values, [param.id]: value };
    setValues(nextValues);
    updateOverrides(nextValues);
  };

  const resolveConfidence = (param: RigParam) => {
    if (typeof param.confidence === "number") return param.confidence;
    return param.origin === "tailwind" ? 0.35 : 0.55;
  };

  const passesConfidence = (param: RigParam) => {
    const confidence = resolveConfidence(param);
    if (confidenceFilter === "high") return confidence >= 0.75;
    if (confidenceFilter === "medium") return confidence >= 0.5;
    return true;
  };

  const allParams = scanResult?.params ?? [];
  const filteredParams = allParams.filter(passesConfidence);
  const groupedAll = groupParams(allParams);
  const grouped = groupParams(filteredParams);
  const groupCount = Array.from(grouped.values()).filter((items) => items.length > 0).length;
  const hasChanges = React.useMemo(() => {
    if (!scanResult) return false;
    return scanResult.params.some((param) => {
      const value = values[param.id];
      if (value === undefined) return false;
      return value !== param.default;
    });
  }, [scanResult, values]);

  const canApply = Boolean(scanResult) && !isScanning;
  const canRig = !isScanning;
  const statusLabel = scanResult
    ? `${hasApplied ? "Live updates on" : "Live updates off"} · ${
        hasChanges ? "Changes pending" : "No changes"
      }`
    : null;

  const handleDensityChange = (density: UiState["density"]) => {
    persistState({ ...uiState, density });
  };

  const handleLivePreviewToggle = () => {
    const next = !uiState.livePreview;
    persistState({ ...uiState, livePreview: next });
    if (next && !hasApplied) {
      vscode?.postMessage({ type: "requestLivePreview" });
    }
  };

  const handlePreviewUrlChange = (value: string) => {
    persistState({ ...uiState, previewUrl: value });
  };

  const handlePreviewTargetChange = (value: UiState["previewTarget"]) => {
    persistState({ ...uiState, previewTarget: value });
  };

  const handleLayoutChange = (layout: number[], direction: "horizontal" | "vertical") => {
    if (direction === "horizontal") {
      persistState({
        ...uiState,
        layout: { ...uiState.layout, left: layout[0], right: layout[1] }
      });
      return;
    }
    persistState({
      ...uiState,
      layout: { ...uiState.layout, rightTop: layout[0], rightBottom: layout[1] }
    });
  };

  const handleResetGroup = (group: RigGroup) => {
    if (!scanResult) return;
    const groupParams = groupedAll.get(group) ?? [];
    const nextValues = { ...values };
    groupParams.forEach((param) => {
      nextValues[param.id] = param.default;
    });
    setValues(nextValues);
    updateOverrides(nextValues);
  };

  const handleResetParam = (param: RigParam) => {
    handleValueChange(param, param.default);
  };

  const handleRigClick = () => {
    setIsScanning(true);
    setScanError(null);
    vscode?.postMessage({ type: "rigItUp" });
  };

  const handleSelectCss = (file: string) => {
    setIsScanning(true);
    vscode?.postMessage({ type: "selectCss", payload: { file } });
  };

  const handleExportSnapshot = () => {
    vscode?.postMessage({ type: "exportSnapshot", payload: { values } });
  };

  const handleOnboardingAccept = () => {
    setOnboardingComplete(true);
    setTelemetryOptIn(true);
    vscode?.postMessage({ type: "completeOnboarding", payload: { telemetryOptIn: true } });
  };

  const onboardingView = (
    <div className="flex flex-1 items-center justify-center">
      <div className="rigger-onboard w-full max-w-3xl rounded-2xl border border-[var(--rig-panel-border)] bg-[var(--rig-panel)] p-6 shadow-lg md:p-8">
        <div className="grid items-center gap-6 md:grid-cols-[220px_1fr]">
          <div className="relative mx-auto h-44 w-44">
            <div className="rigger-wire rigger-wire-left" />
            <div className="rigger-wire rigger-wire-right" />
            <div className="rigger-chip">
              <div className="rigger-core" />
              <div className="rigger-eye rigger-eye-left" />
              <div className="rigger-eye rigger-eye-right" />
              <div className="rigger-circuit rigger-circuit-1" />
              <div className="rigger-circuit rigger-circuit-2" />
            </div>
            <div className="rigger-pins rigger-pins-left">
              {[0, 1, 2, 3].map((i) => (
                <span key={`l-${i}`} />
              ))}
            </div>
            <div className="rigger-pins rigger-pins-right">
              {[0, 1, 2, 3].map((i) => (
                <span key={`r-${i}`} />
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--rig-muted)]">
              Alpha Wave
            </div>
            <div className="text-2xl font-semibold">Welcome to Rigger</div>
            <p className="text-sm text-[color:var(--rig-muted)]">
              A playful rig that wires into your interface, extracts tweakable tokens, and lets you
              tune visuals live without rewriting your code.
            </p>
            <div className="grid gap-2 text-xs text-[color:var(--rig-muted)] md:grid-cols-3">
              <div className="rounded-lg border border-[var(--rig-panel-border)] px-3 py-2">
                Scan → Group
              </div>
              <div className="rounded-lg border border-[var(--rig-panel-border)] px-3 py-2">
                Rig → Preview
              </div>
              <div className="rounded-lg border border-[var(--rig-panel-border)] px-3 py-2">
                Tune → Apply
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-[var(--rig-panel-border)] bg-[var(--rig-panel-muted)] p-3">
            <div className="text-[10px] uppercase tracking-wide text-[color:var(--rig-muted)]">
              Demo Preview
            </div>
            <div className="onboard-demo-frame mt-2">
              {demoUrl ? (
                <iframe title="Rigger demo page" src={demoUrl} sandbox="allow-same-origin" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-[color:var(--rig-muted)]">
                  Demo preview loading…
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-[var(--rig-panel-border)] bg-[var(--rig-panel-muted)] p-3">
              <div className="text-xs font-semibold">Gradient Lab</div>
              <div className="mt-2 text-xs text-[color:var(--rig-muted)]">
                A living gradient field built to show off Rigger’s CSS tuning. Perfect for a
                fast, satisfying first test.
              </div>
              <ol className="mt-3 space-y-2 text-xs text-[color:var(--rig-muted)]">
                <li>
                  1. Open the gradient demo workspace.
                </li>
                <li>
                  2. Run the dev server and hit “Rig it up.”
                </li>
                <li>
                  3. Adjust colors, sizes, and motion—watch it morph live.
                </li>
              </ol>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => vscode?.postMessage({ type: "openGradientsDemo" })}
                >
                  Open gradient demo
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    vscode?.postMessage({
                      type: "openExternal",
                      payload: { url: "https://github.com/baunov/gradients-bg" }
                    })
                  }
                >
                  View source
                </Button>
              </div>
              <div className="mt-3 text-[10px] text-[color:var(--rig-muted)]">
                Demo by baunov.
              </div>
            </div>
            <div className="text-xs text-[color:var(--rig-muted)]">
              Prefer a quick static sample? Open the built‑in demo page and scan its CSS right away.
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => vscode?.postMessage({ type: "openDemo" })}
            >
              Open demo page
            </Button>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <Button size="lg" onClick={handleOnboardingAccept}>
            Join the alpha and enable usage data
          </Button>
          <div className="text-xs text-[color:var(--rig-muted)]">
            By continuing, you agree to share minimal usage telemetry so we can improve Rigger.
          </div>
        </div>
      </div>
    </div>
  );

  const mainView = (
    <>
      <div className="flex flex-shrink-0 items-center justify-between gap-4 rounded-xl border border-[var(--rig-panel-border)] bg-[var(--rig-panel)] px-4 py-3">
        <div>
          <div className="text-sm font-semibold">Rigger</div>
          <div className="text-xs text-[color:var(--rig-muted)]">
            {scanResult?.projectType ?? "No project"} · {scanResult?.cssFile ?? "No CSS file"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isScanning && (
            <div className="rounded-full border border-[var(--rig-panel-border)] bg-[var(--rig-accent-soft)] px-3 py-1 text-xs text-[var(--rig-text)] animate-pulse">
              Scanning…
            </div>
          )}
          {scanError && !isScanning && (
            <div className="rounded-full border border-[var(--rig-danger)] bg-[var(--rig-danger-soft)] px-3 py-1 text-xs text-[color:var(--rig-text)]">
              {scanError}
            </div>
          )}
          {scanResult && !isScanning && !scanError && statusLabel && (
            <div className="rounded-full border border-[var(--rig-panel-border)] bg-[var(--rig-panel-muted)] px-3 py-1 text-xs text-[var(--rig-text)]">
              {statusLabel}
            </div>
          )}
          <div className="flex items-center gap-1 rounded-full border border-[var(--rig-panel-border)] bg-[var(--rig-panel)] p-1 text-xs">
            {(["compact", "comfortable", "large"] as const).map((density) => (
              <button
                key={density}
                className={`rounded-full px-2 py-1 ${
                  uiState.density === density
                    ? "bg-[var(--rig-accent)] text-[var(--rig-accent-contrast)]"
                    : "text-[var(--rig-text)]"
                }`}
                onClick={() => handleDensityChange(density)}
              >
                {density.slice(0, 1).toUpperCase() + density.slice(1)}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => setFineMode(!fineMode)}>
            {fineMode ? "Fine" : "Normal"}
          </Button>
          <Button size="sm" onClick={handleRigClick} disabled={!canRig}>
            Rig it up
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => vscode?.postMessage({ type: "applyEdits" })}
            disabled={!canApply}
          >
            Apply
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportSnapshot}>
            Export
          </Button>
        </div>
      </div>

      <ResizablePanelGroup
        direction="horizontal"
        className="mt-4 flex-1 min-h-0 rounded-xl border border-[var(--rig-panel-border)] bg-[var(--rig-panel)]"
        onLayout={(layout) => handleLayoutChange(layout, "horizontal")}
      >
        <ResizablePanel defaultSize={uiState.layout.left} minSize={20} className="p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Parameters</div>
            <div className="text-xs text-[color:var(--rig-muted)]">
              {filteredParams.length}/{scanResult?.params.length ?? 0} items
            </div>
          </div>
          <div className="mt-3 rounded-md border border-[var(--rig-panel-border)] bg-[var(--rig-panel-muted)] px-3 py-2 text-xs text-[color:var(--rig-muted)]">
            <div className="flex items-center justify-between">
              <span>Summary</span>
              <span className="text-[var(--rig-text)]">
                {scanResult ? groupCount : 0} groups
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span>{filteredParams.length} tokens</span>
              <span>·</span>
              <span>Filter: {confidenceFilter}</span>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-[color:var(--rig-muted)]">
            <span>Confidence</span>
            {([
              { key: "all", label: "All" },
              { key: "medium", label: "Medium+" },
              { key: "high", label: "High" }
            ] as const).map((option) => (
              <button
                key={option.key}
                className={`rounded-full border px-2 py-1 ${
                  confidenceFilter === option.key
                    ? "border-[var(--rig-accent)] bg-[var(--rig-accent-soft)] text-[var(--rig-text)]"
                    : "border-[var(--rig-panel-border)]"
                }`}
                onClick={() => setConfidenceFilter(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-3 overflow-auto pr-2">
            {!scanResult && !isScanning && (
              <div className="rounded-lg border border-[var(--rig-panel-border)] bg-[var(--rig-panel-muted)] p-3 text-xs text-[color:var(--rig-muted)]">
                No scan yet. Run “Rig it up” to extract tweakable parameters from your CSS.
              </div>
            )}
            {!scanResult && isScanning && (
              <div className="space-y-2 animate-pulse">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 rounded-lg bg-[var(--rig-skeleton)]" />
                ))}
              </div>
            )}
            {scanResult && filteredParams.length === 0 && (
              <div className="rounded-lg border border-[var(--rig-panel-border)] bg-[var(--rig-panel-muted)] p-3 text-xs text-[color:var(--rig-muted)]">
                No parameters match this confidence filter. Try “All” to see everything.
              </div>
            )}
            {groupOrder.map((group) => {
              const items = grouped.get(group) ?? [];
              if (items.length === 0) return null;
              return (
                <Collapsible key={group} defaultOpen={group === uiState.lastGroup}>
                  <div className="flex items-center justify-between">
                    <CollapsibleTrigger
                      className="text-sm font-semibold"
                      onClick={() => persistState({ ...uiState, lastGroup: group })}
                    >
                      {group}
                    </CollapsibleTrigger>
                    <Button variant="ghost" size="sm" onClick={() => handleResetGroup(group)}>
                      Reset
                    </Button>
                  </div>
                  <CollapsibleContent className="mt-2 space-y-2">
                    {items.map((param) => {
                      const value = values[param.id] ?? param.default;
                      const numericValue = typeof value === "number" ? value : Number(value);
                      const step = param.step ? (fineMode ? param.step / 10 : param.step) : fineMode ? 0.1 : 1;
                      const confidenceLabel =
                        resolveConfidence(param) >= 0.75
                          ? "High"
                          : resolveConfidence(param) >= 0.5
                          ? "Med"
                          : "Low";
                      return (
                        <div
                          key={param.id}
                          className={`group rounded-md px-2 py-2 transition-colors ${
                            selectedParam?.id === param.id
                              ? "bg-[var(--rig-selection)]"
                              : "hover:bg-[var(--rig-hover)]"
                          }`}
                          onClick={() => setSelectedParam(param)}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="font-medium capitalize">{param.label}</div>
                            <div className="flex items-center gap-2 text-[10px] text-[color:var(--rig-muted)]">
                              <span>{(param.origin ?? "css").toUpperCase()}</span>
                              <span>·</span>
                              <span>{confidenceLabel}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                                onClick={() => handleResetParam(param)}
                              >
                                Reset
                              </Button>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            {param.type === "number" ? (
                              <>
                                <Slider
                                  min={param.min ?? 0}
                                  max={param.max ?? 200}
                                  step={step}
                                  value={[numericValue]}
                                  onValueChange={(vals) => handleValueChange(param, vals[0])}
                                />
                                <Input
                                  className="w-20"
                                  value={`${value}`}
                                  onChange={(event) =>
                                    handleValueChange(param, Number(event.target.value || 0))
                                  }
                                />
                                <span className="text-xs text-[color:var(--rig-muted)]">{param.unit ?? ""}</span>
                              </>
                            ) : param.type === "color" ? (
                              <>
                                <input
                                  type="color"
                                  className="h-8 w-8 rounded border border-[var(--rig-panel-border)] bg-transparent"
                                  value={typeof value === "string" ? value : String(value)}
                                  onChange={(event) => handleValueChange(param, event.target.value)}
                                />
                                <Input
                                  className="w-32"
                                  value={`${value}`}
                                  onChange={(event) => handleValueChange(param, event.target.value)}
                                />
                              </>
                            ) : (
                              <Input
                                value={`${value}`}
                                onChange={(event) => handleValueChange(param, event.target.value)}
                              />
                            )}
                          </div>
                          <div className="mt-1 text-[10px] text-[color:var(--rig-muted)]">
                            {param.min ?? "–"} · {param.max ?? "–"}
                          </div>
                        </div>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={uiState.layout.right} minSize={35} className="p-3">
          <ResizablePanelGroup
            direction="vertical"
            onLayout={(layout) => handleLayoutChange(layout, "vertical")}
            className="h-full"
          >
            <ResizablePanel defaultSize={uiState.layout.rightTop} minSize={35} className="pr-2">
              <div className="flex h-full flex-col gap-3">
                <div className="rounded-xl border border-[var(--rig-panel-border)] p-4">
                  <div className="text-sm font-semibold">Project</div>
                  {isScanning && !scanResult ? (
                    <div className="mt-3 space-y-2 animate-pulse">
                      <div className="h-4 w-2/3 rounded bg-[var(--rig-skeleton)]" />
                      <div className="h-4 w-4/5 rounded bg-[var(--rig-skeleton)]" />
                      <div className="h-4 w-3/5 rounded bg-[var(--rig-skeleton)]" />
                    </div>
                  ) : (
                    <>
                      <div className="mt-2 text-xs text-[color:var(--rig-muted)]">
                        Type: {scanResult?.projectType ?? "Unknown"}
                      </div>
                      <div className="mt-1 text-xs text-[color:var(--rig-muted)]">
                        Root: {scanResult?.root ?? "—"}
                      </div>
                      <div className="mt-1 text-xs text-[color:var(--rig-muted)]">
                        CSS: {scanResult?.cssFile ?? "—"}
                      </div>
                    </>
                  )}
                  {scanResult?.cssCandidates && scanResult.cssCandidates.length > 0 && (
                    <div className="mt-3">
                      <div className="text-[10px] uppercase tracking-wide text-[color:var(--rig-muted)]">
                        CSS Candidates
                      </div>
                      <div className="mt-2 space-y-2">
                        {scanResult.cssCandidates.slice(0, 5).map((candidate) => {
                          const isActive = candidate.file === scanResult.cssFile;
                          return (
                            <button
                              key={candidate.file}
                              className={`w-full rounded-md border px-2 py-1 text-left text-xs ${
                                isActive
                                  ? "border-[var(--rig-accent)] bg-[var(--rig-selection)]"
                                  : "border-[var(--rig-panel-border)]"
                              }`}
                              onClick={() => handleSelectCss(candidate.file)}
                            >
                              <div className="font-medium">{candidate.file}</div>
                              <div className="text-[10px] text-[color:var(--rig-muted)]">
                                {candidate.reason}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {scanResult?.cssFile && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() =>
                        vscode?.postMessage({
                          type: "openSource",
                          payload: { file: scanResult.cssFile, line: 1, column: 1 }
                        })
                      }
                    >
                      Open CSS
                    </Button>
                  )}
                </div>

                <div className="rounded-xl border border-[var(--rig-panel-border)] p-4">
                  <div className="text-sm font-semibold">Preview</div>
                  <div className="mt-2 text-xs text-[color:var(--rig-muted)]">
                    Live preview updates CSS variables in your workspace. Open your app alongside for true rendering.
                  </div>
                  <div className="mt-2 text-xs text-[color:var(--rig-muted)]">
                    Status:{" "}
                    <span className="text-[var(--rig-text)]">
                      {uiState.livePreview ? "Auto-apply on" : "Paused"} ·{" "}
                      {hasApplied ? "Applied" : "Not applied"}
                    </span>
                  </div>
                  <div className="mt-3 space-y-2 text-xs text-[color:var(--rig-muted)]">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={uiState.livePreview}
                        onChange={handleLivePreviewToggle}
                      />
                      <span>Live preview (auto‑apply)</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase tracking-wide text-[color:var(--rig-muted)]">
                        Preview target
                      </span>
                      <select
                        className="rig-select"
                        value={uiState.previewTarget}
                        onChange={(event) =>
                          handlePreviewTargetChange(event.target.value as UiState["previewTarget"])
                        }
                      >
                        <option value="simpleBrowser">Cursor / VS Code preview</option>
                        <option value="embedded">Embedded panel</option>
                        <option value="external">External browser</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    <Input
                      value={uiState.previewUrl}
                      onChange={(event) => handlePreviewUrlChange(event.target.value)}
                      placeholder="http://localhost:5173"
                    />
                    <div className="flex flex-wrap gap-2">
                      {uiState.previewTarget !== "embedded" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            vscode?.postMessage({
                              type: "openPreview",
                              payload: { url: uiState.previewUrl, target: uiState.previewTarget }
                            })
                          }
                        >
                          {uiState.previewTarget === "external"
                            ? "Open external browser"
                            : "Open in Preview"}
                        </Button>
                      )}
                    </div>
                  </div>
                  {uiState.previewTarget === "embedded" && uiState.previewUrl && (
                    <div className="mt-3 preview-embed">
                      <iframe
                        title="Rigger preview"
                        src={uiState.previewUrl}
                        sandbox="allow-scripts allow-same-origin"
                      />
                    </div>
                  )}
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-[var(--rig-panel-border)] bg-[var(--rig-accent-softer)] p-3">
                      <div className="text-xs uppercase tracking-wide text-[color:var(--rig-muted)]">Tokens</div>
                      <div className="mt-1 text-lg font-semibold">{scanResult?.params.length ?? 0}</div>
                    </div>
                    <div className="rounded-lg border border-[var(--rig-panel-border)] bg-[var(--rig-accent-soft)] p-3">
                      <div className="text-xs uppercase tracking-wide text-[color:var(--rig-muted)]">Groups</div>
                      <div className="mt-1 text-lg font-semibold">
                        {scanResult ? groupCount : 0}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 rounded-lg border border-[var(--rig-panel-border)] bg-[var(--rig-panel-muted)] p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--rig-muted)]">
                      Diagnostics
                    </div>
                    <ul className="mt-2 space-y-1 text-xs text-[color:var(--rig-muted)]">
                      {(scanResult?.diagnostics ?? ["Waiting for scan..."]).map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle />

            <ResizablePanel defaultSize={uiState.layout.rightBottom} minSize={25} className="pr-2">
              <div className="h-full rounded-xl border border-[var(--rig-panel-border)] p-4">
                <div className="text-sm font-semibold">Selected Element</div>
                {selectedParam ? (
                  <div className="mt-3 space-y-2 text-xs text-[color:var(--rig-muted)]">
                    <div className="text-sm font-medium text-[var(--rig-text)]">{selectedParam.label}</div>
                    <div>Origin: {selectedParam.origin ?? "css"}</div>
                    <div>Confidence: {Math.round(resolveConfidence(selectedParam) * 100)}%</div>
                    {selectedParam.source.selector && (
                      <div>Selector: {selectedParam.source.selector}</div>
                    )}
                    <div>Property: {selectedParam.source.property}</div>
                    <button
                      className="text-left text-[var(--rig-link)] underline hover:text-[var(--rig-link-hover)]"
                      onClick={() =>
                        vscode?.postMessage({
                          type: "openSource",
                          payload: {
                            file: selectedParam.source.file,
                            line: selectedParam.source.line,
                            column: selectedParam.source.column
                          }
                        })
                      }
                    >
                      Open: {selectedParam.source.file}
                    </button>
                    <div>Var: {selectedParam.cssVar}</div>
                  </div>
                ) : (
                  <div className="mt-3 text-xs text-[color:var(--rig-muted)]">
                    Select a parameter to see source details.
                  </div>
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </>
  );

  return (
    <div className="rigger-fade flex h-full w-full flex-col p-4" data-ready={isReady}>
      {onboardingComplete ? mainView : onboardingView}
    </div>
  );
}
