import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const LINKS = [
  { to: '/dashboard', label: 'Dashboard', roles: ['ADMIN', 'APPROVER', 'AUDITOR'] },
  { to: '/wallet', label: 'Wallet', roles: ['ADMIN', 'APPROVER', 'AUDITOR'] },
  { to: '/transactions', label: 'Transactions', roles: ['ADMIN', 'APPROVER', 'AUDITOR'] },
  { to: '/approvals', label: 'Approvals', roles: ['APPROVER'] },
  { to: '/users', label: 'Users', roles: ['ADMIN'] },
  { to: '/audit', label: 'Audit log', roles: ['ADMIN', 'AUDITOR'] },
];

export function Sidebar() {
  const { user } = useAuth();
  const links = LINKS.filter((link) => link.roles.includes(user.role));

  return (
    <aside className="w-56 shrink-0 border-r border-ink-800 bg-ink-950 px-3 py-6 hidden md:block">
      <nav className="space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `block rounded-md px-3 py-2 text-sm font-medium transition-colors focus-ring ${
                isActive ? 'bg-ink-800 text-signal-400' : 'text-ink-300 hover:bg-ink-900 hover:text-ink-100'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
