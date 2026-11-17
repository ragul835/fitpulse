import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt";
import { HttpError } from "../lib/http";

export interface AuthRequest extends Request {
  userId?: string;
}

export function authRequired(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return next(new HttpError(401, "Authentication required."));
  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired session."));
  }
}
