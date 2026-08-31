import { Request, Response, NextFunction } from 'express';
import { usersCollection } from '../../config/db';

/**
 * Standardize a user role string into a canonical label.
 * Mirrors the logic used by the admin module.
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

/**
 * Attach the authenticated user to the request (so callers can read req.authedUser).
 */
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

/**
 * Cart auth middleware.
 *
 * Resolves the caller's identity from the x-user-email / x-user-id headers
 * (the codebase convention), verifies the user exists, and enforces that only
 * accounts with the 'customer' role may access the cart. Requests from any
 * other role (admin, restaurant, rider) are rejected with 403.
 *
 * On success it sets req.authedUser.id as the authoritative userId and
 * overwrites the (spoofable) :userId URL param so a caller cannot read/write
 * another user's cart.
 */
export const requireCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const email = (req.headers['x-user-email'] as string) || '';
    const userId = (req.headers['x-user-id'] as string) || '';

    if (!email.trim() && !userId.trim()) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in to access your cart.',
      });
      return;
    }

    const user = email
      ? await usersCollection.findOne({ email })
      : await usersCollection.findOne({ _id: String(userId) as any });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found. Please log in to access your cart.',
      });
      return;
    }

    const role = standardizeRole((user as any).role);

    if (role.toLowerCase() !== 'customer') {
      res.status(403).json({
        success: false,
        message: 'Only customer accounts can access the cart.',
      });
      return;
    }

    req.authedUser = {
      id: String((user as any)._id ?? userId),
      email: (user as any).email ?? email,
      role,
    };

    // Ignore any caller-supplied :userId param; always use the authenticated id.
    req.params.userId = req.authedUser.id;

    next();
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to authorize cart access',
    });
  }
};
