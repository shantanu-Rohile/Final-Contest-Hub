// Central place to read the backend URL.
// In Vite, environment variables must start with VITE_

export const BACKEND_URL =
  (import.meta?.env?.VITE_BACKEND_URL && String(import.meta.env.VITE_BACKEND_URL)) ||
  "http://localhost:3000";
