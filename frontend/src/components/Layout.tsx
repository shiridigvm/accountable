import { useId, useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { CopilotPanel } from './CopilotPanel';
import { SearchBox } from './SearchBox';
import { UserMenu } from './UserMenu';

const SECTIONS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/organizations', label: 'Organizations' },
  { to: '/contacts', label: 'Contacts' },
  { to: '/deals', label: 'Deals' },
  { to: '/pipeline', label: 'Pipeline' },
];

// The sidebar, and a top bar with the search box, the Copilot button and the user
// menu (appearance.md, Layout). On narrow screens styles.css folds them into one
// bar above the page. The Copilot panel stays mounted here while the person moves
// between pages, so its conversation lasts until a refresh or sign-out (R59).
export function Layout() {
  const panelId = useId();
  const [copilotOpen, setCopilotOpen] = useState(false);
  const copilotButton = useRef<HTMLButtonElement>(null);

  function closeCopilot() {
    setCopilotOpen(false);
    copilotButton.current?.focus();
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="wordmark">
          Account<span>able</span>
        </div>
        <nav aria-label="Main">
          {SECTIONS.map((section) => (
            <NavLink key={section.to} to={section.to} className="nav-link">
              {section.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className={copilotOpen ? 'main with-copilot' : 'main'}>
        <header className="topbar">
          <SearchBox />
          <button
            ref={copilotButton}
            type="button"
            className="copilot-button"
            aria-pressed={copilotOpen}
            aria-controls={panelId}
            onClick={() =>
              copilotOpen ? closeCopilot() : setCopilotOpen(true)
            }
          >
            Copilot
          </button>
          <UserMenu />
        </header>
        <main className="content">
          <Outlet />
        </main>
        <CopilotPanel id={panelId} open={copilotOpen} onClose={closeCopilot} />
      </div>
    </div>
  );
}
