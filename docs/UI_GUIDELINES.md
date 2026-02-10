# Rigger UI Guidelines

## Layout
- Use a horizontal ResizablePanelGroup: left = parameter list, right = preview/inspector.
- Use a vertical ResizablePanelGroup inside the right panel: preview on top, selection details below.
- Persist panel sizes and restore them on reopen.

## Density
- Provide a global density control: Compact / Comfortable / Large.
- Implement via CSS variables:
  - `--rig-row`, `--rig-font`, `--rig-gap`, `--rig-slider-h`, `--rig-thumb`
- Density changes should immediately affect all controls.

## Controls
- Sliders must show value, unit, min/max, and allow typed input.
- Provide fine adjustment (toggle or shift-drag) and reset per parameter.
- Provide reset per group.

## Accessibility
- Preserve visible focus rings.
- Keep text readable; avoid sub-11px body text.
- Ensure sufficient contrast against VS Code themes.

## Visual Tone
- Slick, minimal, and stable.
- Avoid visual noise; use calm hierarchy and minimal icons.
- Use shadcn/ui components and conventions.
