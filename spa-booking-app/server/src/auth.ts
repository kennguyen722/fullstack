import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { config } from "./config.js";
import { Request, Response, NextFunction } from "express";

export interface AuthRequest extends Request {
  user?: { id: number; role: string; email: string; name: string };
}

export function sign(payload: any) {
  // Ensure the secret and options match the types expected by jsonwebtoken's overloads
  const secret: Secret = config.jwtSecret as unknown as Secret;
  const options: SignOptions = { expiresIn: config.jwtExpiresIn } as SignOptions;
  return jwt.sign(payload, secret, options);
}

export function authRequired(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const token = header.slice(7);
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    req.user = decoded;
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}
