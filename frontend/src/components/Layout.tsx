import { NavLink, Outlet } from 'react-router-dom';

const SECTIONS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/organizations', label: 'Organizations' },
  { to: '/contacts', label: 'Contacts' },
  { to: '/deals', label: 'Deals' },
  { to: '/pipeline', label: 'Pipeline' },
];

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
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
