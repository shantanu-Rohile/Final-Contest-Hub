# Contest Hub Backend (Render)

This backend uses **Socket.IO (WebSockets)**, so it should be deployed on a platform that supports long‑lived connections (Render / Railway / Fly).

## Deploy on Render (recommended)

1) Create a new **Web Service** on Render.
2) Pick your repo (or upload the backend folder).
3) Set these environment variables in Render:

- `MONGOURL` = your Mongo connection string
- `JWT_SECRET` = any strong secret string
- `CLIENT_ORIGIN` = your frontend URL(s)
  - example: `http://localhost:5173,https://your-frontend.vercel.app`

4) Build command: `npm install`
5) Start command: `npm start`

Render automatically provides `process.env.PORT`.
Your code uses:

```js
const PORT = process.env.PORT || 3000;
```

So locally it runs on 3000, and on Render it uses the platform port.

## Notes
- If you use Render's free plan, the service may sleep when idle; Socket.IO clients will reconnect when it wakes up.
