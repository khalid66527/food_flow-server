export type TUserRole = 'customer' | 'rider' | 'restaurant';

export interface IChatMessage {
  role?: string;
  parts?: { text: string }[];
  text?: string;
  message?: string;
  content?: string;
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
