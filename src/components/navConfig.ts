export interface NavItem {
  path: string;
  label: string;
  icon: string;
}

export const navItems: NavItem[] = [
  { path: '/tasks', label: 'Tasks', icon: '✅' },
  { path: '/notes', label: 'Notes', icon: '📝' },
  { path: '/mood', label: 'Mood', icon: '😊' },
  { path: '/vitals', label: 'Vitals', icon: '❤️' },
  { path: '/sequences', label: 'Sequences', icon: '🔄' },
  { path: '/products', label: 'Products', icon: '🛒' },
  { path: '/food-cache', label: 'Food', icon: '🍎' },
];
