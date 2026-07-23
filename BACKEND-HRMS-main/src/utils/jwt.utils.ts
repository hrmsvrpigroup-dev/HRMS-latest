import jwt, { Secret, SignOptions } from 'jsonwebtoken'

type JwtPayload = {
  userId: string
  role: string
  tenantId: string | null
  email: string
}

const parseExpiresIn = (raw: string | undefined, fallback: string): SignOptions['expiresIn'] => {
  return (raw ?? fallback) as SignOptions['expiresIn']
}

export const generateAccessToken = (payload: JwtPayload) => {
  const secret = process.env.JWT_SECRET as Secret
  const expiresIn = parseExpiresIn(process.env.JWT_EXPIRES_IN, '15m')
  return jwt.sign(payload, secret, { expiresIn })
}

export const generateRefreshToken = (payload: JwtPayload) => {
  const secret = process.env.JWT_REFRESH_SECRET as Secret
  const expiresIn = parseExpiresIn(process.env.JWT_REFRESH_EXPIRES_IN, '7d')
  return jwt.sign(payload, secret, { expiresIn })
}

export const verifyRefreshToken = (token: string): JwtPayload => {
  const secret = process.env.JWT_REFRESH_SECRET
  if (!secret) throw new Error('JWT_REFRESH_SECRET not configured')
  return jwt.verify(token, secret) as JwtPayload
}

