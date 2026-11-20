import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { appliedTheme, applyTheme, saveTheme, type Theme } from '../lib/theme';

const SECTIONS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/organizations', label: 'Organizations' },
  { to: '/contacts', label: 'Contacts' },
  { to: '/deals', label: 'Deals' },
  { to: '/pipeline', label: 'Pipeline' },
];

export function Layout() {
  // index.html has already applied the saved mode, so start from <html>.
  const [theme, setTheme] = useState<Theme>(appliedTheme);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    saveTheme(next);
    setTheme(next);
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
        <button
          type="button"
          className="theme-toggle"
          aria-pressed={theme === 'dark'}
          onClick={toggleTheme}
        >
          Dark mode
        </button>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
