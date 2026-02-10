# PRD: Rigger Landing Page (GitHub-First)

## Introduction/Overview
Create a conversion‑focused, single‑page landing experience for the Rigger extension that looks professional to real developers. The page must include 8 distinct scroll sections with clear IDs, emphasize install/use and GitHub adoption, and showcase the product with a “real” preview. Visual language should feel like a precision instrument panel (Teenage Engineering vibe, restrained, white‑space forward), with 3D spatial depth, subtle parallax, and a performant, low‑jank implementation.

This PRD defines content structure, performance constraints, and the required repo presentation changes needed for a best‑practice GitHub landing page in 2026.

## Goals
- Increase developer trust and perceived product maturity on first visit.
- Drive installs/usage and GitHub stars.
- Provide a realistic product preview and screenshots that match the actual UX.
- Deliver an 8‑beat narrative with spatial scroll effects and distinct section IDs.
- Maintain excellent performance (no layout jank, no avoidable layout shifts).

## User Stories

### US-001: View a clear product value proposition
**Description:** As a developer, I want to understand what Rigger does in under 10 seconds so I can decide to try it.

**Acceptance Criteria:**
- [ ] Hero includes concise H1, 1‑sentence subhead, and primary CTA.
- [ ] Hero includes a real UI visual (or faithful mock) of the panel.
- [ ] Copy emphasizes what Rigger changes (live rigging + safe edits + preview).
- [ ] Typecheck/lint passes.
- [ ] **Verify in browser using dev-browser skill**

### US-002: See credible proof and product clarity
**Description:** As a developer, I want to see proof of functionality and a quick mental model so I can trust the tool.

**Acceptance Criteria:**
- [ ] Section with “How it works” (3–5 steps) and simple diagram.
- [ ] Section with “What it does today” (bulleted capabilities).
- [ ] Trust elements (e.g., badges, constraints, or guardrails).
- [ ] Typecheck/lint passes.
- [ ] **Verify in browser using dev-browser skill**

### US-003: Experience a spatial, performant scroll narrative
**Description:** As a visitor, I want the page to feel spatial and premium without jank.

**Acceptance Criteria:**
- [ ] Eight scroll sections with distinct `id`s.
- [ ] Subtle parallax uses compositor‑friendly properties.
- [ ] Reduced‑motion mode disables non‑essential motion.
- [ ] No layout shifts induced by animation.
- [ ] Typecheck/lint passes.
- [ ] **Verify in browser using dev-browser skill**

### US-004: Find install/try information instantly
**Description:** As a developer, I want a clear path to install or try the demo.

**Acceptance Criteria:**
- [ ] Primary CTA for install/usage.
- [ ] Secondary CTA for preview/demo.
- [ ] GitHub star CTA included.
- [ ] Typecheck/lint passes.
- [ ] **Verify in browser using dev-browser skill**

### US-005: Preview target is visible and real
**Description:** As a visitor, I want to see the embedded browser preview so I can imagine using it.

**Acceptance Criteria:**
- [ ] Section shows a simplified browser preview panel visual.
- [ ] README includes demo/preview link and badge.
- [ ] Typecheck/lint passes.
- [ ] **Verify in browser using dev-browser skill**

## Functional Requirements
1. FR-1: Create a new landing page with 8 scroll sections, each with a unique `id`.
2. FR-2: Provide a “perspective wrapper” that gives natural 3D depth to the entire page.
3. FR-3: Use composited transforms for scroll effects; avoid layout‑thrashing animations.
4. FR-4: Respect `prefers-reduced-motion` by disabling non‑essential motion.
5. FR-5: Include a hero section with one primary CTA and one secondary CTA.
6. FR-6: Add a “realistic” simplified Rigger panel mock and a browser preview mock.
7. FR-7: Provide a section explicitly describing install/usage steps.
8. FR-8: Add a section for proof/credibility (guardrails, architecture, or stats).
9. FR-9: Add a “demo/preview” section with a link to the hosted test version.
10. FR-10: Update README with new branding assets, screenshots, and preview link/badge.

## Non-Goals (Out of Scope)
- Building an interactive product tour or full in‑browser editor.
- Implementing real backend analytics or A/B testing.
- Replacing product UI; this is a marketing/README experience only.

## Design Considerations
- Visual tone: restrained, high‑precision, instrument‑panel vibes; white‑space heavy, thin gridlines, subtle technical motifs.
- Layout: full‑width sections, spatial layering, soft parallax; no heavy repainting.
- Copy: tight, developer‑grade, avoids fluff, emphasizes safety + speed + control.
- 8 narrative beats should include: Hero, Product Proof, How It Works, Preview, Controls/Depth, Safety/Guardrails, Social/Trust, CTA/Install.

## Technical Considerations
- Use compositor‑friendly properties for motion (transform/opacity). Avoid animating layout‑affecting properties to prevent CLS. citeturn1search6turn1search7
- Implement `prefers-reduced-motion` to reduce or disable non‑essential animation. citeturn1search0turn1search1
- Avoid lazy‑loading LCP/hero images; prioritize LCP resources. citeturn2search3
- Keep navigation minimal and maintain a single primary CTA (conversion clarity). citeturn2search0
- README should clearly state what the project does, why useful, how to get started, and where to get help. citeturn3search0

## Success Metrics
- Visitors can identify “what Rigger is” within 10 seconds (qualitative test).
- Clear path to install or preview in under 2 scrolls.
- No obvious scroll jank on mid‑tier laptops; smooth on modern browsers.
- README conversion improvements: more stars and demo clicks after update.

## Open Questions
- What is the exact preview URL to include in README and landing page?
- Where will the landing page be hosted (repo `docs/`, GitHub Pages, or separate site)?
- Which visual direction to prioritize: ultra‑minimal vs. more “instrument‑panel” density?

## Research Notes (Current Best Practices)
- Landing pages perform best with a single, clear CTA and minimal distraction. citeturn2search0
- Motion must respect reduced‑motion preferences for accessibility. citeturn1search0turn1search1
- Avoid layout‑shifting animations; use composited transforms. citeturn1search6turn1search7
- Do not lazy‑load LCP/hero images. citeturn2search3
- README should explain what the project does, why useful, how to start, and where to get help. citeturn3search0
