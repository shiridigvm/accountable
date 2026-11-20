import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { signOut, useSession } from '../lib/auth';
import { initials } from '../lib/initials';
import {
  chooseTheme,
  THEME_CHOICES,
  useThemeChoice,
  type ThemeChoice,
} from '../lib/theme';
import './UserMenu.css';

type Item =
  | { kind: 'theme'; value: ThemeChoice; label: string }
  | { kind: 'sign-out'; label: string };

const ITEMS: Item[] = [
  ...THEME_CHOICES.map((c) => ({ kind: 'theme' as const, ...c })),
  { kind: 'sign-out', label: 'Sign out' },
];

// The menu under the person's initials (R47 to R49): their email, the theme, and
// Sign out. Keyboard: Enter or Space opens it, arrows move, Escape closes.
export function UserMenu() {
  const { email } = useSession();
  const choice = useThemeChoice();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(0);
  const button = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (open) items.current[focused]?.focus();
  }, [open, focused]);

  function openAt(index: number) {
    setFocused(index);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    button.current?.focus();
  }

  function pick(item: Item) {
    close();
    if (item.kind === 'theme') chooseTheme(item.value);
    else void signOut();
  }

  function onButtonKey(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openAt(event.key === 'ArrowDown' ? 0 : ITEMS.length - 1);
    }
  }

  function onMenuKey(event: KeyboardEvent) {
    const last = ITEMS.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: focused === last ? 0 : focused + 1,
      ArrowUp: focused === 0 ? last : focused - 1,
      Home: 0,
      End: last,
    };
    if (event.key in moves) {
      event.preventDefault();
      setFocused(moves[event.key]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  }

  const menuId = `${id}-menu`;

  return (
    <div
      className="user-menu"
      onBlur={(e) => {
        if (open && !e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        className="user-menu-button"
        aria-label={`Account menu for ${email}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? setOpen(false) : openAt(0))}
        onKeyDown={onButtonKey}
      >
        {initials(email)}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="user-menu-panel"
          tabIndex={-1}
          onKeyDown={onMenuKey}
        >
          <p className="user-menu-email muted">{email}</p>
          <div role="group" aria-labelledby={`${id}-theme`}>
            <p className="user-menu-heading" id={`${id}-theme`}>
              Theme
            </p>
            {ITEMS.map((item, index) =>
              item.kind === 'theme' ? (
                <button
                  key={item.value}
                  ref={(node) => {
                    items.current[index] = node;
                  }}
                  type="button"
                  role="menuitemradio"
                  aria-checked={choice === item.value}
                  tabIndex={index === focused ? 0 : -1}
                  className="user-menu-item"
                  onClick={() => pick(item)}
                >
                  {item.label}
                </button>
              ) : null,
            )}
          </div>
          <hr className="user-menu-rule" />
          <button
            ref={(node) => {
              items.current[ITEMS.length - 1] = node;
            }}
            type="button"
            role="menuitem"
            tabIndex={focused === ITEMS.length - 1 ? 0 : -1}
            className="user-menu-item"
            onClick={() => pick(ITEMS[ITEMS.length - 1])}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
