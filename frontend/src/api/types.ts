// Shapes returned by the backend. Money is in cents, dates are YYYY-MM-DD strings.

import type { ContactStatus } from '../lib/stages';
import type { Stage } from '../lib/stages';

export type Organization = {
  id: number;
  name: string;
  website: string | null;
  industry: string | null;
  notes: string | null;
  contact_count: number;
  deal_count: number;
  created_by: string;
  updated_by: string;
};

export type Contact = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  status: ContactStatus;
  organization_id: number | null;
  organization_name: string | null;
  created_by: string;
  updated_by: string;
};

export type Deal = {
  id: number;
  name: string;
  stage: Stage;
  value_cents: number;
  probability: number;
  expected_close: string;
  actual_close: string | null;
  organization_id: number | null;
  organization_name: string | null;
  main_contact_id: number | null;
  main_contact_name: string | null;
  position: number;
  expected_cents: number;
  late: boolean;
  created_by: string;
  updated_by: string;
};

export type TimelineEntry = {
  kind: 'activity' | 'stage_change';
  id: number;
  on: string;
  created_at: string;
  text: string;
  // Activity fields
  type?: 'note' | 'call' | 'email';
  follow_up_on?: string | null;
  done?: boolean;
  contact_id?: number | null;
  contact_name?: string | null;
  created_by?: string;
  // Stage change fields
  from_stage?: string;
  to_stage?: string;
  // Both kinds
  deal_id?: number | null;
  deal_name?: string | null;
};

export type BoardDeal = Deal;

export type BoardColumn = {
  stage: Stage;
  probability: number;
  open: boolean;
  count: number;
  value_cents: number;
  expected_cents: number | null;
  deals: BoardDeal[];
};

export type Board = {
  columns: BoardColumn[];
  open_value_cents: number;
  open_expected_cents: number;
};

export type DashboardMonth = {
  month: string; // YYYY-MM
  won_count: number;
  won_cents: number;
  expected_count: number;
  expected_cents: number;
};

export type FollowUp = {
  id: number;
  text: string;
  who: string | null;
  due: string;
  status: 'overdue' | 'upcoming';
};

export type Dashboard = {
  today: string;
  stats: {
    won_year_count: number;
    won_year_cents: number;
    open_count: number;
    open_cents: number;
    expected_cents: number;
    late_count: number;
  };
  monthly: DashboardMonth[];
  follow_ups: FollowUp[];
  recent: TimelineEntry[];
};
