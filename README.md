# CampusBite – React web app (step 1)

Vite + React 18 + React Router 6 front end for the [CampusBite backend](https://github.com/stormlex4all/campusbite-backend).

> **Scope of this step: features 1, 2, 12 and 13 only**
> 1. Accounts with roles (student, vendor, admin)
> 2. Vendor store profiles
> 12. Accessible interface with clear validation
> 13. Admin panel (approve / suspend / reactivate, audit log)
>
> Listings, reservations, notifications, QR pickup and the vendor summary come in later steps.

## Run it

```bash
# 1. start the API (in ../campusbite-backend): npm run seed && npm run dev   -> http://localhost:4000
# 2. then, here:
npm install
npm run dev            # http://localhost:5173  (proxies /api to http://localhost:4000)
```

Seeded admin (from `npm run seed` in the backend): `admin@campusbite.local` / `ChangeMe123!` (change it in the backend `.env`).
`npm run seed:demo` in the backend also creates two vendors and a student (password `Password123!`).

| Script | Purpose |
|---|---|
| `npm run dev` | dev server with the API proxy |
| `npm run build` | production build into `dist/` |
| `npm run preview` | serve the build locally (also proxies `/api`) |
| `npm test` | Vitest + Testing Library (33 tests) |

### Configuration
Copy `.env.example` to `.env` if needed. Leave `VITE_API_URL` empty in development. For production either:
* serve `dist/` from the backend (set `CLIENT_BUILD_DIR=../campusbite-web/dist` in the backend `.env`; same origin, nothing else to configure), or
* host `dist/` anywhere and build with `VITE_API_URL=https://your-api/api`, adding that origin to the backend's `CORS_ORIGINS`. Also set `VITE_ASSET_URL=https://your-api` so menu photos (`/uploads/...`) load from the API.

## Screens and roles

| Route | Who | Feature |
|---|---|---|
| `/login`, `/register` | guests | 1 |
| `/account` | any signed-in user (name, change password) | 1 |
| `/stores`, `/stores/:id` | any signed-in user | 2 |
| `/my-store` | vendor (edit store profile and opening hours) | 2 |
| `/menu`, `/menu/new`, `/menu/:id` | vendor (recurring menu items; add and remove photos with descriptions; archive and restore) | recurring items |
| `/listings`, `/listings/new` | vendor (create a listing from a menu item or one-off; close and reopen) | recurring items |
| `/stores/:id` also shows **Available now** (live listings with photos) | any signed-in user | recurring items |
| `/admin/users`, `/admin/users/:id` | admin (filter, approve, suspend, reactivate) | 13 |
| `/admin/vendors/new` | admin (provision vendor) | 13 |
| `/admin/audit` | admin (audit log) | 13 |

Route guards (`src/auth/RouteGuards.jsx`) send anonymous users to sign-in (and back afterwards) and send users without the right role to their own home page. The server enforces the same rules.

## Project structure

```
src/
  api/        axios.js (the shared `api` instance and its interceptors), session.js (token renewal), endpoints (one function per API call, each calling `api.get/post/patch/delete`), ApiError + ApiErrorFactory (Factory)
  auth/       tokenStore (Singleton + Observer), AuthContext, RouteGuards
  components/ Layout, fields (TextField...), FormErrorSummary, Modal, Button, Alert, Pagination, ...
  features/   auth/, vendors/, admin/   (screens grouped by feature)
  hooks/      useForm, useAsync, useDebounce, useDocumentTitle
  validation/ client-side rules (mirror the server)
  pages/      HomePage, NotFoundPage
  styles/     global.css (design tokens, focus, dark mode, reduced motion)
  test/       Vitest suites + fetch mock
```

### Patterns used
* **Singleton** – `TokenStore` (the session tokens).
* **Observer** – `TokenStore.subscribe()`; `AuthContext` listens, so an ended session anywhere returns the user to sign-in.
* **Factory** – `ApiErrorFactory` turns every failure (error envelope, network down, odd response) into one `ApiError` with `code`, `message` and field `details`.

### HTTP layer (one shared axios instance)
`src/api/axios.js` creates ONE `api = axios.create({ baseURL, timeout })` and adds the interceptors once, so no endpoint repeats them. Every function in `endpoints.js` is just `api.get('/vendors', { params })`, `api.post(...)`, and so on; screens never import axios.

* **Request interceptor:** adds the Bearer token, first renewing it if it has expired or will within 30 s (concurrent calls share one renewal).
* **Response interceptor (success):** unwraps the `{success, data, meta}` envelope, so calls resolve to `{ data, meta }`.
* **Response interceptor (error):** on a `401` for a signed-in call it renews the session and retries the call **once**; if it is still rejected the session is ended. Everything else becomes an `ApiError`.
* Public calls pass `{ skipAuth: true }` (sign in, register, options): no token is sent and a 401 just means wrong credentials.
* The refresh call uses bare `axios` in `session.js` so the interceptors cannot call themselves.

In tests, `src/test/mockApi.js` installs a fake adapter on both axios and `api`, so the real interceptors still run.

### Sessions
The access token (15 min) lives in memory; the refresh token is in `localStorage` so a reload restores the session. The request interceptor renews an expired token before sending, and the error interceptor renews and retries once if the server still answers 401. A definite refresh rejection (400/401/403) ends the session; a rate limit (429), server error (5xx) or network failure does not.

## Accessibility and validation (feature 12)

* Every control has a visible label; hints and errors are linked with `aria-describedby`; invalid fields get `aria-invalid`. Errors use text and an icon, never colour alone.
* After a failed submit an **error summary** takes focus, lists every problem, and each item jumps to its field. Focus is moved once per attempt and never pulled out of an input while typing.
* Client rules give instant feedback, but the **server is the authority**: its field errors (`details[].field`) are mapped back onto the same inputs, and non-field errors (wrong password, suspended account) appear in the summary.
* Skip link, one `<h1>` per page that receives focus on navigation, an `aria-live` route announcer, `<table>` markup with headers/captions, accessible modal (focus trap, Esc, focus return), 44px touch targets, visible focus ring, dark mode, `prefers-reduced-motion`, forced-colors support, responsive down to 375px.
