import { Routes, Route } from 'react-router-dom';
import Tasks from './pages/Tasks';
import Notes from './pages/Notes';
import Mood from './pages/Mood';
import Vitals from './pages/Vitals';
import Sequences from './pages/Sequences';
import ScannedProducts from './pages/ScannedProducts';
import FoodCache from './pages/FoodCache';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Tasks />} />
      <Route path="/tasks" element={<Tasks />} />
      <Route path="/notes" element={<Notes />} />
      <Route path="/mood" element={<Mood />} />
      <Route path="/vitals" element={<Vitals />} />
      <Route path="/sequences" element={<Sequences />} />
      <Route path="/products" element={<ScannedProducts />} />
      <Route path="/food-cache" element={<FoodCache />} />
    </Routes>
  );
}
