#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

const specPath = path.join(root, "architecture", "rigger.machine.json");
const tsOutPath = path.join(root, "src", "machine", "machine.generated.ts");
const mmdOutPath = path.join(root, "docs", "architecture", "rigger-system.mmd");
const glossaryOutPath = path.join(root, "docs", "architecture", "glossary.md");

function readSpec() {
  const raw = fs.readFileSync(specPath, "utf-8");
  const spec = JSON.parse(raw);

  if (!spec.sections || !spec.nodes || !spec.edges) {
    throw new Error("Invalid machine spec: sections/nodes/edges are required");
  }

  const sectionIds = new Set(spec.sections.map((s) => s.id));
  const nodeIds = new Set();
  for (const node of spec.nodes) {
    if (nodeIds.has(node.id)) {
      throw new Error(`Duplicate node id: ${node.id}`);
    }
    nodeIds.add(node.id);
    if (!sectionIds.has(node.section)) {
      throw new Error(`Node ${node.id} references unknown section ${node.section}`);
    }
  }

  for (const edge of spec.edges) {
    if (!nodeIds.has(edge.from)) {
      throw new Error(`Edge from unknown node: ${edge.from}`);
    }
    if (!nodeIds.has(edge.to)) {
      throw new Error(`Edge to unknown node: ${edge.to}`);
    }
  }

  return spec;
}

function escMermaidText(input) {
  return String(input).replace(/"/g, "\\\"");
}

function sectionClass(sectionId) {
  switch (sectionId) {
    case "INPUT":
      return "nodeInput";
    case "PLAN":
      return "nodePlan";
    case "HANDS":
      return "nodeHands";
    case "VERIFY":
      return "nodeVerify";
    case "TEST":
      return "nodeTest";
    case "APPLY":
      return "nodeApply";
    case "MEMORY":
      return "nodeMemory";
    case "RECOVERY":
      return "nodeRecovery";
    case "META":
      return "nodeMeta";
    default:
      return "nodeBase";
  }
}

function generateMermaid(spec) {
  const lines = [];
  lines.push("%%{init: {");
  lines.push("  \"theme\": \"base\",");
  lines.push("  \"themeVariables\": {");
  lines.push("    \"fontFamily\": \"Helvetica Neue, Arial, sans-serif\",");
  lines.push("    \"fontSize\": \"13px\",");
  lines.push("    \"lineColor\": \"#858b96\"");
  lines.push("  },");
  lines.push("  \"flowchart\": {");
  lines.push("    \"curve\": \"cardinal\",");
  lines.push("    \"nodeSpacing\": 34,");
  lines.push("    \"rankSpacing\": 54,");
  lines.push("    \"htmlLabels\": true");
  lines.push("  }");
  lines.push("}}%%");
  lines.push("flowchart LR");
  lines.push("  %% AUTO-GENERATED FROM architecture/rigger.machine.json");
  lines.push("");

  for (const section of spec.sections) {
    lines.push(`  subgraph ${section.id}[\"${escMermaidText(section.label)}\"]`);
    lines.push("    direction TB");
    for (const node of spec.nodes.filter((n) => n.section === section.id)) {
      lines.push(`    ${node.id}[\"${escMermaidText(node.label)}\"]`);
    }
    lines.push("  end");
    lines.push("");
  }

  const edgeStyles = [];
  spec.edges.forEach((edge, index) => {
    if (edge.label) {
      lines.push(`  ${edge.from} -->|${escMermaidText(edge.label)}| ${edge.to}`);
    } else {
      lines.push(`  ${edge.from} --> ${edge.to}`);
    }
    const label = (edge.label ?? "").toLowerCase();
    if (label === "pass") {
      edgeStyles.push({ index, style: "stroke:#7ea86f,stroke-width:2px,color:#cfe7c8" });
    } else if (label === "fail") {
      edgeStyles.push({ index, style: "stroke:#cf6e79,stroke-width:2px,color:#ffd8dd" });
    } else if (label === "rollback" || label === "restore" || label === "if stuck") {
      edgeStyles.push({ index, style: "stroke:#d5b665,stroke-width:1.6px,stroke-dasharray:6 4,color:#f7efcf" });
    }
  });

  lines.push("");
  lines.push("  %% Braun-inspired dark styling");
  lines.push("  classDef nodeBase fill:#23252a,stroke:#686d76,color:#f2f2f2,stroke-width:1px;");
  lines.push("  classDef nodeInput fill:#1f262a,stroke:#64737e,color:#eaf1f5,stroke-width:1px;");
  lines.push("  classDef nodePlan fill:#25232d,stroke:#746b89,color:#efeafd,stroke-width:1px;");
  lines.push("  classDef nodeHands fill:#222a24,stroke:#6b7f6f,color:#edf6ef,stroke-width:1px;");
  lines.push("  classDef nodeVerify fill:#2a2d33,stroke:#b7bcc6,color:#f7f7f7,stroke-width:1.2px;");
  lines.push("  classDef nodeTest fill:#2a2822,stroke:#8f8668,color:#f5f1e4,stroke-width:1px;");
  lines.push("  classDef nodeApply fill:#2a2421,stroke:#8e7267,color:#f8ece7,stroke-width:1px;");
  lines.push("  classDef nodeMemory fill:#212329,stroke:#697287,color:#eaf0ff,stroke-width:1px;");
  lines.push("  classDef nodeRecovery fill:#342426,stroke:#e07b86,color:#ffe9ec,stroke-width:1.4px;");
  lines.push("  classDef nodeMeta fill:#272327,stroke:#827082,color:#f1e9f1,stroke-width:1px;");
  lines.push("  classDef keyMoment fill:#3a3422,stroke:#d6b95b,color:#f7f1d8,stroke-width:2px;");
  lines.push("  classDef gate fill:#2f3239,stroke:#d4d8df,color:#f7f7f7,stroke-width:1.6px;");
  lines.push("  classDef risk fill:#3a2426,stroke:#e07b86,color:#ffe9ec,stroke-width:1.7px;");

  const classMap = new Map();
  for (const node of spec.nodes) {
    let cls = "nodeBase";
    if (node.type === "key") cls = "keyMoment";
    else if (node.type === "gate") cls = "gate";
    else if (node.type === "risk") cls = "risk";
    else cls = sectionClass(node.section);

    if (!classMap.has(cls)) classMap.set(cls, []);
    classMap.get(cls).push(node.id);
  }

  for (const [cls, ids] of classMap) {
    lines.push(`  class ${ids.join(",")} ${cls};`);
  }

  if (edgeStyles.length > 0) {
    lines.push("");
    for (const edgeStyle of edgeStyles) {
      lines.push(`  linkStyle ${edgeStyle.index} ${edgeStyle.style};`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function generateTypescript(spec) {
  const sections = JSON.stringify(spec.sections, null, 2);
  const nodes = JSON.stringify(spec.nodes, null, 2);
  const edges = JSON.stringify(spec.edges, null, 2);

  return `/* AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.\n * Source: architecture/rigger.machine.json\n */\n\nexport const machineSpecVersion = ${JSON.stringify(spec.version)} as const;\nexport const machineTitle = ${JSON.stringify(spec.title)} as const;\n\nexport const machineSections = ${sections} as const;\nexport const machineNodes = ${nodes} as const;\nexport const machineEdges = ${edges} as const;\n\nexport type MachineSectionId = typeof machineSections[number]["id"];\nexport type MachineNodeId = typeof machineNodes[number]["id"];\nexport type MachineNodeType = typeof machineNodes[number]["type"];\n\nexport type MachineSection = typeof machineSections[number];\nexport type MachineNode = typeof machineNodes[number];\nexport type MachineEdge = typeof machineEdges[number];\n\nexport const machineNodeById: Record<MachineNodeId, MachineNode> = Object.fromEntries(\n  machineNodes.map((node) => [node.id, node])\n) as Record<MachineNodeId, MachineNode>;\n\nexport const machineOutgoingEdgesByNode: Record<MachineNodeId, MachineEdge[]> = Object.fromEntries(\n  machineNodes.map((node) => [\n    node.id,\n    machineEdges.filter((edge) => edge.from === node.id)\n  ])\n) as Record<MachineNodeId, MachineEdge[]>;\n\nexport const machineIncomingEdgesByNode: Record<MachineNodeId, MachineEdge[]> = Object.fromEntries(\n  machineNodes.map((node) => [\n    node.id,\n    machineEdges.filter((edge) => edge.to === node.id)\n  ])\n) as Record<MachineNodeId, MachineEdge[]>;\n`;
}

function generateGlossary(spec) {
  const lines = [];
  lines.push("# Rigger Machine Glossary");
  lines.push("");
  lines.push("Source of truth: `architecture/rigger.machine.json`");
  lines.push("");
  lines.push("This index is beginner-friendly by design. Keep IDs stable so diagram and runtime stay aligned.");
  lines.push("");

  const keyNodes = spec.nodes.filter((n) => n.type === "key");
  lines.push("## Key Moments");
  lines.push("");
  for (const node of keyNodes) {
    lines.push(`- **${node.id}**: ${node.label} — ${node.description}`);
  }
  lines.push("");

  for (const section of spec.sections) {
    lines.push(`## ${section.label}`);
    lines.push("");
    lines.push("| ID | Node | What It Means |");
    lines.push("| --- | --- | --- |");
    const nodes = spec.nodes.filter((n) => n.section === section.id);
    for (const node of nodes) {
      lines.push(`| ${node.id} | ${node.label} | ${node.description} |`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeOrCheck(filePath, content, checkMode) {
  const exists = fs.existsSync(filePath);
  const current = exists ? fs.readFileSync(filePath, "utf-8") : null;

  if (checkMode) {
    if (!exists || current !== content) {
      throw new Error(`Out of date: ${path.relative(root, filePath)} (run npm run machine:generate)`);
    }
    return;
  }

  ensureDir(filePath);
  fs.writeFileSync(filePath, content, "utf-8");
}

function main() {
  const checkMode = process.argv.includes("--check");
  const spec = readSpec();

  const outputs = [
    [tsOutPath, generateTypescript(spec)],
    [mmdOutPath, generateMermaid(spec)],
    [glossaryOutPath, generateGlossary(spec)]
  ];

  for (const [filePath, content] of outputs) {
    writeOrCheck(filePath, content, checkMode);
  }

  if (checkMode) {
    console.log("Machine artifacts are up to date.");
  } else {
    console.log("Generated machine artifacts:");
    for (const [filePath] of outputs) {
      console.log(`- ${path.relative(root, filePath)}`);
    }
  }
}

main();
