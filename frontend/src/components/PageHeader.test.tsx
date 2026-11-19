import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('shows the title and the subtitle', () => {
    render(<PageHeader title="Deals" subtitle="Potential sales." />);
    expect(screen.getByRole('heading', { name: 'Deals' })).toBeInTheDocument();
    expect(screen.getByText('Potential sales.')).toBeInTheDocument();
  });

  it('omits the subtitle when none is given', () => {
    const { container } = render(<PageHeader title="Deals" />);
    expect(container.querySelector('.subtitle')).toBeNull();
  });
});
