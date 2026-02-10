# Rigger Figma Component Blueprint

File: `https://www.figma.com/design/Z9iW5kf86ebZ0OwV1MLOnP/Rigger`
Primary frame detected: `2:2` (`1920x1080`)

## 1) Goal
- Build a reusable control-surface component library in Figma for Rigger.
- Ensure minimal scrolling in panel UI through collapsible sections and dense layout modes.
- Include an explicit top-right audio click toggle (`Always On` / `Always Off`).
- Provide three exemplar rigs: simple, medium, complex.

## 2) Page Structure
- `00_Foundations`
- `01_Controls`
- `02_PanelShell`
- `03_Interaction`
- `04_RigExamples`
- `99_Handoff`

## 3) Foundations (Variables + Tokens)
### Color variables
- `color.bg.base`
- `color.bg.panel`
- `color.bg.elevated`
- `color.border.default`
- `color.text.default`
- `color.text.muted`
- `color.accent.primary`
- `color.accent.soft`
- `color.state.success`
- `color.state.warning`
- `color.state.error`

### Size and spacing variables
- `space.4`, `space.6`, `space.8`, `space.12`, `space.16`, `space.20`, `space.24`
- `radius.6`, `radius.8`, `radius.12`, `radius.16`
- `control.row.compact`, `control.row.comfortable`, `control.row.large`
- `control.track.compact`, `control.track.comfortable`, `control.track.large`
- `control.thumb.compact`, `control.thumb.comfortable`, `control.thumb.large`

### Motion variables
- `motion.fast` (`120ms`)
- `motion.base` (`200ms`)
- `motion.slow` (`320ms`)
- `motion.ease.standard`
- `motion.ease.snappy`

## 4) Control Components (10+)
Use component sets with predictable internals:
- Layer names: `Container`, `Label`, `Track`, `Range`, `Thumb`, `Value`, `Unit`, `Reset`, `Hint`

### A. Dials and encoders
1. `Dial/RotaryBasic`
2. `Dial/RotaryFine`
3. `Dial/SteppedDetent`
4. `Encoder/InfiniteWheel`

### B. Sliders and faders
5. `Slider/LinearHorizontal`
6. `Slider/LinearVertical`
7. `Slider/RangeDualThumb`
8. `Slider/SteppedSnap`
9. `Fader/StudioLongThrow`

### C. Multi-axis and numeric
10. `XYPad/Vector`
11. `Input/NumericScrub`

### D. Audio toggle
12. `Toggle/AudioClick`

### Standard variant axes
- `State=Default|Hover|Pressed|Focus|Disabled`
- `Size=Sm|Md|Lg`
- `Density=Compact|Comfortable|Large`
- `Detent=On|Off` (where applicable)
- `Value=Inline|Detached|Hidden`

## 5) Panel Shell Components
- `Panel/Header`
- `Panel/Toolbar`
- `Panel/SectionCollapsible`
- `Panel/ControlRow`
- `Panel/InspectorCard`
- `Panel/DiagnosticList`
- `Panel/PreviewCard`

### Panel layout variants
- `Layout=Simple|Split|Cockpit`
- `RightPane=Preview|Inspector|Diagnostics`

## 6) No-Scroll Design Rules
- Keep key controls visible within `1080px` height baseline.
- Use collapsible groups; default-open only current active group.
- Keep selected control details pinned.
- Show advanced controls only when expanded.
- Avoid nested scrolling regions where possible.

## 7) Audio Click Interaction Spec
- Place `Toggle/AudioClick` in top-right of panel header.
- States:
  - `Always On`
  - `Always Off`
- Behavior:
  - Click emitted on detent crossings and toggle transitions.
  - Optional stepped-click behavior for snap sliders only.
- Accessibility:
  - Visible focus ring.
  - 44x44 minimum target.

## 8) Rig Exemplars
### A. Simple Rig: CSS Animation Controller
- Controls:
  - Duration
  - Easing
  - Scale
  - Opacity
  - Hue Shift
  - Blur
  - Loop On/Off
- Layout:
  - 2 collapsible groups
  - 1 selected-control inspector

### B. Medium Rig: Matter.js Physics Controller
- Controls:
  - Gravity X/Y
  - Restitution
  - Friction
  - Damping
  - Spawn Rate
  - Wind
  - Trail Decay
- Layout:
  - Split mode with preview + diagnostics
  - Quick preset chips

### C. Complex Rig: Hybrid 3D Scene Controller
- Technologies represented:
  - Three.js
  - GSAP timeline
  - Postprocessing
  - Physics
- Controls:
  - Camera FOV
  - Dolly Distance
  - Key/Fill/Rim intensity
  - Bloom / DOF / Noise
  - Timeline Speed
  - Particle Emission
  - Rigid-body Damping
  - Roughness / Metalness
  - Environment Rotation
  - LUT Blend
- Layout:
  - Cockpit mode
  - Nested collapsibles
  - Always-visible primary controls

## 9) Code Handoff Contract
- Figma property names should map directly to React props where possible:
  - `density`, `state`, `detent`, `size`, `valueDisplay`, `audioEnabled`
- Keep component set names noun-based.
- Use variant format `Property=Value` consistently.
- Avoid ambiguous names like `Frame 12`.

## 10) Execution Sequence
1. Build `00_Foundations` variables.
2. Build `01_Controls` component sets.
3. Build `02_PanelShell` primitives.
4. Build `03_Interaction` audio toggle and state demos.
5. Build `04_RigExamples` (simple, medium, complex).
6. Validate against no-scroll rules at `1920x1080` and `1440x900`.
7. Finalize `99_Handoff` with variant matrix and prop mapping.

