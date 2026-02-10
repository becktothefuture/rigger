# PRD: Rigger (Cursor-Compatible VS Code Extension)

## Introduction / Overview
Rigger is a Cursor-compatible VS Code extension that provides a premium webview panel UI for detecting frontend projects, scanning for tweakable parameters, generating a rig configuration file, and enabling safe, reversible live tweaking via CSS variables. The v0.1 focus is rapid iteration and automated validation without extension reinstall loops.

**Assumptions (confirmed):**
- Primary goals: fast iteration and premium UI polish
- Target users: designers and frontend developers using Cursor
- Project types: React (Vite/CRA-style) + vanilla HTML/CSS/JS
- Success criteria: dev loop + tests, rig UI quality, and edit safety

## Goals
- Enable a no-reinstall dev loop using Extension Development Host + webview HMR.
- Provide a shadcn/ui-based Rig UI with resizable panes, global density control, and premium visual polish.
- Detect a supported frontend project and propose tweakable parameters via read-only scan.
- Generate `rig.config.json` and inject safe CSS-variable hooks using WorkspaceEdit.
- Apply changes diff-first and undo-friendly.
- Provide automated unit and integration tests for core flows.

## User Stories

### US-001: Open Rigger panel
**Description:** As a developer, I want to open a dedicated Rigger panel so I can see the rig UI inside Cursor.

**Acceptance Criteria:**
- [ ] Command `rigger.openPanel` is registered and appears in command palette
- [ ] Webview panel opens with the Rigger title and initial layout
- [ ] Typecheck/lint passes
- [ ] **Verify in browser using dev-browser skill**

### US-002: Webview dev mode with HMR
**Description:** As a developer, I want the webview to load from a local dev server in dev mode so I can iterate without rebuilding.

**Acceptance Criteria:**
- [ ] When `rigger.devWebview=true` or `RIGGER_DEV_WEBVIEW=1`, webview loads `http://localhost:<port>`
- [ ] In production mode, webview loads bundled assets only
- [ ] CSP blocks remote scripts in production
- [ ] Typecheck/lint passes

### US-003: Rig UI layout + density control
**Description:** As a user, I want resizable panels and a global density control so the UI fits my workflow.

**Acceptance Criteria:**
- [ ] Horizontal resizable split: Groups/List (left) vs Inspector/Preview (right)
- [ ] Optional vertical split on right: Preview (top) vs Details (bottom)
- [ ] Density control (Compact/Comfortable/Large or slider) adjusts CSS vars for spacing, row height, and font size
- [ ] Persisted values restored on reopen
- [ ] Typecheck/lint passes
- [ ] **Verify in browser using dev-browser skill**

### US-004: Detect supported frontend project
**Description:** As a user, I want Rigger to detect the project type so it can determine scan strategy.

**Acceptance Criteria:**
- [ ] Detect React (Vite/CRA-like) or vanilla HTML/CSS/JS projects
- [ ] Provide a clear project card with type and entry points
- [ ] Typecheck/lint passes
- [ ] **Verify in browser using dev-browser skill**

### US-005: Read-only scan for tweakable parameters
**Description:** As a user, I want Rigger to propose tweakable parameters without modifying my files.

**Acceptance Criteria:**
- [ ] Scan only allowlisted properties (color, background-color, font-size, line-height, letter-spacing, margin, padding, border-radius, box-shadow)
- [ ] Skip `node_modules`, `dist`, `build`, `coverage`, and minified files
- [ ] Parameters grouped into Colour, Typography, Spacing, Radius, Shadow, Motion
- [ ] Typecheck/lint passes

### US-006: Display parameter list with precise sliders
**Description:** As a user, I want precise sliders with value input so I can fine-tune parameters.

**Acceptance Criteria:**
- [ ] Slider + Input show current value, unit, min/max
- [ ] Fine adjustment option (shift-drag or toggle)
- [ ] Reset-to-default per parameter and per group
- [ ] Typecheck/lint passes
- [ ] **Verify in browser using dev-browser skill**

### US-007: Generate rig.config.json
**Description:** As a user, I want a rig configuration file so changes are tracked and reproducible.

**Acceptance Criteria:**
- [ ] `rig.config.json` created at workspace root via WorkspaceEdit
- [ ] Schema includes version, projectType, params, and files arrays
- [ ] Includes source file path and property for each param
- [ ] Typecheck/lint passes

### US-008: Inject CSS-variable hooks safely
**Description:** As a user, I want Rigger to inject CSS variables in a reversible, safe way.

**Acceptance Criteria:**
- [ ] Inject a `:root` block wrapped with `/* rigger:start */` and `/* rigger:end */`
- [ ] Only allowed properties are replaced with `var(--rig-*)`
- [ ] All edits applied via WorkspaceEdit in one undo step
- [ ] Typecheck/lint passes

### US-009: Diff-first apply and undo
**Description:** As a user, I want to preview diffs and undo changes easily.

**Acceptance Criteria:**
- [ ] Diff preview shown before apply using VS Code diff view
- [ ] Apply creates a single undo step
- [ ] Undo restores original content with no residual changes
- [ ] Typecheck/lint passes

### US-010: Diagnostics logging
**Description:** As a developer, I want clear logs for debugging.

**Acceptance Criteria:**
- [ ] OutputChannel “Rigger” with timestamps for scans and applies
- [ ] Webview console messages forwarded to OutputChannel
- [ ] Diagnostics section in UI shows last scan status
- [ ] Typecheck/lint passes
- [ ] **Verify in browser using dev-browser skill**

### US-011: Automated tests
**Description:** As a developer, I want automated tests to validate core flows.

**Acceptance Criteria:**
- [ ] Unit tests cover parameter extraction, grouping, config generation, and edit planning
- [ ] Integration tests validate activation, panel open, rig pipeline, and file edits
- [ ] Tests run via npm scripts without manual clicking
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The extension must register `rigger.openPanel`, `rigger.rigItUp`, and `rigger.applyEdits` commands.
- FR-2: The webview must be a React + TypeScript + Tailwind + shadcn/ui app.
- FR-3: The webview must implement resizable panels and density control via CSS variables.
- FR-4: The extension must detect React (Vite/CRA-like) and vanilla projects.
- FR-5: The analysis engine must perform read-only scans and return grouped parameters.
- FR-6: The extension must generate `rig.config.json` with stable param identifiers.
- FR-7: CSS variable hooks must be injected via WorkspaceEdit using marker comments.
- FR-8: Apply flow must be diff-first and undo-friendly.
- FR-9: UI state (panel sizes, density, last selection) must persist in workspaceState.
- FR-10: Dev mode must support webview HMR via localhost with explicit toggle.

## Non-Goals (Out of Scope)
- Tailwind config editing or token extraction beyond CSS files
- Complex JSX/TSX AST rewrites in v0.1
- Remote preview server or browser-based live preview
- Multi-project workspaces beyond a single detected frontend root

## Design Considerations
- Use shadcn/ui ResizablePanelGroup patterns
- Match Cursor theme (dark/light) without harsh contrast
- Minimal, premium typography and spacing
- Accessibility: focus rings, keyboard navigation, readable sizes
- Use lucide-react icons sparingly

## Technical Considerations
- Use WorkspaceEdit exclusively for file changes
- Strict CSP in webview; allow localhost only in dev mode
- Keep analysis engine pure and testable (`src/rig-engine`)
- Use OutputChannel for logs and diagnostics
- Ensure compatibility with Cursor’s VS Code API subset

## Success Metrics
- Dev loop: open panel and see UI updates within 2 seconds after save in webview dev mode
- UI quality: layout, density, and controls feel polished and consistent with shadcn/ui standards
- Scan/apply: rig pipeline completes in under 2 seconds for demo fixtures
- Tests: unit + integration tests pass on CI with no flake
- Safety: edits are single-undo and diff-first

## Open Questions
- Should Next.js be supported in v0.1, and if so, what CSS entry discovery rules should apply?
- Should density control be discrete (3 steps) or continuous slider in v0.1?
- Should the diff preview be modal inside the webview or VS Code’s native diff view?
- What is the default path for the injected `:root` block if multiple CSS files are present?
