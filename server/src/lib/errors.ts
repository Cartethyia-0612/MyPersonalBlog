export interface ErrorDetails {
  [key: string]: unknown
}

export class AppError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: ErrorDetails

  constructor(status: number, code: string, message: string, details?: ErrorDetails) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}
