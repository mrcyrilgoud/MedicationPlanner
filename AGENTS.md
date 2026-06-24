# AGENTS.md

## Cursor Cloud specific instructions

Medication Planner is a client-side React + Vite SPA with no backend. All inventory data is stored in the browser via IndexedDB. The app is a PWA (`vite-plugin-pwa`) and works offline after the first load.

### Available npm scripts

See `package.json` for the full list. Key commands:

- `npm run dev` — Start Vite dev server (`http://localhost:5173`)
- `npm run build` — Production build to `dist/`
- `npm run lint` — Run ESLint
- `npm run preview` — Preview the production build (`http://localhost:4173`)
- `npm test` — Run Vitest unit tests once
- `npm run test:watch` — Run Vitest in watch mode
- `npm run test:e2e` — Playwright walkthrough script (starts preview server automatically)

Run `npm test`, `npm run lint`, and `npm run build` before finishing work.

### Architecture pointers

- **State**: `src/context/InventoryContext.jsx` — business logic and mutations
- **Storage**: `src/storage/idbAdapter.js` — IndexedDB via `idb`; mutations go through `storage.applyMutation()`
- **Routing**: Hash-based in `src/App.jsx` (`#dashboard`, `#inventory`, `#/add`, etc.); see `src/utils/routeState.js`
- **Calculations**: `src/utils/calculations.js` — runout dates, inhaler unit math, batch sorting
- **Deep dive**: `ARCHITECTURE_AND_CODE.md` (some sections may lag behind recent refactors)

### Notes

- **Tests**: Vitest covers storage, calculations, import logic, and route parsing under `src/test/`. E2E walkthrough lives in `scripts/e2e-walkthrough.mjs`.
- **External API**: The app optionally calls the public NLM RxNorm API (`rxnav.nlm.nih.gov`) for drug name links. No API key is needed; the app works fully offline without it.
- **Secrets**: No `.env` or secrets are required.
- **Branches**: Use `cursor/<descriptive-name>-2a01` for cloud agent feature branches.
