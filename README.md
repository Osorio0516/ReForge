# PC Builder — frontend and backend

One repository containing the existing React/Vite UI at the root and the Express/MongoDB API in `backend/`. Product images remain in `public/parts/`.

## First run (Windows PowerShell)

Use Node.js 22.12+ or 24+ and a MongoDB replica set (MongoDB Atlas works). The API uses transactions, so a standalone MongoDB instance is insufficient for transactional writes.

```powershell
npm run setup
Copy-Item backend/.env.example backend/.env
```

Edit `backend/.env`: set `MONGO_URI` to your MongoDB connection string and keep `DB_NAME=pc_builder` to use your existing catalog. Do not commit credentials. Then run:

```powershell
npm run db:setup
npm run dev
```

Open http://localhost:5173. Vite forwards `/api` to http://127.0.0.1:5000. Health endpoint: http://127.0.0.1:5000/api/health.

For a new empty database, optionally run `npm run db:seed` to insert the backend's demo catalog. The provided backend does not contain the earlier real-product import script. Existing real catalog data stays in MongoDB; it is not stored in either repository.

If you already have a root `.env` with `VITE_API_URL`, set it to `/api` to use the proxy. Root `.env.example` shows optional frontend/proxy overrides. If you change the backend port, also change `API_PROXY_TARGET`.

## Build and serve together

```powershell
npm run build
npm start
```

Open http://127.0.0.1:5000. Express serves the compiled frontend and API from one port. Restart the server after building. `npm run preview` previews static files only; use `npm start` for the full application.

## Commands

- `npm run setup`: install both projects from their lockfiles.
- `npm run dev`: start both development servers; Ctrl+C stops both.
- `npm run dev:frontend` / `npm run dev:backend`: start either separately.
- `npm run db:setup`: initialize categories, rules, and indexes while preserving existing records.
- `npm run db:seed`: add the sample catalog/builds.
- `npm run build`: type-check and build the frontend.
- `npm run lint`: lint the frontend.
- `npm start`: run the backend and serve `dist/` when built.

## Preserved behavior and scope

Components load from MongoDB. Saved builds and drafts remain in browser localStorage; frontend admin edits remain in memory, and compatibility checks run in the existing frontend logic. Combining repositories does not change these existing persistence choices. The backend's CRUD endpoints are included but are not newly wired to those UI actions.

Removed the unused `useDraftReport.ts` hook because it referenced exports/store fields absent from this frontend and a preview route absent from this backend. No screen imported it.

Backend source imported from `Osorio0516/PC_Builder-Backend-` commit `5f0026d0756c122849573a03b35e5d226e59f86f`. The original backend repository is unchanged. API examples and lecture notes are in `backend/`.
