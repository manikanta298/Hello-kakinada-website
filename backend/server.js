// Entry shim for Hostinger: it expects server.js in the app root,
// while the compiled server lives in dist/server.js (created by `npm run build`).
import "./dist/server.js";
