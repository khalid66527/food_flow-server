import { Request, Response } from 'express';
import { AiService } from './ai.service';
import { TUserRole } from './ai.interface';

const VALID_ROLES: (TUserRole | 'guest')[] = ['customer', 'rider', 'restaurant', 'guest'];
// Helper function to extract all configured Gemini API keys from environment
const getGeminiApiKeys = (): string[] => {
  const envKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY_1,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY_2,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY_3,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY_4,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY_5,
  ];

  if (process.env.GEMINI_API_KEYS) {
    envKeys.push(...process.env.GEMINI_API_KEYS.split(','));
  }

  const uniqueKeys = Array.from(
    new Set(envKeys.map((k) => (k || '').trim()).filter(Boolean))
  );

  return uniqueKeys;
};

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
    const { userRole = 'customer', message, chatHistory, userId, userEmail, cartItems } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({
        success: false,
        message: 'A non-empty message string is required',
      });
      return;
    }

    const normalizedRole = VALID_ROLES.includes(userRole) ? userRole : 'customer';

    const result = await AiService.processChat({
      userRole: normalizedRole,
      message: message.trim(),
      chatHistory: Array.isArray(chatHistory) ? chatHistory : [],
      userId,
      userEmail,
      cartItems: Array.isArray(cartItems) ? cartItems : [],
    });
    const contents = [...formattedHistory, { role: 'user', parts: [{ text: message.trim() }] }];

    const generateConfig = {
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPTS[userRole as TUserRole],
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    };

    const keys = getGeminiApiKeys();
    if (keys.length === 0) {
      res.status(500).json({
        success: false,
        error: 'No Gemini API key configured on server.',
      });
      return;
    }

    let response: any = null;
    let lastError: any = null;

    // Key Rotation Loop: retry with next key seamlessly on rate limit / error
    for (let i = 0; i < keys.length; i++) {
      const apiKey = keys[i];
      try {
        const ai = new GoogleGenAI({ apiKey });

        try {
          response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            ...generateConfig,
          });
        } catch (err: any) {
          if (err?.status === 404 || err?.message?.includes('404')) {
            console.warn('gemini-3.6-flash not found, falling back to gemini-1.5-flash');
            response = await ai.models.generateContent({
              model: 'gemini-1.5-flash',
              ...generateConfig,
            });
          } else {
            throw err;
          }
        }

        if (response) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(
          `[AI Key Rotation] Key ${i + 1}/${keys.length} failed (${err?.status || err?.message || 'error'}). Switching to next key...`
        );
      }
    }

    if (!response) {
      throw lastError || new Error('All Gemini API keys failed or rate-limited.');
    }

    res.status(200).json({
      success: true,
      reply: result.reply,
    });
  } catch (error: any) {
    console.error('[AI Controller] Chat error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'AI chat request failed',
    });
  }
};

export const AiController = { chat };
