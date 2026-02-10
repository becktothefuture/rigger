# Rigger Development

## Prereqs
- Node 18+
- npm

## Install
- Root deps: `npm install`
- Webview deps: `npm --prefix webview install`

## Dev Loop (No Reinstall)
1. Open this repo in Cursor/VS Code.
2. Run `npm run watch` to start:
   - `tsc -w` for the extension host
   - `vite` dev server for the webview
3. Press `F5` to launch the Extension Development Host.
4. The webview loads from `http://localhost:5173` when:
   - `RIGGER_DEV_WEBVIEW=1` env var is set, or
   - `rigger.devWebview` setting is true
5. To reload extension host changes: `Developer: Reload Window` in the dev host.

## Build
- `npm run build` builds extension + webview.

## Machine Parity (Runtime <-> Diagram)
- Source of truth: `architecture/rigger.machine.json`
- Generate synced artifacts:
  - `src/machine/machine.generated.ts`
  - `docs/architecture/rigger-system.mmd`
  - `docs/architecture/glossary.md`
- Commands:
  - `npm run machine:generate`
  - `npm run machine:check` (fails if generated files drift)

## Tests
- Unit: `npm run test`
- Integration: `npm run test:integration`

## Notes
- Tailwind/PostCSS configs are CommonJS due to ESM webview: `webview/tailwind.config.cjs`, `webview/postcss.config.cjs`.

## Diagnostics
- OutputChannel: “Rigger”
- Webview logs forwarded via `postMessage` (type: `log`)

## OpenAI Settings (Temporary)
- Workspace defaults are in `.vscode/settings.json`:
  - `rigger.ai.provider`
  - `rigger.ai.model`
  - `rigger.ai.baseUrl`
- Set your API key in **User Settings** (recommended) or `OPENAI_API_KEY`.
- Temporary fallback is `rigger.ai.apiKey`, but avoid committing secrets to the repo.
