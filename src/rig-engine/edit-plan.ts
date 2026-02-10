import { RigParam } from "./types";

function formatDefaultValue(
  param: RigParam,
  overrides?: Record<string, string | number>
): string {
  const override = overrides?.[param.id];
  const value = override ?? param.default;
  if (typeof value === "number") {
    return `${value}${param.unit ?? ""}`;
  }
  return String(value);
}

function buildRootBlock(
  params: RigParam[],
  overrides?: Record<string, string | number>
): string {
  const lines = params.map(
    (param) => `  ${param.cssVar}: ${formatDefaultValue(param, overrides)};`
  );
  return [
    "/* rigger:start */",
    ":root {",
    ...lines,
    "}",
    "/* rigger:end */"
  ].join("\n");
}

function injectRootBlock(content: string, block: string): string {
  const start = content.indexOf("/* rigger:start */");
  const end = content.indexOf("/* rigger:end */");

  if (start >= 0 && end > start) {
    const afterEnd = end + "/* rigger:end */".length;
    return `${content.slice(0, start)}${block}${content.slice(afterEnd)}`;
  }

  return `${block}\n\n${content}`;
}

export function buildUpdatedCss(
  content: string,
  params: RigParam[],
  overrides?: Record<string, string | number>
): string {
  const replacements = params
    .filter((param) => param.source.start >= 0 && param.source.end > param.source.start)
    .map((param) => ({
      start: param.source.start,
      end: param.source.end,
      text: `var(${param.cssVar})`
    }))
    .sort((a, b) => b.start - a.start);

  let updated = content;
  for (const repl of replacements) {
    updated = `${updated.slice(0, repl.start)}${repl.text}${updated.slice(repl.end)}`;
  }

  const block = buildRootBlock(params, overrides);
  return injectRootBlock(updated, block);
}
