import jwt, { SignOptions } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'z4rum_secret_dev';

export type JwtPayload = { id: string };

export function signToken(payload: JwtPayload, expiresIn = '7d') {
  // Sửa lỗi: Khai báo tường minh kiểu của đối tượng options là SignOptions
  // để TypeScript không bị nhầm lẫn.
  const options: SignOptions = {
    expiresIn,
  };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    // Trả về null nếu token không hợp lệ thay vì throw lỗi
    return null;
  }
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

  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
  }

  (req as any).userId = decoded.id;
  next();
}