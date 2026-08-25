import { Request, Response } from 'express';
import { AiService } from './ai.service';
import { TUserRole } from './ai.interface';

const VALID_ROLES: TUserRole[] = ['customer', 'rider', 'restaurant'];

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

    const reply = await AiService.chat(userRole, message.trim(), chatHistory);

    res.status(200).json({
      success: true,
      reply,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'AI chat request failed',
    });
  }
};

export const AiController = { chat };
