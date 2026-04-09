import { Routes, Route } from 'react-router-dom';
import Landing from '@/pages/Landing';
import Dashboard from '@/pages/Dashboard';
import SessionView from '@/pages/SessionView';
import PlayerView from '@/pages/PlayerView';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/campaign/:id/session" element={<SessionView />} />
      <Route path="/campaign/:id/player" element={<PlayerView />} />
    </Routes>
  );
}
