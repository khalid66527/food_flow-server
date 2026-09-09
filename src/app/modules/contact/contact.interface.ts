export type TContactCategory = 'Customer' | 'Restaurant' | 'Delivery Partner' | 'Other';
export type TContactStatus = 'pending' | 'in-progress' | 'replied' | 'resolved' | 'closed';

export interface IContactReply {
  id?: string;
  replyMessage: string;
  repliedBy: string; // admin name / email
  repliedAt: string | Date;
}

export interface IContactMessage {
  _id?: string;
  ticketId: string;
  name: string;
  email: string;
  phone?: string;
  category: TContactCategory | string;
  subject: string;
  message: string;
  status: TContactStatus;
  replies?: IContactReply[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IContactFilterOptions {
  status?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
