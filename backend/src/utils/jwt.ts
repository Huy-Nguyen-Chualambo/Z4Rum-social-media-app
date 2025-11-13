import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET ?? "z4rum_secret_dev";

export type JwtPayload = { id: string };

export function signToken(payload: JwtPayload, expiresIn: string = "7d") {
  return jwt.sign(payload, JWT_SECRET as string, { expiresIn: expiresIn as any });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET as string) as JwtPayload;
}


export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ error: "Bạn phải đăng nhập để truy cập" });
  }

  try {
    const decoded = verifyToken(token);
    (req as any).userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ error: "Token không hợp lệ hoặc đã hết hạn" });
  }
}