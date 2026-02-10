# PRD: Rigger Refinement & Core Reliability

## Introduction / Overview
This PRD covers a minimal, high‑impact refinement pass for Rigger with a balanced focus across stability, scan accuracy, config quality, and UX polish. The scope is limited to improvements that reduce false positives, stabilize parameter identities, and eliminate known UX friction while keeping the extension’s safety and undo‑friendly guarantees.

**Primary goal:** Balance all refinement areas (stability, scan accuracy, config quality, UX) equally.  
**Prioritized functionality:** CSS discovery/parsing accuracy and rig config quality/param grouping.  
**Scope:** Minimal viable refinement.  
**Bug handling:** Include a ranked bug list and treat fixes as requirements.

## Goals
- Improve CSS discovery accuracy and reduce false positives.
- Stabilize parameter IDs across scans to prevent config churn.
- Improve parameter grouping and deduping for consistent UI ordering.
- Preserve safety: diff‑first apply and single‑undo edits only.
- Polish the onboarding and loading UX without adding telemetry.

## User Stories

### US-001: Stable parameter identifiers across scans
**Description:** As a user, I want parameter IDs to stay stable between scans so my tweaks and configs do not reset.

**Acceptance Criteria:**
- [ ] Param IDs are derived from stable inputs (selector + property + file path + location hash), not list order
- [ ] Re-scanning the same file yields identical IDs for unchanged declarations
- [ ] Typecheck/lint passes

### US-002: Accurate CSS discovery with better candidates
**Description:** As a user, I want Rigger to find the correct CSS files automatically so the scan targets the right surface.

**Acceptance Criteria:**
- [ ] Candidate scoring includes imports in entry JS/TS files, CSS `@import`, and HTML `<link>` tags
- [ ] CSS Modules are supported but down‑weighted vs global styles
- [ ] Candidates list includes a clear “reason” label for why a file was picked
- [ ] Typecheck/lint passes
- [ ] **Verify in browser using dev-browser skill**

### US-003: Cleaner grouping and dedupe of parameters
**Description:** As a user, I want grouped parameters to be consistent and not duplicated across similar rules.

**Acceptance Criteria:**
- [ ] Duplicate declarations (same selector + property + value) are collapsed into one param
- [ ] Groups are sorted deterministically (Colour, Typography, Spacing, Radius, Shadow, Motion, Other)
- [ ] Typecheck/lint passes

### US-004: Onboarding polish with demo preview and graceful loading
**Description:** As a new user, I want an onboarding experience that feels smooth and delightful.

**Acceptance Criteria:**
- [ ] Onboarding displays the demo preview and the “Join alpha” opt‑in CTA
- [ ] Panel opens with subtle fade‑in (no flash), with skeleton loading where data is missing
- [ ] Reduced‑motion accessibility respected (no motion when OS setting enabled)
- [ ] Typecheck/lint passes
- [ ] **Verify in browser using dev-browser skill**

### US-005: Safer apply flow and undo integrity
**Description:** As a user, I want safe edits that are reversible and do not corrupt the original file.

**Acceptance Criteria:**
- [ ] Apply uses WorkspaceEdit and remains a single undo step
- [ ] Applying twice does not duplicate `/* rigger:start */` blocks
- [ ] Typecheck/lint passes

### US-006: Regression tests for refinements
**Description:** As a developer, I want automated tests that validate the refinement improvements.

**Acceptance Criteria:**
- [ ] Unit test verifies stable ID generation across two scans
- [ ] Unit test verifies candidate scoring includes CSS imports and modules
- [ ] Integration test still opens panel, runs rig pipeline, and applies edits successfully
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: Parameter IDs must be deterministic across scans for unchanged declarations.
- FR-2: CSS discovery must include CSS imports and HTML link tags.
- FR-3: Candidate CSS selection must present a ranked list with reasons.
- FR-4: Duplicate parameters must be deduped using selector + property + value hashing.
- FR-5: Group ordering must be deterministic and UI-stable.
- FR-6: Onboarding must include demo preview and CTA with fade‑in and loaders.
- FR-7: Apply flow must remain diff‑first and undo‑friendly.
- FR-8: Tests must be updated to validate refinements.

## Known Bugs & Fixes (Ranked)
**B-1 (High):** Param IDs are order-based and change between scans.  
**Fix:** Use deterministic ID hashing (selector + property + file path + source range) and ensure sorting is stable.

**B-2 (High):** CSS discovery misses CSS imported inside CSS files (`@import`) or HTML `<link>` tags with query params.  
**Fix:** Parse `@import` and link tags, resolve relative paths, add to candidates with high score.

**B-3 (Medium):** Onboarding is not resettable for demos/tests.  
**Fix:** Add a developer command `Rigger: Reset Onboarding` to clear global onboarding state.

**B-4 (Medium):** Candidate list can pick CSS Modules as top target in some projects.  
**Fix:** Down‑weight `.module.css` files unless explicitly selected by user.

**B-5 (Low):** Duplicate params from similar selectors clutter the list.  
**Fix:** Deduplicate and surface a count indicator when merges occur.

## Non‑Goals (Out of Scope)
- Full telemetry pipeline or remote analytics storage
- JS/TS AST rewriting or direct component updates
- Multi‑root workspace management
- Tailwind config execution or complex token evaluation

## Design Considerations
- Maintain Cursor-like visual language: soft contrast, crisp typography, minimal noise
- Use subtle transitions and avoid flashing content
- Keep onboarding playful but professional with a clear CTA

## Technical Considerations
- Introduce stable param ID generation utility (hash function) in rig‑engine
- Update scan pipeline to include `@import` and `link` parsing for candidate scoring
- Keep parsing safe (no execution); use regex/AST only
- Ensure config ordering is deterministic (sort by group + label + selector)

## Success Metrics
- Stable IDs across repeated scans of the same file (0 changes in IDs)
- 90%+ correct CSS file auto‑selection on fixtures
- Panel opens with no flash and first paint under 200ms
- Integration tests pass without flakiness

## Open Questions
- Should we add a user-facing toggle to re‑show onboarding?
- Should opt‑in consent be required to proceed or optional?

