import jwt, { SignOptions } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'z4rum_secret_dev';

export type JwtPayload = { id: string };
const JWT_SECRET: Secret = process.env.JWT_SECRET ?? "z4rum_secret_dev";

export function signToken(payload: JwtPayload, expiresIn: SignOptions["expiresIn"] = "7d") {
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken(token: string): JwtPayload {
  // Throw error instead of returning null to be caught by try/catch blocks
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) {
    return res
      .status(401)
      .json({ error: 'Bạn phải đăng nhập để truy cập' });
  }

  try {
    const decoded = verifyToken(token);
    (req as any).userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
  }
}
