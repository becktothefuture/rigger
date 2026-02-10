# Rigger Machine Glossary

Source of truth: `architecture/rigger.machine.json`

This index is beginner-friendly by design. Keep IDs stable so diagram and runtime stay aligned.

## Key Moments

- **K1**: K1 Plan Freeze — Locks one candidate plan before tool execution.
- **K2**: K2 Gate Verdict — Pass or fail decision for candidate patch.
- **K3**: K3 Durable Apply — Start of durable write phase.
- **K4**: K4 Commit Values — Final commit moment for durable outputs.

## 01 INPUT

| ID | Node | What It Means |
| --- | --- | --- |
| U1 | Intent | What the user wants to achieve. |
| U2 | Mode | Auto, guided, or manual run policy. |
| U3 | Panel | Main control surface for the extension. |
| U4 | Approval | User approval for guarded actions. |

## 02 PLAN

| ID | Node | What It Means |
| --- | --- | --- |
| P1 | Planner | AI planning brain. Proposes steps only. |
| P2 | Hypothesis Engine | Generates alternative rigging strategies. |
| K1 | K1 Plan Freeze | Locks one candidate plan before tool execution. |
| P3 | Lateral Trigger | Detects when ordinary retries are not enough. |
| P4 | Hands Change Request | Proposal to evolve deterministic tools safely. |

## 03 HANDS (Deterministic)

| ID | Node | What It Means |
| --- | --- | --- |
| H1 | Tool Router | Dispatches approved tool calls. |
| H2 | scanWorkspace | Reads workspace to discover riggable targets. |
| H3 | rankTargets | Ranks likely files and entry points. |
| H4 | buildRigPlan | Builds a deterministic rigging plan. |
| H5 | Canonical Patch | Single source artifact used by preview, gates, and apply. |
| H6 | Session Preview | Ephemeral preview, no durable write. |

## 04 VERIFY (Strict Gates)

| ID | Node | What It Means |
| --- | --- | --- |
| V1 | Candidate Workspace | Patch is evaluated in candidate form. |
| G1 | Policy Gate | Path allowlist, scope control, edit budgets. |
| G2 | Structural Gate | Syntax, schema, idempotency checks. |
| G3 | Quality Gate | Unit/integration/build quality checks. |
| G4 | Security Gate | Secret safety, CSP, injection protections. |
| G5 | Performance Gate | Latency and rewrite budget limits. |
| V2 | Verdict Aggregator | Combines gate outcomes into one decision. |
| K2 | K2 Gate Verdict | Pass or fail decision for candidate patch. |
| G6 | Write Authorization | Final gate before durable writes. |
| V3 | Post-Apply Verification | Sanity check after durable apply. |
| G7 | Commit Authorization | Final gate before git commit. |

## 05 TEST RUNTIME

| ID | Node | What It Means |
| --- | --- | --- |
| T1 | Unit Tests | Fast logic correctness tests. |
| T2 | Integration Tests | End-to-end extension behavior checks. |
| T3 | Build + Typecheck + Lint | Compilation and static quality checks. |
| T4 | Visual Diffs | UI drift detection against baseline. |
| T5 | Security Scans | Security-focused automated checks. |
| T6 | Perf Benchmarks | Performance baseline checks. |
| T7 | Quality Evidence | Aggregates quality signal from test outputs. |
| T8 | Security Evidence | Aggregates security signal from scans. |
| T9 | Performance Evidence | Aggregates performance signal from benchmarks. |

## 06 APPLY + COMMIT

| ID | Node | What It Means |
| --- | --- | --- |
| K3 | K3 Durable Apply | Start of durable write phase. |
| A1 | applyWorkspaceEdit | Writes approved edits to workspace. |
| A2 | Save Values Map | Persists chosen values for replayability. |
| A3 | Save rig.config.json | Persists machine-readable rig config. |
| A4 | Save rig.snapshot.json | Persists snapshot of current tuned state. |
| A5 | Git Stage | Stages durable output changes. |
| K4 | K4 Commit Values | Final commit moment for durable outputs. |
| A6 | Git Commit | Creates auditable history of accepted values. |

## 07 MEMORY + TRACE

| ID | Node | What It Means |
| --- | --- | --- |
| M1 | Session State | Current in-session tuning state. |
| M2 | Pattern Memory | Reusable successful patterns. |
| M3 | Memory Admission Gate | Only trusted runs can update pattern memory. |
| M4 | Secret Redactor | Removes secrets before trace storage. |
| M5 | Run Ledger | Redacted trace log for replay and audit. |
| M6 | Rollback Points | Known safe restore points. |

## 08 RECOVERY

| ID | Node | What It Means |
| --- | --- | --- |
| R1 | Failure Classifier | Classifies failure causes and selects recovery path. |
| R2 | Retry / Backoff | Controlled retry with cooldown. |
| R3 | Human Escalation | Requests user action for blocked flows. |

## 09 SELF-IMPROVEMENT

| ID | Node | What It Means |
| --- | --- | --- |
| X1 | Tool Backlog | Queued improvements for deterministic tools. |
| X2 | Meta Tests | Strict tests for tool/policy changes. |
| X3 | Tool/Policy Release | Controlled rollout of approved upgrades. |

