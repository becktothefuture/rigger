# Talk to Figma Master Prompt (Rigger)

Use this prompt inside the Talk to Figma plugin while `Frame 1` (`node-id=2:2`) is selected.

```text
You are designing a reusable component library and exemplar panel layouts for the Rigger product.

Target:
- File: Rigger
- Selected frame: 1920x1080 dark base canvas
- Build everything inside this selected frame in organized sections with clear titles.

Primary outcome:
- Create a production-ready control-surface design system for a no-scroll panel UX.
- Include 10+ different control types (dials, sliders, faders, XY, numeric).
- Include an audio click toggle in the top-right of the panel header.
- Include three rig examples: simple, medium, complex.

Constraints:
1) Minimal scrolling: design the panel to keep key controls visible.
2) Use collapsible sections and compact density controls instead of long scrolling columns.
3) Build reusable components with clear naming and variants.
4) Keep visual style intentional and tactile, inspired by Loupedeck / instrument panels.
5) Avoid generic UI. Make controls feel precise and “visceral.”

Create these section headers on canvas:
- 00 Foundations
- 01 Controls
- 02 Panel Shell
- 03 Audio Interaction
- 04 Rig Examples
- 99 Handoff

In "00 Foundations", create style tokens as named color/text/spacing/radius references:
- Color roles: bg/base, bg/panel, bg/elevated, border/default, text/default, text/muted, accent/primary, accent/soft, state/success, state/warning, state/error
- Spacing scale: 4, 6, 8, 12, 16, 20, 24
- Radius scale: 6, 8, 12, 16
- Density metrics: row/track/thumb sizes for compact, comfortable, large

In "01 Controls", create component sets with variants for each control:
- Dial/RotaryBasic
- Dial/RotaryFine
- Dial/SteppedDetent
- Encoder/InfiniteWheel
- Slider/LinearHorizontal
- Slider/LinearVertical
- Slider/RangeDualThumb
- Slider/SteppedSnap
- Fader/StudioLongThrow
- XYPad/Vector
- Input/NumericScrub
- Toggle/AudioClick

For each component set, use consistent variant properties:
- State = Default, Hover, Pressed, Focus, Disabled
- Size = Sm, Md, Lg
- Density = Compact, Comfortable, Large
- Detent = On, Off (where relevant)
- ValueDisplay = Inline, Detached, Hidden (where relevant)

Use predictable internal layer names where relevant:
- Container, Label, Track, Range, Thumb, Value, Unit, Reset, Hint

In "02 Panel Shell", create reusable panel primitives:
- Panel/Header (with product title, status chip area, top-right audio toggle slot)
- Panel/Toolbar
- Panel/SectionCollapsible
- Panel/ControlRow
- Panel/InspectorCard
- Panel/DiagnosticsList
- Panel/PreviewCard

Create panel layout variants:
- Layout = Simple, Split, Cockpit
- RightPane = Preview, Inspector, Diagnostics

In "03 Audio Interaction", design the top-right audio toggle:
- Two explicit states: Always On, Always Off
- Include state visuals for hover, pressed, focus, disabled
- Include short interaction annotations:
  - Clicks fire on detent crossings, snaps, and toggle transitions
  - Optional stepped-only click behavior for snap sliders

In "04 Rig Examples", create three realistic panel compositions:

1) Simple Rig: CSS Animation Controller
- Controls: Duration, Easing, Scale, Opacity, Hue Shift, Blur, Loop
- Keep to 2 collapsible groups + selected control detail

2) Medium Rig: Matter.js Physics Controller
- Controls: Gravity X/Y, Restitution, Friction, Damping, Spawn Rate, Wind, Trail Decay
- Include preview + diagnostics cards

3) Complex Rig: Hybrid 3D Controller
- Technologies represented: Three.js + GSAP + Postprocessing + Physics
- Controls: Camera FOV, Dolly Distance, Key/Fill/Rim lights, Bloom/DOF/Noise, Timeline Speed, Particle Emission, Rigid-body Damping, Roughness/Metalness, Environment Rotation, LUT Blend
- Use cockpit layout with nested collapsibles while keeping primary controls visible

In "99 Handoff", add compact tables/notes:
- Variant Matrix for each component family
- Token Mapping summary
- Code API mapping guidance:
  - density, state, detent, size, valueDisplay, audioEnabled

Quality checks:
- Do not leave generic names like “Frame 23” for final components
- Preserve minimum 44x44 hit targets for interactive controls
- Keep text readable and hierarchy clear
- Make all key controls visible in a 1080px-tall viewport
```

