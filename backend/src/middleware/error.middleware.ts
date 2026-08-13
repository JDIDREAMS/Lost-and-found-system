import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error("❌ Unhandled Application Error:", err);

  const message = err instanceof Error ? err.message : "Internal Server Error";
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    error: message,
    timestamp: new Date().toISOString(),
  });
}
