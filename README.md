# Phakoe's Coffee Shop Express - full stack

```
React (Vercel / Netlify)  --fetch-->  Express.js REST API (Render)  -->  Key-value NoSQL database
        /frontend                              /backend                   (Redis, or a JSON key-value file)
```

## What is in the box
| Folder | What it is |
|---|---|
| `frontend/` | React + Vite website: customer menu/cart/order tracking and the staff/admin dashboard |
| `backend/`  | Express REST API, validation, authentication, key-value storage, automated tests |
| `render.yaml` | Render blueprint for the API |

## Run it locally
**Terminal 1 - API**
```bash
cd backend
npm install
cp .env.example .env     # optional; sensible development defaults exist
npm start                # http://localhost:4000  (npm run dev reloads on changes)
```
**Terminal 2 - website**
```bash
cd frontend
cp .env.example .env     # VITE_API_URL=http://localhost:4000
npm install
npm run dev              # http://localhost:5173
```
Development admin login: `admin@brewhaven.local` / `Admin123!` (created automatically on first start).
Staff accounts are created by the administrator in the dashboard (Staff accounts tab).

Run the API tests: `cd backend && npm test`

## Data storage (requirement C)
* **Key-value NoSQL**: every record is a JSON document stored under a key - `menu:<id>`, `order:<id>`, `user:<id>`, `email:<address>`.
* **Unique IDs**: menu items and users get a random UUID (`menu_...`, `user_...`). Orders get a short readable number such as
  `BH-7K3M9Q`, generated from a random alphabet without confusing characters and created with an atomic "only if the key does not exist"
  write, so two orders can never share a number.
* **Persistence across restarts**: two interchangeable back ends behind one interface (`backend/src/db`):
  1. **Redis** (set `REDIS_URL`, e.g. free Upstash) - data lives outside the web server. *Recommended on Render's free plan.*
  2. **File store** (default, `DATA_FILE`) - memory plus an atomically written JSON file. On Render this survives restarts only
     with a paid **persistent disk** (the free plan's disk is wiped).
* The first start loads a sample menu once and creates the first administrator from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## REST API
All responses are JSON. Errors always look like `{ "error": { "code", "message", "details"? } }`.

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/api/health` | API + database check | public |
| GET | `/api/menu` | all menu items | public |
| GET | `/api/menu/:id` | one menu item | public |
| POST | `/api/menu` | add item (201) | staff / admin |
| PUT | `/api/menu/:id` | update name, price, description, category, photo, availability (partial updates allowed) | staff / admin |
| DELETE | `/api/menu/:id` | delete item (204) | staff / admin |
| GET | `/api/orders` | all orders, newest first (`?status=Pending`) | staff / admin |
| GET | `/api/orders/:id` | one order. Customers must add `?customerName=<name on the order>` | public with name, or staff |
| POST | `/api/orders` | place an order (201) | public |
| PATCH | `/api/orders/:id/status` | `Pending`, `Preparing`, `Ready`, `Collected` | staff / admin |
| POST | `/api/auth/login` | email + password -> token | public |
| GET | `/api/auth/me` | current user | staff / admin |
| GET / POST / DELETE | `/api/staff`, `/api/staff/:id` | list, create, remove staff accounts | admin only |

Status codes used: 200, 201, 204, 400 (validation / bad JSON), 401 (not signed in), 403 (wrong role), 404, 409 (duplicate email,
unavailable items), 413 (body too large), 429 (too many attempts), 500.

**Validation**: names, descriptions, categories, prices (>0, 2 decimals), photo URLs (http/https or empty), availability (boolean),
quantities (1-99), emails and password length are all checked on the server. The server ignores prices sent by the browser - it prices
every order from the stored menu and rejects unavailable or unknown items.

**Security**: passwords are stored as salted `scrypt` hashes; sign-in returns a signed, expiring bearer token (HS256);
roles are read from the database on every request, so removing a staff member locks them out immediately; login attempts and order
submissions are rate limited; CORS only allows `ALLOWED_ORIGINS`; request bodies are capped at 20 KB.

## Deploy
1. **Database (free)**: create a free Redis at https://upstash.com and copy its `rediss://...` URL.
2. **API on Render**: New > Blueprint (uses `render.yaml`) or a Web Service with root directory `backend`, build `npm install`, start `npm start`.
   Environment variables: `NODE_ENV=production`, `JWT_SECRET` (32+ random characters), `ADMIN_EMAIL`, `ADMIN_PASSWORD`
   (8+ characters), `REDIS_URL`, `ALLOWED_ORIGINS` (your site URL; wildcards such as `https://*.vercel.app` work).
   Check `https://<your-api>.onrender.com/api/health`. The free plan sleeps when idle, so the first request can take about a minute.
3. **Website on Vercel or Netlify**: root directory `frontend`, build `npm run build`, output `dist`, environment variable
   `VITE_API_URL=https://<your-api>.onrender.com`. (`vercel.json` and `public/_redirects` already make page refreshes work.)
4. Put the website's final URL into `ALLOWED_ORIGINS` on Render and redeploy.

## Honest limits
* One API instance is assumed (the file store and rate limiter live in that process).
* The token is kept in the browser tab's `sessionStorage`; a real production site would add HTTPS-only cookies, password reset and audit logs.
* The customer "login" (name + order number) is a lookup key, not a secret; anyone who knows both can see that order.
