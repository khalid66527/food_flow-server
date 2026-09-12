import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { usersCollection } from '../config/db';
import { TJwtPayload } from '../modules/auth/auth.interface';

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.BETTER_AUTH_SECRET ||
  'Ermde6JRPK1BwSjUnCI4H7gBKmTdq6WU';

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

// Global Request augmentation
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TJwtPayload;
      authedUser?: {
        id: string;
        email: string;
        role: string;
        name?: string;
      };
    }
  }
}

/**
 * Main Auth Middleware
 * Usage: 
 *   router.get('/route', auth(), controller) // Any logged in user
 *   router.get('/admin-route', auth('admin'), controller) // Admin only
 *   router.get('/vendor-route', auth('Restaurant Partner', 'admin'), controller)
 */
export const auth = (...requiredRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization || req.headers['x-auth-token'];
      const emailHeader = req.headers['x-user-email'] as string;
      const userIdHeader = req.headers['x-user-id'] as string;

      let token: string | undefined;
      if (typeof authHeader === 'string') {
        token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
      }

      let decodedUser: TJwtPayload | null = null;

      // 1. Verify JWT token if present
      if (token) {
        try {
          const verified = jwt.verify(token, JWT_SECRET) as JwtPayload;
          if (verified && verified.email) {
            decodedUser = {
              id: String(verified.id || verified.userId || ''),
              userId: String(verified.userId || verified.id || ''),
              email: String(verified.email).trim().toLowerCase(),
              role: standardizeRole(verified.role),
              name: verified.name || 'User',
              phone: verified.phone || '',
            };
          }
        } catch (jwtErr: any) {
          res.status(401).json({
            success: false,
            message: 'Invalid or expired token. Please log in again.',
          });
          return;
        }
      }

      // 2. Fallback to user email/id headers if no token was attached
      if (!decodedUser && (emailHeader || userIdHeader)) {
        const email = emailHeader?.trim().toLowerCase();
        const userId = userIdHeader?.trim();

        const userDoc = email
          ? await usersCollection.findOne({ email })
          : await usersCollection.findOne({ _id: String(userId) as any });

        if (userDoc) {
          const userRole = standardizeRole((userDoc as any).role);
          const resolvedId = String((userDoc as any)._id || userId);
          const resolvedEmail = (userDoc as any).email || email;
          const resolvedName = (userDoc as any).name || 'User';

          decodedUser = {
            id: resolvedId,
            userId: resolvedId,
            email: resolvedEmail,
            role: userRole,
            name: resolvedName,
          };
        }
      }

      // 3. If no authenticated user found
      if (!decodedUser) {
        res.status(401).json({
          success: false,
          message: 'You are not authorized! Authentication token is required.',
        });
        return;
      }

      // 4. Attach user data to request object
      req.user = decodedUser;
      req.authedUser = {
        id: decodedUser.id,
        email: decodedUser.email,
        role: decodedUser.role || 'Customer',
        name: decodedUser.name,
      };

      // 5. Check role authorization if requiredRoles are specified
      if (requiredRoles.length > 0) {
        const userRole = (decodedUser.role || 'Customer').toLowerCase();
        const normalizedRequired = requiredRoles.map((r) => r.toLowerCase());

        const isAuthorized = normalizedRequired.some((requiredRole) => {
          if (requiredRole === 'admin' && userRole.includes('admin')) return true;
          if (
            (requiredRole === 'restaurant' || requiredRole === 'restaurant partner') &&
            (userRole.includes('restaurant') || userRole.includes('admin'))
          ) {
            return true;
          }
          if (
            (requiredRole === 'rider' || requiredRole === 'delivery partner') &&
            (userRole.includes('rider') || userRole.includes('delivery') || userRole.includes('admin'))
          ) {
            return true;
          }
          if (requiredRole === 'customer' && (userRole.includes('customer') || userRole.includes('admin'))) {
            return true;
          }
          return userRole === requiredRole;
        });

        if (!isAuthorized) {
          res.status(403).json({
            success: false,
            message: `Forbidden: You do not have permission to access this route. Required role: ${requiredRoles.join(' or ')}.`,
          });
          return;
        }
      }

      next();
    } catch (error: any) {
      console.error('Middleware auth error:', error);
      res.status(500).json({
        success: false,
        message: error?.message || 'Internal Server Error during authorization.',
      });
    }
  };
};

export default auth;
