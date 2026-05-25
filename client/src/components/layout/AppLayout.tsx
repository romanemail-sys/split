import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <MobileNav />
        <main className="flex-1 bg-white text-slate-900 overflow-y-auto min-h-screen pt-[88px] md:pt-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
