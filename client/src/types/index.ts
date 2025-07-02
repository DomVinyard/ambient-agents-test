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
  to?: string;
  cc?: string;
  date: string;
  snippet: string;
  fullBody: string;
  threadId: string;
  labelIds: string[];
  emailType: 'inbox' | 'sent' | 'unknown';
  classification?: {
    emailType: 'newsletter' | 'service' | 'personal' | 'professional';
    confidence: number;
    reasoning: string;
  };
}

export interface Insight {
  categories: string[];
  insight: string;
  confidence: number;
  evidence: string;
  extractedOn?: string;
  reasoning?: string;
} 