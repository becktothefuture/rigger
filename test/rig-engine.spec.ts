import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { extractParamsFromCss } from "../src/rig-engine/scan";
import { extractTailwindParams } from "../src/rig-engine/tailwind";
import { extractCssImportsFromCss, extractCssLinksFromHtml } from "../src/rig-engine/css-discovery";
import { buildUpdatedCss } from "../src/rig-engine/edit-plan";

const sample = readFileSync("test/fixtures/sample.css", "utf-8");
const tailwindSample = readFileSync("test/fixtures/tailwind.config.js", "utf-8");
const duplicateSample = readFileSync("test/fixtures/duplicate.css", "utf-8");

describe("rig-engine", () => {
  it("extracts allowed params", () => {
    const params = extractParamsFromCss(sample, "sample.css");
    expect(params.length).toBeGreaterThan(5);
    expect(params.some((p) => p.group === "Typography")).toBe(true);
    expect(params.some((p) => p.group === "Colour")).toBe(true);
  });

  it("builds updated CSS with root block", () => {
    const params = extractParamsFromCss(sample, "sample.css");
    const updated = buildUpdatedCss(sample, params);
    expect(updated).toContain("/* rigger:start */");
    expect(updated).toContain(":root");
    expect(updated).toContain("var(--rig");
  });

  it("extracts tailwind tokens safely", () => {
    const params = extractTailwindParams(tailwindSample, "tailwind.config.js");
    expect(params.length).toBeGreaterThan(5);
    expect(params.some((p) => p.group === "Colour")).toBe(true);
    expect(params.some((p) => p.group === "Typography")).toBe(true);
    expect(params.every((p) => p.origin === "tailwind")).toBe(true);
  });

  it("produces stable ids across scans", () => {
    const paramsA = extractParamsFromCss(sample, "sample.css");
    const paramsB = extractParamsFromCss(sample, "sample.css");
    expect(paramsA.map((p) => p.id)).toEqual(paramsB.map((p) => p.id));
  });

  it("dedupes identical declarations", () => {
    const params = extractParamsFromCss(duplicateSample, "dup.css");
    const colorParams = params.filter((p) => p.label === "color");
    expect(colorParams.length).toBe(1);
  });

  it("extracts css imports and html link tags", () => {
    const cssImports = extractCssImportsFromCss(
      "@import url('./base.css');\\n@import \"theme.css?x=1\";"
    );
    expect(cssImports).toEqual(["./base.css", "theme.css"]);

    const links = extractCssLinksFromHtml(
      "<link rel=\"stylesheet\" href=\"/styles/app.css?x=1\">"
    );
    expect(links).toEqual(["/styles/app.css"]);
  });
});
