# Phakoe's Coffee Shop Express API

Express.js REST API with key-value NoSQL storage. See the root `README.md` for endpoints, storage design and deployment.

```bash
npm install
npm start        # http://localhost:4000
npm test         # 21 automated tests (storage, validation, auth, orders, CORS, persistence after restart)
```
Environment variables: see `.env.example`.

Layout: `src/routes` (HTTP), `src/services` (business rules), `src/utils` (validation, IDs, security), `src/middleware`, `src/db` (file + Redis key-value stores).
