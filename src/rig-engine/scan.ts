import { RigGroup, RigParam, RigParamType, RigScanResult } from "./types";
import * as csstree from "css-tree";

const ALLOWED_PROPERTIES = new Set([
  "color",
  "background-color",
  "border-color",
  "font-size",
  "line-height",
  "letter-spacing",
  "margin",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "border-radius",
  "box-shadow",
  "transition",
  "animation",
  "animation-duration"
]);
const SKIP_ATRULES = new Set(["keyframes", "-webkit-keyframes", "font-face", "page"]);

const COLOR_REGEX = /^(#([0-9a-fA-F]{3,8})|rgb\(|rgba\(|hsl\(|hsla\()/;
const INTERACTION_SELECTOR_REGEX = /:(hover|active|focus|focus-visible|focus-within)/i;
const ROOT_SELECTOR_REGEX = /(^|[\s>])(:root|html|body)([\s>]|$)/i;
const COMPLEX_VALUE_REGEX = /(calc\(|var\(|clamp\(|min\(|max\()/i;
const GROUP_ORDER: RigGroup[] = [
  "Colour",
  "Typography",
  "Spacing",
  "Radius",
  "Shadow",
  "Motion",
  "Other"
];
const GROUP_RANK = new Map(GROUP_ORDER.map((group, index) => [group, index]));

function detectGroup(property: string): RigGroup {
  if (property.includes("color")) return "Colour";
  if (["font-size", "line-height", "letter-spacing", "font-weight"].includes(property)) {
    return "Typography";
  }
  if (property.startsWith("margin") || property.startsWith("padding")) return "Spacing";
  if (property.includes("radius")) return "Radius";
  if (property.includes("shadow")) return "Shadow";
  if (property.includes("transition") || property.includes("animation")) return "Motion";
  return "Other";
}

function parseNumeric(value: string): { num: number; unit: string } | null {
  const match = value.trim().match(/^(-?\d*\.?\d+)([a-zA-Z%]*)$/);
  if (!match) return null;
  return { num: Number(match[1]), unit: match[2] || "" };
}

function buildLineIndex(content: string): number[] {
  const starts = [0];
  for (let i = 0; i < content.length; i++) {
    if (content[i] === "\n") {
      starts.push(i + 1);
    }
  }
  return starts;
}

function indexToLineColumn(lineStarts: number[], index: number): { line: number; column: number } {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const start = lineStarts[mid];
    const next = mid + 1 < lineStarts.length ? lineStarts[mid + 1] : Infinity;
    if (index >= start && index < next) {
      return { line: mid + 1, column: index - start + 1 };
    }
    if (index < start) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return { line: 1, column: index + 1 };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function defaultRangeFor(property: string): { min: number; max: number; step: number } {
  if (property.includes("line-height")) return { min: 0.8, max: 3, step: 0.05 };
  if (property.includes("letter-spacing")) return { min: -2, max: 10, step: 0.1 };
  if (property.includes("radius")) return { min: 0, max: 64, step: 1 };
  if (property.includes("shadow")) return { min: 0, max: 32, step: 1 };
  if (property.includes("font-size")) return { min: 8, max: 96, step: 1 };
  return { min: 0, max: 200, step: 1 };
}

function stableHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(36);
}

function clampConfidence(value: number): number {
  const clamped = Math.max(0.2, Math.min(0.95, value));
  return Math.round(clamped * 100) / 100;
}

function estimateConfidence(input: {
  property: string;
  rawValue: string;
  selector?: string;
  type: RigParamType;
}): number {
  let score = 0.55;
  if (input.type === "color") score += 0.2;
  if (input.type === "number") score += 0.15;
  if (input.selector && ROOT_SELECTOR_REGEX.test(input.selector)) score += 0.1;
  if (input.selector && INTERACTION_SELECTOR_REGEX.test(input.selector)) score -= 0.05;
  if (COMPLEX_VALUE_REGEX.test(input.rawValue)) score -= 0.1;
  if (["box-shadow", "transition", "animation", "animation-duration"].includes(input.property)) {
    score -= 0.05;
  }
  return clampConfidence(score);
}

export function extractParamsFromCss(content: string, filePath: string): RigParam[] {
  const params: RigParam[] = [];
  const seen = new Set<string>();
  const lineStarts = buildLineIndex(content);

  const addParam = (input: {
    property: string;
    rawValue: string;
    start: number;
    end: number;
    selector?: string;
    line?: number;
    column?: number;
  }) => {
    const { property, rawValue, start, end, selector } = input;
    if (!ALLOWED_PROPERTIES.has(property)) return;
    if (rawValue.startsWith("var(")) return;

    const dedupeKey = `${filePath}|${selector ?? ""}|${property}|${rawValue}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);

    const group = detectGroup(property);
    const numeric = parseNumeric(rawValue);
    let type: RigParamType = "string";
    let defaultValue: string | number = rawValue;
    let unit: string | undefined;
    let min: number | undefined;
    let max: number | undefined;
    let step: number | undefined;

    if (numeric) {
      type = "number";
      defaultValue = numeric.num;
      unit = numeric.unit || undefined;
      const range = defaultRangeFor(property);
      min = range.min;
      max = range.max;
      step = range.step;
    } else if (COLOR_REGEX.test(rawValue)) {
      type = "color";
    }

    const base = slugify(`${group}-${property}`);
    const identity = `${filePath}|${selector ?? ""}|${property}|${rawValue}`;
    const hash = stableHash(identity).slice(0, 6);
    const cssVar = `--rig-${base}-${hash}`;
    const id = `rig.${base}-${hash}`;

    const line = input.line ?? indexToLineColumn(lineStarts, start).line;
    const column = input.column ?? indexToLineColumn(lineStarts, start).column;

    const confidence = estimateConfidence({ property, rawValue, selector, type });

    params.push({
      id,
      label: property.replace(/-/g, " "),
      group,
      type,
      min,
      max,
      step,
      default: defaultValue,
      unit,
      cssVar,
      confidence,
      origin: "css",
      source: {
        file: filePath,
        property,
        value: rawValue,
        start,
        end,
        selector,
        line,
        column
      }
    });
  };

  let parsed = false;
  try {
    const ast = csstree.parse(content, {
      positions: true,
      parseValue: true,
      parseCustomProperty: true
    });
    parsed = true;

    const walkBlock = (block: csstree.Block, atContext?: string) => {
      block.children.forEach((node) => {
        if (params.length >= 120) return;
        if (node.type === "Rule") {
          const selector = csstree.generate(node.prelude).trim();
          const fullSelector = atContext ? `${atContext} ${selector}` : selector;
          node.block.children.forEach((child) => {
            if (child.type !== "Declaration") return;
            const property = child.property.toLowerCase();
            const rawValue = csstree.generate(child.value).trim();
            const loc = child.value.loc;
            if (!loc) return;
            addParam({
              property,
              rawValue,
              start: loc.start.offset,
              end: loc.end.offset,
              selector: fullSelector,
              line: loc.start.line,
              column: loc.start.column
            });
          });
        } else if (node.type === "Atrule" && node.block) {
          if (SKIP_ATRULES.has(node.name)) return;
          const prelude = node.prelude ? csstree.generate(node.prelude).trim() : "";
          const current = `@${node.name}${prelude ? ` ${prelude}` : ""}`.trim();
          const nextContext = atContext ? `${atContext} ${current}` : current;
          if (node.block.type === "Block") {
            walkBlock(node.block, nextContext);
          }
        }
      });
    };

    if (ast.type === "StyleSheet") {
      ast.children.forEach((node) => {
        if (params.length >= 120) return;
        if (node.type === "Rule") {
          const selector = csstree.generate(node.prelude).trim();
          node.block.children.forEach((child) => {
            if (child.type !== "Declaration") return;
            const property = child.property.toLowerCase();
            const rawValue = csstree.generate(child.value).trim();
            const loc = child.value.loc;
            if (!loc) return;
            addParam({
              property,
              rawValue,
              start: loc.start.offset,
              end: loc.end.offset,
              selector,
              line: loc.start.line,
              column: loc.start.column
            });
          });
        } else if (node.type === "Atrule" && node.block && node.block.type === "Block") {
          if (SKIP_ATRULES.has(node.name)) return;
          const prelude = node.prelude ? csstree.generate(node.prelude).trim() : "";
          const context = `@${node.name}${prelude ? ` ${prelude}` : ""}`.trim();
          walkBlock(node.block, context);
        }
      });
    }
  } catch {
    parsed = false;
  }

  if (!parsed) {
    const fallbackRegex = /([a-zA-Z-]+)\s*:\s*([^;{}]+);/g;
    let match: RegExpExecArray | null;
    while ((match = fallbackRegex.exec(content))) {
      const property = match[1].toLowerCase();
      const rawValue = match[2].trim();
      const fullMatch = match[0];
      const valueIndex = fullMatch.indexOf(rawValue);
      const start = match.index + (valueIndex >= 0 ? valueIndex : fullMatch.length - rawValue.length);
      const end = start + rawValue.length;
      addParam({ property, rawValue, start, end });
      if (params.length >= 120) break;
    }
  }

  return params;
}

export function buildScanResult(
  content: string,
  filePath: string,
  root: string,
  projectType: "react" | "vanilla" | "unknown",
  diagnostics: string[],
  cssCandidates?: { file: string; score: number; reason: string }[],
  paramsOverride?: RigParam[]
): RigScanResult {
  const unsorted = paramsOverride ?? extractParamsFromCss(content, filePath);
  const params = unsorted
    .slice()
    .sort((a, b) => {
      const groupDiff =
        (GROUP_RANK.get(a.group) ?? 99) - (GROUP_RANK.get(b.group) ?? 99);
      if (groupDiff !== 0) return groupDiff;
      const labelDiff = a.label.localeCompare(b.label);
      if (labelDiff !== 0) return labelDiff;
      const selectorDiff = (a.source.selector ?? "").localeCompare(b.source.selector ?? "");
      if (selectorDiff !== 0) return selectorDiff;
      return a.id.localeCompare(b.id);
    });
  return {
    projectType,
    root,
    cssFile: filePath,
    cssCandidates,
    params,
    diagnostics
  };
}

export const allowedProperties = Array.from(ALLOWED_PROPERTIES);
