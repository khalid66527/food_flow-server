import jwt from 'jsonwebtoken';
import config from '../config';

export interface TJwtPayload {
  userId: string;
  email: string;
  role: string;
}

export const generateToken = (payload: TJwtPayload): string => {
  return jwt.sign(payload, config.jwt_secret, {
    expiresIn: config.jwt_expires_in as string,
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): TJwtPayload => {
  return jwt.verify(token, config.jwt_secret) as TJwtPayload;
};
