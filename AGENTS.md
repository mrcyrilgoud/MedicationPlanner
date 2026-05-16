# AGENTS.md

## Cursor Cloud specific instructions

This is a client-side React + Vite SPA (Medication Planner). There is no backend server, database, or Docker infrastructure. All data is stored in the browser via IndexedDB.

### Available npm scripts

See `package.json` for the full list. Key commands:

- `npm run dev` — Start Vite dev server (serves at `http://localhost:5173`)
- `npm run build` — Production build to `dist/`
- `npm run lint` — Run ESLint
- `npm run preview` — Preview the production build

### Notes

- No test framework is configured. There are no automated tests.
- The app optionally calls the public NLM RxNorm API (`rxnav.nlm.nih.gov`) for drug name resolution. No API key is needed; the app works fully offline without it.
- No `.env` or secrets are required.
