import { NextFunction, Request, Response } from 'express'

type ApiError = Error & {
  statusCode?: number
}

export const notFoundHandler = (_req: Request, res: Response) => {
  return res.status(404).json({ success: false, message: 'Route not found' })
}

export const errorHandler = (
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = err.statusCode ?? 500
  const message = statusCode === 500 ? 'Internal server error' : err.message

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error(err)
  }

  return res.status(statusCode).json({ success: false, message })
}

