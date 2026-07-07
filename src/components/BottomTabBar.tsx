import { NavLink } from 'react-router-dom';
import { navItems } from './navConfig';
import { useAuth } from '../hooks/useAuth';

export default function BottomTabBar() {
  const { signOut } = useAuth();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center z-50">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `flex flex-col items-center py-2 px-2 text-xs min-w-0 ${
              isActive ? 'text-gray-900 font-medium' : 'text-gray-500'
            }`
          }
        >
          <span className="text-xl mb-0.5">{item.icon}</span>
          <span className="truncate max-w-full">{item.label}</span>
        </NavLink>
      ))}
      <button
        onClick={signOut}
        title="Sign out"
        className="flex flex-col items-center py-2 px-2 text-xs text-gray-400 hover:text-gray-600"
      >
        <span className="text-xl mb-0.5">🚪</span>
        <span>Sign out</span>
      </button>
    </nav>
  );
}
