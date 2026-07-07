import { NavLink } from 'react-router-dom';
import { navItems } from './navConfig';
import { useAuth } from '../hooks/useAuth';

export default function Sidebar() {
  const { user, signOut } = useAuth();

  return (
    <aside className="hidden md:flex md:w-56 flex-col border-r border-gray-200 bg-white h-screen fixed left-0 top-0">
      <div className="p-4 border-b border-gray-200 font-bold text-lg">Autistic</div>
      <nav className="flex-1 py-4 flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 mx-2 rounded-lg text-sm ${
                isActive
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-gray-200 p-3">
        <div className="text-xs text-gray-400 truncate mb-1.5">{user?.email}</div>
        <button
          onClick={signOut}
          className="w-full text-left text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded px-2 py-1"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
