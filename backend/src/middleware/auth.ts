import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/auth.js";

export type AuthedRequest = Request & { userId?: string; userEmail?: string };

/** Attaches req.userId if a valid Bearer token is present; never rejects.
 *  Mirrors the client-side attachSupabaseAuth middleware's effect (it just
 *  forwards whatever session exists — anonymous requests still proceed). */
export function attachAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const claims = verifyToken(header.slice("Bearer ".length));
    if (claims) {
      req.userId = claims.sub;
      req.userEmail = claims.email;
    }
  }
  next();
}

/** Mirrors requireSupabaseAuth: rejects with 401 if there's no valid session. */
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    return res.status(401).json({ error: "Unauthorized: No valid session" });
  }
  next();
}
