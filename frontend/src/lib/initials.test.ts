import { describe, expect, it } from 'vitest';
import { initials } from './initials';

describe('initials (R47)', () => {
  it.each([
    ['jane.doe@example.com', 'JD'],
    ['sam@example.com', 'S'],
    ['ana_lopez@example.com', 'AL'],
    ['ben-ito@example.com', 'BI'],
    ['kim+sales@example.com', 'KS'],
    ['a.b.c@example.com', 'AB'],
    ['.lead.dot@example.com', 'LD'],
    ['MIXED.case@example.com', 'MC'],
  ])('%s gives %s', (email, expected) => {
    expect(initials(email)).toBe(expected);
  });
});
