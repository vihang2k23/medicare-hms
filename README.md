# MediCare HMS



## JSON Server (patient API)

Patient registration/list uses **[JSON Server](https://github.com/typicode/json-server)** against `server/db.json`.

1. Start the mock API (port **3001**):

   ```bash
   npm run server
   ```

2. In another terminal, start the Vite app:

   ```bash
   npm run dev
   ```

Optional: set `VITE_JSON_SERVER_URL` in `.env` if the API is not at `http://localhost:3001`. REST endpoints are under **`/api/...`** on that host (e.g. `http://localhost:3001/api/patients`).

---

## Deploy on Render

The **[Blueprint](https://render.com/docs/infrastructure-as-code)** in `render.yaml` defines **one Web service** (`medicare-hms`). The build runs `npm ci && npm run build`; the start command runs `npm run server`, which serves the Vite app from `dist/` and the JSON API under **`/api`** on the **same URL**.

**Setup**

1. Push the repo and in [Render](https://dashboard.render.com) choose **New → Blueprint** (or **Web Service** with the same build/start commands as in `render.yaml`).
2. Open the service’s **public URL** — that is both the UI and the API (e.g. `https://medicare-hms.onrender.com` for the app, `https://medicare-hms.onrender.com/api/patients` for data).
3. **Do not** set `VITE_JSON_SERVER_URL` on Render for this setup; production builds use same-origin `/api/...`.

**If you still have an old two-service deploy** (separate static site + API), remove the static site and use this single-service blueprint instead, or set `VITE_JSON_SERVER_URL` to your API origin only if the UI and API stay on different hosts (REST paths must be `/api/...` on that API host).

**Notes**

- Free tier instances **spin down** when idle; the first load can be slow (cold start).
- **`server/db.json`** is on **ephemeral** disk; data resets when the instance restarts or redeploys unless you add a real database later.
- The server uses Render’s **`PORT`** and listens on **`0.0.0.0`**.

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
