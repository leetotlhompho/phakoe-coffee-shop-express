# Phakoe's Coffee Shop Express

A full-stack coffee shop website: customers browse the menu, fill a cart and place an order for pickup;
staff manage the menu and move orders through their stages; the administrator manages staff accounts.

## Project links

| | Link |
|---|---|
| GitHub repository | https://github.com/leetotlhompho/phakoe-coffee-shop-express |
| Deployed frontend (React, Vercel / Netlify) | https://phakoe-coffee-shop-express.vercel.app |
| Deployed backend API (Express, Render) | https://phakoe-coffee-shop-express-api.onrender.com  (health check: https://phakoe-coffee-shop-express-api.onrender.com/api/health) |

```
React (Vercel / Netlify)  --fetch-->  Express.js REST API (Render)  -->  Key-value NoSQL database (Redis)
        /frontend                              /backend                          (Redis Cloud)
```

## Technologies

| Layer | Technology | Hosting |
|---|---|---|
| Frontend | React 18, Vite, React Router, lucide-react icons, plain CSS | Vercel or Netlify |
| Backend | Node.js, Express.js (REST API), scrypt password hashing, signed bearer tokens (HS256) | Render |
| Database | Key-value NoSQL: **Redis** (Redis Cloud) via `ioredis`; a JSON-file key-value store is used for local development | Redis Cloud |
| Tests | Node's built-in test runner (`node --test`) | - |

## Default login (administrator)

Use this account to open the staff dashboard at `/staff` (live site: https://phakoe-coffee-shop-express.vercel.app/staff):

| | |
|---|---|
| Email | `admin@brewhaven.local` |
| Password | `1234567890` |

After signing in, the dashboard shows a reminder, and the **Change password** tab lets the administrator replace this
starting password. On the live site this account is created from the `ADMIN_EMAIL` and `ADMIN_PASSWORD` settings on Render.

## Features

**Customers**
- Menu with categories, photos, prices and availability
- Shopping cart and an order form (name, notes); the order is priced by the server
- Order tracking with the order number and name

**Staff / administrator**
- Sign in to the staff dashboard
- Orders list with status updates: `Pending -> Preparing -> Ready -> Collected`
- Add, edit, hide (availability) and delete menu items, with photos chosen from the device
- Change your own password (the first administrator is reminded to replace the starting password)
- Administrator only: create and remove staff accounts

## Folder structure

| Folder | What it is |
|---|---|
| `frontend/` | React + Vite website (customer pages and staff dashboard) |
| `backend/` | Express REST API, validation, authentication, storage layer, automated tests |
| `images/` | Optional menu photos kept in the project (see "Menu photos") |
| `render.yaml` | Render blueprint that creates the API service |

## Installation (run it on your computer)

Requirements: Node.js 18.17 or newer and npm.

**1. Get the code**
```bash
git clone https://github.com/leetotlhompho/phakoe-coffee-shop-express.git
cd phakoe-coffee-shop-express
```

**2. Start the API (terminal 1)**
```bash
cd backend
npm install
cp .env.example .env      # optional; development defaults exist
npm start                 # http://localhost:4000   (npm run dev reloads on changes)
```

**3. Start the website (terminal 2)**
```bash
cd frontend
cp .env.example .env      # VITE_API_URL=http://localhost:4000
npm install
npm run dev               # http://localhost:5173
```

**4. Sign in** at `/staff` with the development administrator `admin@brewhaven.local` / `1234567890`
(created automatically on first start; the sample menu is loaded once at the same time).

**5. Run the tests**
```bash
cd backend
npm test
```

### Environment variables (backend)

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `production` on Render |
| `PORT` | Port the API listens on (Render sets it) |
| `JWT_SECRET` | Long random string (32+ characters). Required in production |
| `TOKEN_TTL_HOURS` | How long a sign-in lasts (default 8) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | First administrator, created when no admin exists. Required in production |
| `ALLOWED_ORIGINS` | Website address(es) allowed to call the API, comma separated; `https://*.vercel.app` wildcards work |
| `REDIS_URL` | `rediss://...` address of the Redis database. When set, it replaces the file store |
| `DATA_FILE` | Path of the JSON file store used when `REDIS_URL` is not set (local development) |

Frontend: `VITE_API_URL` = address of the API (`http://localhost:4000` locally, your Render URL when deployed).

## Data storage (key-value NoSQL)

Every record is a JSON value stored under a unique key:

| Key | Value |
|---|---|
| `menu:<id>` | one menu item (`name`, `category`, `description`, `price`, `image`, `badge`, `available`) |
| `order:<id>` | one order (customer name, notes, items with quantity and price, total, status, timestamps) |
| `user:<id>` | one staff account (name, email, role, salted password hash) |
| `email:<address>` | lookup from an email address to its user |

- **Unique keys:** menu items and users get a random UUID. Orders get a short readable number such as `BH-7K3M9Q`, created with an atomic "only if the key does not exist" write, so two orders can never share a number.
- **Persistence:** with `REDIS_URL` set, all data lives in Redis (Redis Cloud), outside the web server, so it survives restarts and redeploys. Without it, the API falls back to a JSON file (development only; Render's free disk is wiped on restart).

## REST API

All responses are JSON. Errors always look like `{ "error": { "code", "message", "details"? } }`.
"Staff" means a signed-in staff member or administrator; send the token as `Authorization: Bearer <token>`.

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/api/health` | API and database check | public |
| GET | `/api/menu` | all menu items | public |
| GET | `/api/menu/:id` | one menu item | public |
| POST | `/api/menu` | add a menu item (201) | staff |
| PUT | `/api/menu/:id` | update name, price, description, category, photo, availability (partial updates allowed) | staff |
| DELETE | `/api/menu/:id` | delete a menu item (204) | staff |
| GET | `/api/orders` | all orders, newest first (`?status=Pending`) | staff |
| GET | `/api/orders/:id` | one order. Customers add `?customerName=<name on the order>` | public with name, or staff |
| POST | `/api/orders` | place an order (201) | public |
| PATCH | `/api/orders/:id/status` | set status: `Pending`, `Preparing`, `Ready`, `Collected` | staff |
| POST | `/api/auth/login` | email + password, returns a token | public |
| GET | `/api/auth/me` | the signed-in user | staff |
| POST | `/api/auth/change-password` | `{ currentPassword, newPassword }`, returns a fresh token | staff |
| GET | `/api/staff` | list staff accounts | admin |
| POST | `/api/staff` | create a staff account | admin |
| DELETE | `/api/staff/:id` | remove a staff account | admin |

**Example: place an order**
```http
POST /api/orders
{ "customerName": "Thabo", "notes": "No sugar", "items": [ { "id": "menu_abc123", "quantity": 2 } ] }
```
The server ignores any price sent by the browser: it prices every order from the stored menu and rejects unknown or unavailable items.

**Example: update an order status**
```http
PATCH /api/orders/BH-7K3M9Q/status
Authorization: Bearer <token>
{ "status": "Preparing" }
```

Status codes used: 200, 201, 204, 400 (validation or bad JSON), 401 (not signed in), 403 (wrong role), 404, 409 (duplicate email, unavailable items), 413 (body too large), 429 (too many attempts), 500.

### Validation and security
- The server checks names, descriptions, categories (`Coffee`, `Tea`, `Cold Drinks`, `Pastries`, `Food`, `Other`), prices (more than 0, two decimals), photos, availability, quantities (1-99), emails and password length (8-100).
- Passwords are stored as salted `scrypt` hashes. Sign-in returns a signed, expiring token. Changing a password signs out every older session.
- Roles are read from the database on every request, so removing a staff member locks them out at once.
- Login, password-change and order submissions are rate limited. CORS only allows `ALLOWED_ORIGINS`. Request bodies are capped at 1 MB.

## Menu photos

A menu item's `image` can be:
1. **A photo from your device** - in the staff dashboard use *Choose photo from device*. The browser shrinks it and it is saved with the item (JPG, PNG or WEBP, about 500 KB at most).
2. **A file in the project** - put it in `images/` (for example `images/water.jpg`) and set `"image": "images/water.jpg"`. If the frontend is deployed with root directory `frontend`, also copy the photos into `frontend/public/images/`.
3. **A web address** (`https://...`) - older items keep working.

## Deployment

1. **Database (Redis Cloud):** create a free Redis database at https://redis.io/try-free. On the database's *Connect* panel, copy the connection address, which looks like `redis://default:PASSWORD@HOST:PORT` (Upstash is an alternative; its address starts with `rediss://`).
2. **API (Render):** *New > Blueprint* and choose the repository (it reads `render.yaml`), or create a Web Service with root directory `backend`, build command `npm install`, start command `npm start`. Set `NODE_ENV=production`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `REDIS_URL` and `ALLOWED_ORIGINS`. Check `https://<your-api>.onrender.com/api/health`.
3. **Website (Vercel or Netlify):** root/base directory `frontend`, build command `npm run build`, output directory `dist`, environment variable `VITE_API_URL=https://<your-api>.onrender.com`. (`vercel.json` and `public/_redirects` make page refreshes work.)
4. Put the website's final address into `ALLOWED_ORIGINS` on Render (no trailing `/`) so the API accepts it. Redeploy the website whenever `VITE_API_URL` changes, because it is built into the site.

Live deployment: frontend on Vercel, API on Render, data in Redis Cloud (`REDIS_URL`).

Notes: Render's free web service sleeps after about 15 minutes without visitors, so the first request afterwards can take about a minute. Render's own free Key Value instance is memory-only and loses its data on restart, so use an external Redis such as Redis Cloud or Upstash (or a paid Render Key Value instance) for persistence.

## Limits

- One API instance is assumed (the rate limiter lives in that process).
- The sign-in token is kept in the browser tab's `sessionStorage`; a larger production site would add HTTPS-only cookies, password reset by email and audit logs.
- The customer "login" for tracking (name + order number) is a lookup key, not a secret.
