import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import BottomTabBar from './components/BottomTabBar';
import SignInPage from './pages/SignIn';
import Tasks from './pages/Tasks';
import Notes from './pages/Notes';
import Mood from './pages/Mood';
import Vitals from './pages/Vitals';
import Sequences from './pages/Sequences';
import StepsPage from './pages/Steps';
import ScannedProducts from './pages/ScannedProducts';
import FoodCache from './pages/FoodCache';
import { useAuth } from './hooks/useAuth';

function AppShell() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) return <SignInPage />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-56 pb-16 md:pb-0 min-h-screen">
        <Routes>
          <Route path="/" element={<Navigate to="/sequences" replace />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/mood" element={<Mood />} />
          <Route path="/vitals" element={<Vitals />} />
          <Route path="/sequences" element={<Sequences />} />
          <Route path="/steps" element={<StepsPage />} />
          <Route path="/products" element={<ScannedProducts />} />
          <Route path="/food-cache" element={<FoodCache />} />
        </Routes>
      </main>
      <BottomTabBar />
    </div>
  );
}

export default function App() {
  return <AppShell />;
}
