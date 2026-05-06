import jwt from 'jsonwebtoken';
const SECRET = process.env.JWT_SECRET || 'dev-secret';
export function signToken(userId: string) { return jwt.sign({ userId }, SECRET, { expiresIn: '7d' }); }
