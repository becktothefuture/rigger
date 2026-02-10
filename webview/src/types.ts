export type RigParamType = "number" | "color" | "string";
export type RigGroup =
  | "Colour"
  | "Typography"
  | "Spacing"
  | "Radius"
  | "Shadow"
  | "Motion"
  | "Other";
export type PreviewTarget = "simpleBrowser" | "external" | "embedded";

export interface RigParamSource {
  file: string;
  property: string;
  value: string;
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

export interface UiState {
  layout: { left: number; right: number; rightTop: number; rightBottom: number };
  density: "compact" | "comfortable" | "large";
  lastGroup: RigGroup;
  livePreview: boolean;
  previewUrl: string;
  previewTarget: PreviewTarget;
}

export interface OnboardingState {
  complete: boolean;
  telemetryOptIn: boolean;
}

export interface BootstrapState {
  uiState: UiState;
  onboarding?: OnboardingState;
  demoUrl?: string;
}
