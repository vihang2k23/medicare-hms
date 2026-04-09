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

Optional: set `VITE_JSON_SERVER_URL` in `.env` if the API is not at `http://localhost:3001`.

---

## Deploy on Render

This repo includes a **[Render Blueprint](https://render.com/docs/infrastructure-as-code)** at `render.yaml` with two services:

| Service | Type | Purpose |
|--------|------|--------|
| **medicare-hms-api** | Web (Node) | `npm run server` — JSON Server + `/api/npi` proxy |
| **medicare-hms-web** | Static | Vite production build from `dist/` |

**Setup**

1. Push the repo to GitHub (or GitLab/Bitbucket) and connect it in [Render](https://dashboard.render.com).
2. Use **New → Blueprint** and select the repo (or create the two services manually using the same build/start commands as in `render.yaml`).
3. Wait until **medicare-hms-api** is deployed and copy its public URL (e.g. `https://medicare-hms-api.onrender.com`).
4. In **medicare-hms-web** → **Environment**, set **`VITE_JSON_SERVER_URL`** to that URL (**no trailing slash**). Redeploy the static site so the value is baked into the build (Vite reads this at build time, not runtime).
5. Open the static site URL in the browser.

**Notes**

- On the free tier, services **spin down** after idle time; the first request can be slow (cold start).
- **`server/db.json`** lives on **ephemeral** disk: changes are lost when the API instance restarts or redeploys. For durable data you would add a real database later.
- The API listens on **`PORT`** (set by Render) and **`0.0.0.0`** so it accepts external traffic.

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
