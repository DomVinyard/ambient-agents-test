export interface FileItem {
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Email {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  fullBody: string;
  threadId: string;
  labelIds: string[];
  emailType: 'inbox' | 'sent' | 'unknown';
}

export interface Insight {
  category: string;
  insight: string;
  confidence: number;
  evidence: string;
} 