import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { TUserRole, IChatMessage } from './ai.interface';

if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not set in environment variables');
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

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

const VALID_ROLES: TUserRole[] = ['customer', 'rider', 'restaurant'];

const normalizeContent = (item: IChatMessage) => ({
  role: item.role === 'assistant' ? 'model' : 'user',
  parts: [{ text: item.text || item.message || '' }],
});

const chat = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userRole, message, chatHistory } = req.body;

    if (!userRole || !VALID_ROLES.includes(userRole)) {
      res.status(400).json({
        success: false,
        message: 'userRole must be one of: customer, rider, restaurant',
      });
      return;
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({
        success: false,
        message: 'A non-empty message string is required',
      });
      return;
    }

    const formattedHistory: { role: string; parts: { text: string }[] }[] =
      Array.isArray(chatHistory)
        ? chatHistory.map(normalizeContent)
        : [];

    const contents = [...formattedHistory, { role: 'user', parts: [{ text: message.trim() }] }];

    const generateConfig = {
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPTS[userRole as TUserRole],
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    };

    let response;
    try {
      response = await ai.models.generateContent({ model: 'gemini-3.6-flash', ...generateConfig });
    } catch (err: any) {
      if (err?.status === 404 || err?.message?.includes('404')) {
        console.warn('gemini-3.6-flash not found, falling back to gemini-1.5-flash');
        response = await ai.models.generateContent({ model: 'gemini-1.5-flash', ...generateConfig });
      } else {
        throw err;
      }
    }

    res.status(200).json({
      success: true,
      reply: response.text ?? 'Sorry, I could not generate a response.',
    });
  } catch (error: any) {
    console.error('AI chat error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'AI chat request failed',
    });
  }
};

export const AiController = { chat };
