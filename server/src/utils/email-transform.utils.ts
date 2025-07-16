/**
 * Transform frontend email format to the format expected by AI service
 */
export function transformEmailForAI(emailData: any) {
  return {
    id: emailData.id,
    snippet: emailData.snippet,
    fullBody: emailData.fullBody,
    internalDate: new Date(emailData.date).getTime().toString(),
    labelIds: emailData.labelIds || [],
    emailType: emailData.emailType || 'unknown',
    threadId: emailData.threadId,
    classification: emailData.classification,
    payload: {
      headers: [
        { name: 'Subject', value: emailData.subject },
        { name: 'From', value: emailData.from },
        { name: 'To', value: emailData.to || '' },
        { name: 'Cc', value: emailData.cc || '' },
        { name: 'Date', value: emailData.date }
      ]
    }
  };
} 