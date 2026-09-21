import { Request, Response } from 'express';
import { ContactService } from './contact.service';

const createContactMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const message = await ContactService.createContactMessage(req.body);
    res.status(201).json({
      success: true,
      message: 'Contact inquiry submitted successfully!',
      data: message,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to submit contact message',
    });
  }
};

const getAllContactMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, category, search, page, limit, sortBy, sortOrder } = req.query;

    const result = await ContactService.getAllContactMessages({
      status: status as string,
      category: category as string,
      search: search as string,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    res.status(200).json({
      success: true,
      data: result.messages,
      meta: result.meta,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch contact messages',
    });
  }
};

const getContactMessageById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const message = await ContactService.getContactMessageById(id);

    if (!message) {
      res.status(404).json({ success: false, message: 'Message not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: message,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch message details',
    });
  }
};

const updateContactStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ success: false, message: 'Status is required' });
      return;
    }

    const updated = await ContactService.updateContactStatus(id, status);

    if (!updated) {
      res.status(404).json({ success: false, message: 'Message not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Status updated to ${status}`,
      data: updated,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update status',
    });
  }
};

const addContactReply = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { replyMessage, repliedBy: payloadRepliedBy } = req.body;

    if (!replyMessage || !replyMessage.trim()) {
      res.status(400).json({ success: false, message: 'Reply message is required' });
      return;
    }

    const finalRepliedBy =
      payloadRepliedBy ||
      (req.headers['x-user-email'] as string) ||
      (req.headers['x-user-id'] as string) ||
      (req as any).user?.email ||
      'Food Flow Support';

    const updated = await ContactService.addContactReply(id, {
      replyMessage,
      repliedBy: finalRepliedBy,
    });



    if (!updated) {
      res.status(404).json({ success: false, message: 'Message not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Reply added successfully',
      data: updated,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to add reply',
    });
  }
};

const deleteContactMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await ContactService.deleteContactMessage(id);

    if (!deleted) {
      res.status(404).json({ success: false, message: 'Message not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to delete message',
    });
  }
};

const getContactStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await ContactService.getContactStats();
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch contact stats',
    });
  }
};

export const ContactController = {
  createContactMessage,
  getAllContactMessages,
  getContactMessageById,
  updateContactStatus,
  addContactReply,
  deleteContactMessage,
  getContactStats,
};
