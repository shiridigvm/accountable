import { NavLink, Outlet } from 'react-router-dom';
import { SearchBox } from './SearchBox';
import { UserMenu } from './UserMenu';

const SECTIONS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/organizations', label: 'Organizations' },
  { to: '/contacts', label: 'Contacts' },
  { to: '/deals', label: 'Deals' },
  { to: '/pipeline', label: 'Pipeline' },
];

// The sidebar, and a top bar with the search box and the user menu (appearance.md,
// Layout). On narrow screens styles.css folds both into one bar above the page.
export function Layout() {
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
      <div className="main">
        <header className="topbar">
          <SearchBox />
          <UserMenu />
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
