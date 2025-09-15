// src/shared/errors.ts
export class AppError extends Error {
  status: number;
  code: string;
  constructor(code: string, status: number, message?: string) {
    super(message || code);
    this.code = code;
    this.status = status;
    Object.setPrototypeOf(this, AppError.prototype);
    if (Error.captureStackTrace) Error.captureStackTrace(this, AppError);
  }
}

export const notFound = (msg = 'Not found') => new AppError('not_found', 404, msg);
