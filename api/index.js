// Vercel serverless entry point.
// On Vercel the whole Express app is exported as a single function; Vercel
// routes /api/* here and serves the built client (dist/) as static files,
// with a SPA fallback (see vercel.json). Locally, `npm start` runs server.js
// directly instead, which also binds the port.
import app from "../server.js";

export default app;
