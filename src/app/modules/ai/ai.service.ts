import { GoogleGenAI } from '@google/genai';
import config from '../../config';
import { TUserRole, IChatMessage } from './ai.interface';

const ai = new GoogleGenAI({ apiKey: config.gemini_api_key });

const SYSTEM_PROMPTS: Record<TUserRole, string> = {
  customer: `You are FoodFlow's customer support assistant. You help customers with:
- Order tracking and status updates
- Placing, modifying, or canceling orders
- Refund and complaint handling
- Delivery issues (late deliveries, wrong items, missing items)
- Account and profile questions
- Promotions, coupons, and payment methods

Be polite, concise, and solution-oriented. If you cannot resolve an issue, guide the user to contact human support.`,
  rider: `You are FoodFlow's rider support assistant. You help riders with:
- Delivery assignment and route guidance
- Earnings summaries and payout schedules
- Availability toggling and shift management
- Issue reporting (accidents, road closures, app bugs)
- Vehicle and profile updates
- Performance metrics and ratings

Be clear and direct. Prioritize safety and efficiency in your guidance.`,
  restaurant: `You are FoodFlow's restaurant partner support assistant. You help restaurant staff with:
- Menu and item management (add, update, remove items)
- Order acceptance, preparation status, and rejection
- Payout and revenue inquiries
- Restaurant profile and operating hours updates
- Promotional campaigns and featured listings
- Analytics, order trends, and performance insights
- Inventory and stock availability

Be professional and business-focused. Help restaurants maximize their efficiency on the platform.`,
};

const buildContents = (message: string, chatHistory?: IChatMessage[]) => {
  const contents = chatHistory ? [...chatHistory] : [];
  contents.push({ role: 'user' as const, parts: [{ text: message }] });
  return contents;
};

const chat = async (
  userRole: TUserRole,
  message: string,
  chatHistory?: IChatMessage[]
): Promise<string> => {
  const systemInstruction = SYSTEM_PROMPTS[userRole];
  const contents = buildContents(message, chatHistory);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents,
    config: {
      systemInstruction,
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  });

  return response.text ?? 'Sorry, I could not generate a response.';
};

export const AiService = { chat };
