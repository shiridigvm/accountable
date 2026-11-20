// GET /api/search (R51 to R53). The backend does the matching.
import { api } from './client';

export type SearchHit = { id: number; name: string };
export type ContactHit = SearchHit & { organization_name: string | null };

export type SearchResults = {
  organizations: SearchHit[];
  contacts: ContactHit[];
  deals: SearchHit[];
};

export function searchRecords(text: string): Promise<SearchResults> {
  return api<SearchResults>('GET', `/api/search?q=${encodeURIComponent(text)}`);
}
