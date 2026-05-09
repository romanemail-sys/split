import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar />
      <main className="flex-1 bg-white text-slate-900 overflow-y-auto min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
