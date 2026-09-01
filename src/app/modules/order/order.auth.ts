import { Request, Response, NextFunction } from 'express';
import { usersCollection } from '../../config/db';

/**
 * Standardize a user role string into a canonical label.
 * Mirrors the logic used by the cart, address and admin modules.
 */
const standardizeRole = (rawRole?: any): string => {
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

export interface AuthedUser {
  id: string;
  email: string;
  role: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authedUser?: AuthedUser;
    }
  }
}

/** Canonical role labels this module recognizes. */
const ROLE_LABELS: Record<string, string[]> = {
  admin: ['admin'],
  restaurant: ['Restaurant Partner'],
  rider: ['Delivery Partner'],
  customer: ['Customer'],
};

/**
 * Order role-guard middleware factory.
 *
 * Resolves the caller's identity from the x-user-email / x-user-id headers
 * (the codebase convention), verifies the user exists in the users collection,
 * and enforces that only the requested roles may proceed. On success it sets
 * req.authedUser for downstream handlers.
 *
 * Usage:
 *   requireRoles('restaurant', 'rider', 'admin')
 *   requireRoles('rider', 'admin')
 */
export const requireRoles =
  (...allowedKeys: string[]) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const email = (req.headers['x-user-email'] as string) || '';
      const userId = (req.headers['x-user-id'] as string) || '';

      if (!email.trim() && !userId.trim()) {
        res.status(401).json({
          success: false,
          message: 'Authentication required. Please log in to manage orders.',
        });
        return;
      }

      const user = email
        ? await usersCollection.findOne({ email })
        : await usersCollection.findOne({ _id: String(userId) as any });

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not found. Please log in to manage orders.',
        });
        return;
      }

      const role = standardizeRole((user as any).role);
      const allowedLabels = allowedKeys.flatMap((key) => ROLE_LABELS[key] || []);

      if (!allowedLabels.includes(role)) {
        res.status(403).json({
          success: false,
          message: 'You are not authorized to perform this action.',
        });
        return;
      }

      req.authedUser = {
        id: String((user as any)._id ?? userId),
        email: (user as any).email ?? email,
        role,
      };

      next();
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error?.message || 'Failed to authorize order access',
      });
    }
  };

export { standardizeRole };