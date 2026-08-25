export type TUserRole = 'customer' | 'rider' | 'restaurant';

export interface IChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface IChatRequest {
  userRole: TUserRole;
  message: string;
  chatHistory?: IChatMessage[];
}

export interface IChatResponse {
  success: boolean;
  reply: string;
}
