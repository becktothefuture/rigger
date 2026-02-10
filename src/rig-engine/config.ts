import { RigParam, RigScanResult } from "./types";

function paramToConfig(param: RigParam) {
  return {
    id: param.id,
    label: param.label,
    group: param.group,
    type: param.type,
    min: param.min,
    max: param.max,
    step: param.step,
    default: param.default,
    unit: param.unit,
    cssVar: param.cssVar,
    confidence: param.confidence,
    origin: param.origin,
    source: {
      file: param.source.file,
      property: param.source.property,
      selector: param.source.selector,
      line: param.source.line,
      column: param.source.column,
      value: param.source.value,
      start: param.source.start,
      end: param.source.end
    }
  };
}

export function buildRigConfig(result: RigScanResult): string {
  const payload = {
    version: "0.1",
    projectType: result.projectType,
    generatedAt: new Date().toISOString(),
    params: result.params.map(paramToConfig),
    files: result.cssFile ? [{ file: result.cssFile, injected: true }] : []
  };

  return JSON.stringify(payload, null, 2);
}

export function buildRigSnapshot(
  result: RigScanResult,
  overrides: Record<string, string | number>
): string {
  const payload = {
    version: "0.1",
    projectType: result.projectType,
    generatedAt: new Date().toISOString(),
    params: result.params.map((param) => ({
      id: param.id,
      label: param.label,
      group: param.group,
      cssVar: param.cssVar,
      unit: param.unit,
      value: overrides[param.id] ?? param.default
    })),
    files: result.cssFile ? [{ file: result.cssFile, injected: true }] : [],
    overrides
  };

  return JSON.stringify(payload, null, 2);
}
