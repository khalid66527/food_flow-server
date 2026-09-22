import jwt, { SignOptions } from 'jsonwebtoken';
import { TJwtPayload } from './auth.interface';

const JWT_SECRET = process.env.JWT_SECRET || process.env.BETTER_AUTH_SECRET || '';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];

/**
 * Standardize user role
 */
export const standardizeRole = (rawRole?: any): string => {
  if (!rawRole || typeof rawRole !== 'string') return 'Customer';
  const trimmed = rawRole.trim();
  if (/^(admin|super-admin|super_admin)/i.test(trimmed)) return 'admin';
  if (/^(restaurant|restaurant partner|restaurant_partner|vendor)/i.test(trimmed)) {
    return 'Restaurant Partner';
  }
  if (/^(rider|delivery partner|delivery_partner|delivery|driver)/i.test(trimmed)) {
    return 'Delivery Partner';
  }
  if (/^(customer|user|client)/i.test(trimmed)) return 'Customer';
  return trimmed;
};

/**
 * Generate a JWT token for a given user payload
 */
export const signJwtToken = (payload: Partial<TJwtPayload>): string => {
  const cleanPayload: TJwtPayload = {
    id: String(payload.id || payload.userId || ''),
    userId: String(payload.userId || payload.id || ''),
    email: String(payload.email || '').trim().toLowerCase(),
    role: standardizeRole(payload.role),
    name: payload.name || '',
    phone: payload.phone || '',
  };

  return jwt.sign(cleanPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

/**
 * Verify and decode a JWT token string
 */
export const verifyJwtToken = (token: string): TJwtPayload | null => {
  try {
    if (!token) return null;
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    const decoded = jwt.verify(cleanToken, JWT_SECRET) as TJwtPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};
