import { Request, Response, NextFunction } from 'express';
import { usersCollection } from '../../config/db';
import { verifyJwtToken, standardizeRole } from './auth.utils';
import { TJwtPayload } from './auth.interface';

export interface AuthedUser {
  id: string;
  email: string;
  role: string;
  name?: string;
}

// Extend Express Request interface to include authedUser & user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TJwtPayload;
      authedUser?: AuthedUser;
    }
  }
}

/**
 * Universal JWT Verification Middleware
 * 
 * 1. Checks Authorization header: 'Bearer <token>' or 'x-auth-token'
 * 2. Verifies and decodes JWT token
 * 3. Falls back smoothly to legacy identity headers (x-user-id / x-user-email) to avoid breaking any ongoing workflows
 * 4. Attaches user info to req.user and req.authedUser
 */
export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'] || req.headers['x-auth-token'];
    const emailHeader = req.headers['x-user-email'] as string;
    const userIdHeader = req.headers['x-user-id'] as string;

    let token = '';
    if (typeof authHeader === 'string') {
      token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
    }

    // 1. Try JWT verification if token is provided
    if (token) {
      const decoded = verifyJwtToken(token);
      if (decoded && decoded.email) {
        req.user = decoded;
        req.authedUser = {
          id: String(decoded.id || decoded.userId || ''),
          email: decoded.email,
          role: standardizeRole(decoded.role),
          name: decoded.name,
        };
        next();
        return;
      }

      // If token was provided but invalid/expired:
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token. Please log in again.',
      });
      return;
    }

    // 2. Fallback to legacy identity headers if no token was attached
    if (emailHeader || userIdHeader) {
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

        req.user = {
          id: resolvedId,
          userId: resolvedId,
          email: resolvedEmail,
          role: userRole,
          name: resolvedName,
        };
        req.authedUser = {
          id: resolvedId,
          email: resolvedEmail,
          role: userRole,
          name: resolvedName,
        };
        next();
        return;
      }
    }

    // 3. Neither valid token nor valid user header found
    res.status(401).json({
      success: false,
      message: 'Authentication token is required. Please provide a valid Bearer token.',
    });
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: error?.message || 'Authentication error',
    });
  }
};

/**
 * Role-Based Access Control Middleware Generator
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = (req.authedUser?.role || req.user?.role || 'Customer').toLowerCase();
    const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());

    const isAuthorized = normalizedAllowed.some((role) => {
      if (role === 'admin' && userRole.includes('admin')) return true;
      if (
        (role === 'restaurant' || role === 'restaurant partner') &&
        (userRole.includes('restaurant') || userRole.includes('admin'))
      ) {
        return true;
      }
      if (
        (role === 'rider' || role === 'delivery partner') &&
        (userRole.includes('rider') || userRole.includes('delivery') || userRole.includes('admin'))
      ) {
        return true;
      }
      if (role === 'customer' && (userRole.includes('customer') || userRole.includes('admin'))) {
        return true;
      }
      return userRole === role;
    });

    if (!isAuthorized) {
      res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted. Required role: ${allowedRoles.join(' or ')}.`,
      });
      return;
    }

    next();
  };
};

export const requireAdmin = [verifyToken, requireRole('admin')];
export const requireRestaurant = [verifyToken, requireRole('Restaurant Partner', 'admin')];
export const requireRider = [verifyToken, requireRole('Delivery Partner', 'admin')];
export const requireCustomerRole = [verifyToken, requireRole('Customer', 'admin')];
