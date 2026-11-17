import type { ContactStatus } from './stages';

export const STATUS_LABELS: Record<ContactStatus, string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  customer: 'Customer',
};
