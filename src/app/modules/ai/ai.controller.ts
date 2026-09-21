import { Request, Response } from 'express';
import { AiService } from './ai.service';
import { TUserRole } from './ai.interface';

const VALID_ROLES: TUserRole[] = ['customer', 'rider', 'restaurant'];

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

    const normalizedRole: TUserRole = VALID_ROLES.includes(userRole as TUserRole)
      ? (userRole as TUserRole)
      : 'customer';

    const result = await AiService.processChat({
      userRole: normalizedRole,
      message: message.trim(),
      chatHistory: Array.isArray(chatHistory) ? chatHistory : [],
      userId,
      userEmail,
      cartItems: Array.isArray(cartItems) ? cartItems : [],
    });

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
