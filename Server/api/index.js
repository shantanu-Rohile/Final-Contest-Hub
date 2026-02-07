// Vercel Serverless entrypoint (REST only).
// NOTE: Vercel serverless functions do NOT support long-lived WebSockets,
// so socket.io real-time features will not work if you deploy the backend on Vercel.

import app from "../serverlessApp.js";

export default app;
