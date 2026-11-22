import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { sendChat, type ChatReply } from '../api/copilot';
import { CopilotPanel } from './CopilotPanel';

vi.mock('../api/copilot', () => ({ sendChat: vi.fn() }));

const sendMock = vi.mocked(sendChat);

function reply(text: string, extra: Partial<ChatReply> = {}): ChatReply {
  return { reply: text, records: [], proposal: null, ...extra };
}

function renderPanel(onClose = vi.fn()) {
  render(
    <MemoryRouter>
      <CopilotPanel id="copilot" open onClose={onClose} />
    </MemoryRouter>,
  );
  return {
    input: screen.getByRole('textbox', { name: 'Message' }),
    log: screen.getByRole('log'),
    onClose,
  };
}

afterEach(() => {
  sendMock.mockReset();
});

describe('CopilotPanel', () => {
  it('shows the heading, the empty-state line and the placeholder', () => {
    const { input } = renderPanel();
    expect(
      screen.getByRole('heading', { name: 'Copilot' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Ask a question or ask for a change. Nothing is saved until you confirm.',
      ),
    ).toBeInTheDocument();
    expect(input).toHaveAttribute(
      'placeholder',
      'Ask about your organizations, contacts and deals',
    );
    expect(input).toHaveFocus();
  });

  it('Enter sends, and Shift+Enter starts a new line', async () => {
    sendMock.mockResolvedValue(reply('Two deals.'));
    const { input } = renderPanel();
    await userEvent.type(
      input,
      'Which deals{Shift>}{Enter}{/Shift}close soon?',
    );
    expect(input).toHaveValue('Which deals\nclose soon?');
    expect(sendMock).not.toHaveBeenCalled();
    await userEvent.type(input, '{Enter}');
    expect(sendMock).toHaveBeenCalledWith([
      { role: 'user', content: 'Which deals\nclose soon?' },
    ]);
    expect(input).toHaveValue('');
  });

  it('shows Thinking and turns Send off while waiting, then shows the reply in a live region', async () => {
    let finish: (value: ChatReply) => void = () => {};
    sendMock.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { input, log } = renderPanel();
    await userEvent.type(input, 'Hi{Enter}');
    expect(within(log).getByText('Thinking')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();

    finish(reply('Hello there.'));
    expect(await within(log).findByText('Hello there.')).toBeInTheDocument();
    expect(log).toHaveAttribute('aria-live', 'polite');
    expect(within(log).queryByText('Thinking')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled();
  });

  it('sends the earlier turns with each new message', async () => {
    sendMock.mockResolvedValueOnce(reply('First answer.'));
    sendMock.mockResolvedValueOnce(reply('Second answer.'));
    const { input, log } = renderPanel();
    await userEvent.type(input, 'One{Enter}');
    await within(log).findByText('First answer.');
    await userEvent.type(input, 'Two{Enter}');
    expect(sendMock).toHaveBeenLastCalledWith([
      { role: 'user', content: 'One' },
      { role: 'assistant', content: 'First answer.' },
      { role: 'user', content: 'Two' },
    ]);
  });

  it('links each record used to its detail page', async () => {
    sendMock.mockResolvedValue(
      reply('Kestrel Freight has one open deal.', {
        records: [
          { kind: 'organization', id: 3, name: 'Kestrel Freight' },
          { kind: 'deal', id: 4, name: 'Kestrel Freight audit' },
        ],
      }),
    );
    const { input } = renderPanel();
    await userEvent.type(input, 'Kestrel?{Enter}');
    const records = await screen.findByRole('list', { name: 'Records used' });
    expect(
      within(records).getByRole('link', { name: 'Kestrel Freight' }),
    ).toHaveAttribute('href', '/organizations/3');
    expect(
      within(records).getByRole('link', { name: 'Kestrel Freight audit' }),
    ).toHaveAttribute('href', '/deals/4');
  });

  it('shows HTML in a reply as literal text', async () => {
    const html = 'Click <a href="https://evil.example">here</a> and <b>x</b>';
    sendMock.mockResolvedValue(reply(html));
    const { input, log } = renderPanel();
    await userEvent.type(input, 'Hi{Enter}');
    expect(await within(log).findByText(html)).toBeInTheDocument();
    expect(within(log).queryByRole('link')).not.toBeInTheDocument();
    expect(log.querySelector('b')).toBeNull();
  });

  it('shows a proposal as a card', async () => {
    sendMock.mockResolvedValue(
      reply('Here is the change.', {
        proposal: {
          kind: 'deal',
          action: 'update',
          id: 4,
          name: 'Kestrel Freight audit',
          fields: { stage: 'Negotiation' },
          current: { stage: 'New' },
        },
      }),
    );
    const { input } = renderPanel();
    await userEvent.type(input, 'Move it{Enter}');
    const card = await screen.findByRole('region', { name: 'Update deal' });
    expect(within(card).getByRole('button', { name: 'Confirm' })).toBeEnabled();
  });

  it.each([
    [
      503,
      "The Copilot isn't set up yet. Ask whoever runs Accountable to add an OpenRouter key.",
    ],
    [429, 'The AI service is busy. Try again in a minute.'],
    [502, "The Copilot couldn't get an answer. Try again."],
  ])('shows the error for status %i', async (status, message) => {
    sendMock.mockRejectedValue(new ApiError(message, status));
    const { input, log } = renderPanel();
    await userEvent.type(input, 'Hi{Enter}');
    expect(await within(log).findByRole('alert')).toHaveTextContent(message);
    expect(within(log).getByText('Hi')).toBeInTheDocument();
  });

  it('does not send the error turns back to the model', async () => {
    sendMock.mockRejectedValueOnce(new ApiError('Busy.', 429));
    sendMock.mockResolvedValueOnce(reply('Ok.'));
    const { input, log } = renderPanel();
    await userEvent.type(input, 'One{Enter}');
    await within(log).findByRole('alert');
    await userEvent.type(input, 'Two{Enter}');
    expect(sendMock).toHaveBeenLastCalledWith([
      { role: 'user', content: 'One' },
      { role: 'user', content: 'Two' },
    ]);
  });

  it('refuses a message over 2,000 characters and sends nothing', async () => {
    const { input } = renderPanel();
    await userEvent.click(input);
    await userEvent.paste('x'.repeat(2001));
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Messages can be up to 2,000 characters.',
    );
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveValue('x'.repeat(2001));
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('accepts a message of exactly 2,000 characters', async () => {
    sendMock.mockResolvedValue(reply('Ok.'));
    const { input } = renderPanel();
    await userEvent.click(input);
    await userEvent.paste('x'.repeat(2000));
    await userEvent.keyboard('{Enter}');
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it('the close button and Escape call onClose', async () => {
    const { input, onClose } = renderPanel();
    await userEvent.click(
      screen.getByRole('button', { name: 'Close Copilot' }),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.type(input, '{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
