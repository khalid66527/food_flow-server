import { Request, Response } from 'express';
import { AiService } from './ai.service';
import { TUserRole, TAiProvider } from './ai.interface';

const VALID_ROLES: TUserRole[] = ['customer', 'rider', 'restaurant', 'guest'];

const chat = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      userRole = 'customer',
      message,
      chatHistory,
      userId,
      userEmail,
      userName,
      cartItems,
      userLocation,
      userMood,
    } = req.body;

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
      userName,
      cartItems: Array.isArray(cartItems) ? cartItems : [],
      userLocation,
      userMood,
    });

    res.status(200).json({
      success: true,
      reply: result.reply,
      provider: result.provider,
      model: result.model,
      cartAction: (result as any).cartAction,
    });
  } catch (error: any) {
    console.error('[AI Controller] Chat error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'AI chat request failed',
    });
  }
};

const getSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = await AiService.getSettings();

    // Mask secret keys before sending to client for strict security
    const maskedSettings = {
      ...settings,
      geminiKeys: AiService.maskKeys(settings.geminiKeys),
      groqKeys: AiService.maskKeys(settings.groqKeys),
      agentRouterKeys: AiService.maskKeys(settings.agentRouterKeys),
      rawGeminiCount: settings.geminiKeys.length,
      rawGroqCount: settings.groqKeys.length,
      rawAgentRouterCount: settings.agentRouterKeys.length,
    };

    res.status(200).json({
      success: true,
      data: maskedSettings,
    });
  } catch (error: any) {
    console.error('[AI Controller] Get settings error:', error);
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to fetch AI configuration',
    });
  }
};

const updateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body;
    const updated = await AiService.updateSettings(payload);

    res.status(200).json({
      success: true,
      message: 'AI Settings updated successfully',
      data: {
        ...updated,
        geminiKeys: AiService.maskKeys(updated.geminiKeys),
        groqKeys: AiService.maskKeys(updated.groqKeys),
        agentRouterKeys: AiService.maskKeys(updated.agentRouterKeys),
      },
    });
  } catch (error: any) {
    console.error('[AI Controller] Update settings error:', error);
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to update AI configuration',
    });
  }
};

const testKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const { provider, apiKey, model, keyIndex } = req.body;

    if (!provider || (!apiKey && typeof keyIndex !== 'number')) {
      res.status(400).json({
        success: false,
        message: 'Provider and apiKey or keyIndex are required',
      });
      return;
    }

    const testResult = await AiService.testKey(provider as TAiProvider, apiKey, model, keyIndex);
    res.status(200).json({
      success: testResult.success,
      message: testResult.message,
    });
  } catch (error: any) {
    console.error('[AI Controller] Test key error:', error);
    res.status(500).json({
      success: false,
      message: error?.message || 'Key verification failed',
    });
  }
};

export const AiController = {
  chat,
  getSettings,
  updateSettings,
  testKey,
};
