export type TUserRole = 'customer' | 'rider' | 'restaurant' | 'guest';

export type TAiProvider = 'gemini' | 'groq' | 'agentrouter';

export type TMood = 'spicy' | 'cheat_day' | 'healthy' | 'late_night' | 'budget' | 'party';

export interface IUserLocation {
  city?: string;
  area?: string;
  zoneName?: string;
  lat?: number;
  lng?: number;
  address?: string;
}

export interface IPreSuggestedPrompt {
  id: string;
  label: string;
  message: string;
  icon?: string;
  active?: boolean;
}

export interface IApiKeyMetric {
  id: string;
  maskedKey: string;
  usageCount: number;
  lastUsedAt?: string | null;
  status: 'active' | 'rate_limited' | 'error';
  addedAt?: string | null;
}

export interface IAiSettings {
  key?: string;
  activeProvider: TAiProvider;
  activeModel: string;
  geminiKeys: any[];
  groqKeys: any[];
  agentRouterKeys: any[];
  salesExecutivePrompt: string;
  temperature: number;
  maxOutputTokens: number;
  locationAware: boolean;
  moodPillsEnabled: boolean;
  preSuggestedPromptsEnabled: boolean;
  preSuggestedPrompts: IPreSuggestedPrompt[];
  fallbackEnabled: boolean;
  updatedAt?: string;
}

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
  userId?: string;
  userEmail?: string;
  userName?: string;
  cartItems?: any[];
  userLocation?: IUserLocation;
  userMood?: TMood | string;
}

export interface IChatResponse {
  success: boolean;
  reply: string;
  provider?: string;
  model?: string;
}

export interface ITestKeyPayload {
  provider: TAiProvider;
  apiKey: string;
  model?: string;
}
