// POST /api/copilot/chat (R58 to R73). The backend only reads; Confirm on a card
// sends the change to the normal route (decision 22).
import { api } from './client';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export type RecordKind = 'organization' | 'contact' | 'deal' | 'activity';

export type RecordRef = {
  kind: 'organization' | 'contact' | 'deal';
  id: number;
  name: string;
};

export type FieldValue = string | number | boolean | null;

export type Proposal = {
  kind: RecordKind;
  action: 'create' | 'update';
  id: number | null;
  name: string;
  fields: Record<string, FieldValue>;
  current: Record<string, FieldValue> | null;
};

export type ChatReply = {
  reply: string;
  records: RecordRef[];
  proposal: Proposal | null;
};

export function sendChat(messages: ChatMessage[]): Promise<ChatReply> {
  return api<ChatReply>('POST', '/api/copilot/chat', { messages });
}
