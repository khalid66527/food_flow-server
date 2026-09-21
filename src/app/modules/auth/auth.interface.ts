export interface TJwtPayload {
  id: string;
  userId?: string;
  email: string;
  role?: string;
  name?: string;
  phone?: string;
  iat?: number;
  exp?: number;
}

export interface IAuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: TJwtPayload;
}
