import { RigGroup, RigParam, RigParamType } from "./types";

const SECTION_ORDER = [
  "colors",
  "spacing",
  "fontSize",
  "lineHeight",
  "letterSpacing",
  "borderRadius",
  "boxShadow"
] as const;

const SECTION_GROUP: Record<(typeof SECTION_ORDER)[number], RigGroup> = {
  colors: "Colour",
  spacing: "Spacing",
  fontSize: "Typography",
  lineHeight: "Typography",
  letterSpacing: "Typography",
  borderRadius: "Radius",
  boxShadow: "Shadow"
};

const COLOR_REGEX = /^(#([0-9a-fA-F]{3,8})|rgb\(|rgba\(|hsl\(|hsla\()/;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("`") && trimmed.endsWith("`"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseNumeric(value: string): { num: number; unit: string } | null {
  const match = value.trim().match(/^(-?\d*\.?\d+)([a-zA-Z%]*)$/);
  if (!match) return null;
  return { num: Number(match[1]), unit: match[2] || "" };
}

function clampConfidence(value: number): number {
  const clamped = Math.max(0.2, Math.min(0.6, value));
  return Math.round(clamped * 100) / 100;
}

function rangeForSection(section: (typeof SECTION_ORDER)[number]) {
  switch (section) {
    case "fontSize":
      return { min: 8, max: 96, step: 1 };
    case "lineHeight":
      return { min: 0.8, max: 3, step: 0.05 };
    case "letterSpacing":
      return { min: -2, max: 10, step: 0.1 };
    case "borderRadius":
      return { min: 0, max: 64, step: 1 };
    case "spacing":
      return { min: 0, max: 256, step: 1 };
    default:
      return { min: 0, max: 200, step: 1 };
  }
}

function extractBracedBlock(source: string, startIndex: number) {
  let depth = 0;
  let inString: string | null = null;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = startIndex; i < source.length; i++) {
    const char = source[i];
    const next = source[i + 1];

    if (inLineComment) {
      if (char === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
      }
      continue;
    }

    if (!inString && char === "/" && next === "/") {
      inLineComment = true;
      continue;
    }
    if (!inString && char === "/" && next === "*") {
      inBlockComment = true;
      continue;
    }

    if (inString) {
      if (!escaped && char === inString) {
        inString = null;
      }
      escaped = !escaped && char === "\\";
      continue;
    }

    if (char === "'" || char === "\"" || char === "`") {
      inString = char;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return {
          block: source.slice(startIndex + 1, i),
          end: i
        };
      }
    }
  }

  return null;
}

function findObjectBlocks(source: string, key: string): string[] {
  const blocks: string[] = [];
  const regex = new RegExp(`\\b${key}\\b\\s*:\\s*\\{`, "g");
  let match: RegExpExecArray | null;
  while ((match = regex.exec(source))) {
    const braceIndex = source.indexOf("{", match.index);
    if (braceIndex < 0) continue;
    const extracted = extractBracedBlock(source, braceIndex);
    if (extracted?.block) {
      blocks.push(extracted.block);
      regex.lastIndex = extracted.end + 1;
    }
  }
  return blocks;
}

function splitTopLevel(source: string): string[] {
  const parts: string[] = [];
  let buffer = "";
  let depth = 0;
  let inString: string | null = null;
  let escaped = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    const next = source[i + 1];

    if (!inString && char === "/" && next === "/") {
      while (i < source.length && source[i] !== "\n") i++;
      buffer += " ";
      continue;
    }
    if (!inString && char === "/" && next === "*") {
      i += 2;
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) i++;
      buffer += " ";
      continue;
    }

    if (inString) {
      buffer += char;
      if (!escaped && char === inString) {
        inString = null;
      }
      escaped = !escaped && char === "\\";
      continue;
    }

    if (char === "'" || char === "\"" || char === "`") {
      inString = char;
      buffer += char;
      continue;
    }

    if (char === "{" || char === "[" || char === "(") depth += 1;
    if (char === "}" || char === "]" || char === ")") depth -= 1;

    if (char === "," && depth === 0) {
      if (buffer.trim()) parts.push(buffer.trim());
      buffer = "";
      continue;
    }

    buffer += char;
  }

  if (buffer.trim()) parts.push(buffer.trim());
  return parts;
}

function splitKeyValue(entry: string): { key: string; value: string } | null {
  let depth = 0;
  let inString: string | null = null;
  let escaped = false;

  for (let i = 0; i < entry.length; i++) {
    const char = entry[i];
    if (inString) {
      if (!escaped && char === inString) inString = null;
      escaped = !escaped && char === "\\";
      continue;
    }
    if (char === "'" || char === "\"" || char === "`") {
      inString = char;
      continue;
    }
    if (char === "{" || char === "[" || char === "(") depth += 1;
    if (char === "}" || char === "]" || char === ")") depth -= 1;
    if (char === ":" && depth === 0) {
      const key = entry.slice(0, i).trim();
      const value = entry.slice(i + 1).trim();
      if (!key || !value) return null;
      return { key: stripQuotes(key), value };
    }
  }
  return null;
}

function parseArrayFirst(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[")) return null;
  const endIndex = trimmed.lastIndexOf("]");
  if (endIndex <= 0) return null;
  const inner = trimmed.slice(1, endIndex);
  const parts = splitTopLevel(inner);
  if (!parts[0]) return null;
  return stripQuotes(parts[0]);
}

function parseEntries(block: string): Array<{ key: string; value: string }> {
  const entries = splitTopLevel(block);
  const parsed: Array<{ key: string; value: string }> = [];
  for (const entry of entries) {
    const kv = splitKeyValue(entry);
    if (!kv) continue;
    parsed.push(kv);
  }
  return parsed;
}

function buildParamId(
  section: string,
  key: string,
  idCounts: Record<string, number>
): { id: string; cssVar: string; label: string } {
  const base = slugify(`${section}-${key}`);
  const count = (idCounts[base] ?? 0) + 1;
  idCounts[base] = count;
  const suffix = count > 1 ? `-${count}` : "";
  return {
    id: `rig.tw.${base}${suffix}`,
    cssVar: `--rig-tw-${base}${suffix}`,
    label: key.replace(/[-_]+/g, " ")
  };
}

function buildParam(
  section: (typeof SECTION_ORDER)[number],
  key: string,
  rawValue: string,
  filePath: string,
  idCounts: Record<string, number>
): RigParam | null {
  const normalizedValue = stripQuotes(rawValue);
  const numeric = parseNumeric(normalizedValue);
  let type: RigParamType = "string";
  let defaultValue: string | number = normalizedValue;
  let unit: string | undefined;
  let min: number | undefined;
  let max: number | undefined;
  let step: number | undefined;

  if (section === "colors" && COLOR_REGEX.test(normalizedValue)) {
    type = "color";
  } else if (numeric) {
    type = "number";
    defaultValue = numeric.num;
    unit = numeric.unit || undefined;
    const range = rangeForSection(section);
    min = range.min;
    max = range.max;
    step = range.step;
  }

  const { id, cssVar, label } = buildParamId(section, key, idCounts);
  let confidence = 0.35;
  if (type === "color" || type === "number") confidence += 0.1;
  if (section === "spacing" || section === "fontSize") confidence += 0.05;

  return {
    id,
    label,
    group: SECTION_GROUP[section],
    type,
    min,
    max,
    step,
    default: defaultValue,
    unit,
    cssVar,
    confidence: clampConfidence(confidence),
    origin: "tailwind",
    source: {
      file: filePath,
      property: `tailwind.${section}`,
      value: normalizedValue,
      start: -1,
      end: -1,
      selector: key,
      line: undefined,
      column: undefined
    }
  };
}

function collectParamsForSection(
  section: (typeof SECTION_ORDER)[number],
  block: string,
  filePath: string,
  idCounts: Record<string, number>,
  seen: Set<string>,
  maxRemaining: number
): RigParam[] {
  const params: RigParam[] = [];
  const entries = parseEntries(block);

  for (const entry of entries) {
    if (params.length >= maxRemaining) break;
    const key = entry.key;
    const raw = entry.value.trim();

    if (raw.startsWith("{")) {
      const nestedBlock = extractBracedBlock(raw, raw.indexOf("{"));
      if (!nestedBlock?.block) continue;
      const nestedEntries = parseEntries(nestedBlock.block);
      for (const nested of nestedEntries) {
        if (params.length >= maxRemaining) break;
        const nestedKey = `${key}-${nested.key}`;
        if (seen.has(`${section}:${nestedKey}`)) continue;
        const nestedRaw = nested.value.trim();
        const value =
          nestedRaw.startsWith("[") ? parseArrayFirst(nestedRaw) ?? "" : stripQuotes(nestedRaw);
        if (!value) continue;
        const param = buildParam(section, nestedKey, value, filePath, idCounts);
        if (param) {
          seen.add(`${section}:${nestedKey}`);
          params.push(param);
        }
      }
      continue;
    }

    const value = raw.startsWith("[") ? parseArrayFirst(raw) ?? "" : stripQuotes(raw);
    if (!value) continue;
    if (seen.has(`${section}:${key}`)) continue;
    const param = buildParam(section, key, value, filePath, idCounts);
    if (param) {
      seen.add(`${section}:${key}`);
      params.push(param);
    }
  }

  return params;
}

export function extractTailwindParams(
  content: string,
  filePath: string,
  limit = 60
): RigParam[] {
  const params: RigParam[] = [];
  const idCounts: Record<string, number> = {};
  const seen = new Set<string>();

  for (const section of SECTION_ORDER) {
    if (params.length >= limit) break;
    const blocks = findObjectBlocks(content, section);
    for (const block of blocks) {
      if (params.length >= limit) break;
      const maxRemaining = limit - params.length;
      params.push(...collectParamsForSection(section, block, filePath, idCounts, seen, maxRemaining));
    }
  }

  return params;
}
