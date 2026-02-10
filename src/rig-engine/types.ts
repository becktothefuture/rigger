export type RigParamType = "number" | "color" | "string";

export type RigGroup =
  | "Colour"
  | "Typography"
  | "Spacing"
  | "Radius"
  | "Shadow"
  | "Motion"
  | "Other";

export interface RigParamSource {
  file: string;
  property: string;
  value: string;
  start: number;
  end: number;
  selector?: string;
  line?: number;
  column?: number;
}

export interface RigParam {
  id: string;
  label: string;
  group: RigGroup;
  type: RigParamType;
  min?: number;
  max?: number;
  step?: number;
  default: string | number;
  unit?: string;
  cssVar: string;
  confidence?: number;
  origin?: "css" | "tailwind";
  source: RigParamSource;
}

export interface RigScanResult {
  projectType: "react" | "vanilla" | "unknown";
  root: string;
  cssFile: string | null;
  cssCandidates?: { file: string; score: number; reason: string }[];
  params: RigParam[];
  diagnostics: string[];
}

export interface RigEditPlan {
  cssFile: string;
  updatedCss: string;
  configJson: string;
}
