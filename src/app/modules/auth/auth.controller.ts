import { Request, Response } from 'express';
import { usersCollection } from '../../config/db';
import { signJwtToken, verifyJwtToken, standardizeRole } from './auth.utils';
import { TJwtPayload } from './auth.interface';

/**
 * Issue / Generate JWT Token for a user
 * POST /api/auth/jwt or POST /api/auth/create-token
 */
export const createJwtToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, id, userId, name, role, phone } = req.body || {};

    if (!email && !id && !userId) {
      res.status(400).json({
        success: false,
        message: 'User email or ID is required to generate a JWT token.',
      });
      return;
    }

    let resolvedUser: any = null;
    if (email) {
      resolvedUser = await usersCollection.findOne({ email: email.trim().toLowerCase() });
    } else if (id || userId) {
      resolvedUser = await usersCollection.findOne({ _id: String(id || userId) as any });
    }

    const payload: Partial<TJwtPayload> = {
      id: String(resolvedUser?._id || id || userId || ''),
      userId: String(resolvedUser?._id || userId || id || ''),
      email: String(resolvedUser?.email || email || '').trim().toLowerCase(),
      name: resolvedUser?.name || name || 'User',
      role: standardizeRole(resolvedUser?.role || role || 'Customer'),
      phone: resolvedUser?.phone || phone || '',
    };

    const token = signJwtToken(payload);

    res.status(200).json({
      success: true,
      message: 'JWT Token generated successfully.',
      token,
      user: payload,
    });
  } catch (error: any) {
    console.error('Error generating JWT token:', error);
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to generate JWT token.',
    });
  }
};

/**
 * Verify JWT Token and return payload
 * GET /api/auth/verify-token
 */
export const verifyTokenEndpoint = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'] || req.headers['x-auth-token'];
    let token = '';
    if (typeof authHeader === 'string') {
      token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
    }

    if (!token) {
      res.status(400).json({
        success: false,
        message: 'No Bearer token provided in Authorization header.',
      });
      return;
    }

    const decoded = verifyJwtToken(token);
    if (!decoded) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Token is valid.',
      user: decoded,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Token verification failed.',
    });
  }
};

/**
 * Get authenticated user profile info
 * GET /api/auth/me
 */
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user || req.authedUser;
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to get user profile.',
    });
  }
};

export const AuthController = {
  createJwtToken,
  verifyTokenEndpoint,
  getMe,
};
