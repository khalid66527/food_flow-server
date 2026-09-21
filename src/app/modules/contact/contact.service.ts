import { ObjectId } from 'mongodb';
import { contactCollection } from '../../config/db';
import { IContactMessage, IContactFilterOptions, IContactReply, TContactStatus } from './contact.interface';

/**
 * 1. Create a new contact message inquiry
 */
const createContactMessage = async (payload: Partial<IContactMessage>): Promise<IContactMessage> => {
  const generatedTicket =
    payload.ticketId || `FF-${Math.floor(1000 + Math.random() * 9000)}`;

  const newDoc: IContactMessage = {
    ticketId: generatedTicket,
    name: payload.name || '',
    email: (payload.email || '').toLowerCase().trim(),
    phone: payload.phone || '',
    category: payload.category || 'Other',
    subject: payload.subject || '',
    message: payload.message || '',
    status: 'pending',
    replies: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await contactCollection.insertOne(newDoc as any);
  return { ...newDoc, _id: result.insertedId.toString() };
};

/**
 * 2. Get all contact messages with search, filter, pagination
 */
const getAllContactMessages = async (filters: IContactFilterOptions) => {
  const {
    status,
    category,
    search,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = filters;

  const query: any = {};

  if (status && status !== 'all') {
    query.status = status;
  }

  if (category && category !== 'all') {
    query.category = { $regex: new RegExp(`^${category}$`, 'i') };
  }

  if (search && search.trim() !== '') {
    const searchRegex = { $regex: search.trim(), $options: 'i' };
    query.$or = [
      { ticketId: searchRegex },
      { name: searchRegex },
      { email: searchRegex },
      { subject: searchRegex },
      { message: searchRegex },
      { phone: searchRegex },
    ];
  }

  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 20;
  const skip = (pageNum - 1) * limitNum;

  const sortDirection = sortOrder === 'asc' ? 1 : -1;
  const sortObj: any = { [sortBy]: sortDirection };

  const [messages, totalCount] = await Promise.all([
    contactCollection
      .find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .toArray(),
    contactCollection.countDocuments(query),
  ]);

  // Also calculate quick stats across all messages
  const [totalAll, pendingCount, inProgressCount, repliedCount, resolvedCount] = await Promise.all([
    contactCollection.countDocuments({}),
    contactCollection.countDocuments({ status: 'pending' }),
    contactCollection.countDocuments({ status: 'in-progress' }),
    contactCollection.countDocuments({ status: 'replied' }),
    contactCollection.countDocuments({ status: 'resolved' }),
  ]);

  return {
    messages,
    meta: {
      page: pageNum,
      limit: limitNum,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limitNum),
      stats: {
        total: totalAll,
        pending: pendingCount,
        inProgress: inProgressCount,
        replied: repliedCount,
        resolved: resolvedCount,
      },
    },
  };
};

/**
 * 3. Get single message by ID or Ticket ID
 */
const getContactMessageById = async (id: string): Promise<IContactMessage | null> => {
  let query: any = {};
  if (ObjectId.isValid(id)) {
    query = { $or: [{ _id: new ObjectId(id) }, { ticketId: id }] };
  } else {
    query = { ticketId: id };
  }

  const doc = await contactCollection.findOne(query);
  return doc as unknown as IContactMessage | null;
};

/**
 * 4. Update contact message status
 */
const updateContactStatus = async (
  id: string,
  status: TContactStatus
): Promise<IContactMessage | null> => {
  let query: any = {};
  if (ObjectId.isValid(id)) {
    query = { $or: [{ _id: new ObjectId(id) }, { ticketId: id }] };
  } else {
    query = { ticketId: id };
  }

  const result = await contactCollection.findOneAndUpdate(
    query,
    {
      $set: {
        status,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );

  return result as unknown as IContactMessage | null;
};

/**
 * 5. Add a reply to the inquiry and mark as replied
 */
const addContactReply = async (
  id: string,
  replyPayload: { replyMessage: string; repliedBy?: string }
): Promise<IContactMessage | null> => {
  let query: any = {};
  if (ObjectId.isValid(id)) {
    query = { $or: [{ _id: new ObjectId(id) }, { ticketId: id }] };
  } else {
    query = { ticketId: id };
  }

  const newReply: IContactReply = {
    id: new ObjectId().toString(),
    replyMessage: replyPayload.replyMessage,
    repliedBy: replyPayload.repliedBy || 'Support Team',
    repliedAt: new Date(),
  };

  const result = await contactCollection.findOneAndUpdate(
    query,
    {
      $push: { replies: newReply } as any,
      $set: {
        status: 'replied',
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );

  return result as unknown as IContactMessage | null;
};

/**
 * 6. Delete contact message
 */
const deleteContactMessage = async (id: string): Promise<boolean> => {
  let query: any = {};
  if (ObjectId.isValid(id)) {
    query = { $or: [{ _id: new ObjectId(id) }, { ticketId: id }] };
  } else {
    query = { ticketId: id };
  }

  const result = await contactCollection.deleteOne(query);
  return result.deletedCount > 0;
};

/**
 * 7. Get quick stats overview
 */
const getContactStats = async () => {
  const [total, pending, inProgress, replied, resolved] = await Promise.all([
    contactCollection.countDocuments({}),
    contactCollection.countDocuments({ status: 'pending' }),
    contactCollection.countDocuments({ status: 'in-progress' }),
    contactCollection.countDocuments({ status: 'replied' }),
    contactCollection.countDocuments({ status: 'resolved' }),
  ]);

  return {
    total,
    pending,
    inProgress,
    replied,
    resolved,
  };
};

export const ContactService = {
  createContactMessage,
  getAllContactMessages,
  getContactMessageById,
  updateContactStatus,
  addContactReply,
  deleteContactMessage,
  getContactStats,
};
