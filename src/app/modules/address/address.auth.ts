import { Request, Response, NextFunction } from 'express';
import { usersCollection } from '../../config/db';
import { verifyJwtToken, standardizeRole } from '../auth/auth.utils';

/**
 * Address auth middleware.
 *
 * Resolves caller identity from Authorization Bearer JWT token or x-user-email / x-user-id headers,
 * verifies the user exists, and enforces customer role.
 */
export const requireCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'] || req.headers['x-auth-token'];
    const emailHeader = (req.headers['x-user-email'] as string) || '';
    const userIdHeader = (req.headers['x-user-id'] as string) || '';

    let token = '';
    if (typeof authHeader === 'string') {
      token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
    }

    let user: any = null;
    let userId = userIdHeader;
    let email = emailHeader;

    if (token) {
      const decoded = verifyJwtToken(token);
      if (decoded && decoded.email) {
        userId = String(decoded.id || decoded.userId || '');
        email = decoded.email;
        user = {
          _id: userId,
          email,
          role: decoded.role || 'Customer',
        };
      }
    }

    if (!user && (email.trim() || userId.trim())) {
      user = email.trim()
        ? await usersCollection.findOne({ email: email.trim().toLowerCase() })
        : await usersCollection.findOne({ _id: String(userId) as any });
    }

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in to manage your addresses.',
      });
      return;
    }

    const role = standardizeRole(user.role);

    if (role.toLowerCase() !== 'customer') {
      res.status(403).json({
        success: false,
        message: 'Only customer accounts can manage delivery addresses.',
      });
      return;
    }

    req.authedUser = {
      id: String(user._id ?? userId),
      email: user.email ?? email,
      role,
    };

    next();
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to authorize address access',
    });
  }
};
