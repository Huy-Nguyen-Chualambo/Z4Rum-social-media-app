import type { ErrorRequestHandler, RequestHandler } from "express";
import { Prisma } from "@prisma/client";

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found`, code: "NOT_FOUND" });
};

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({ error: "Body không phải JSON hợp lệ", code: "INVALID_JSON" });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      res.status(409).json({ error: "Dữ liệu đã tồn tại", code: "CONFLICT" });
      return;
    }
    if (error.code === "P2025") {
      res.status(404).json({ error: "Không tìm thấy dữ liệu", code: "NOT_FOUND" });
      return;
    }
  }

  console.error("Unhandled request error", error);
  res.status(500).json({ error: "Đã xảy ra lỗi máy chủ", code: "INTERNAL_ERROR" });
};
