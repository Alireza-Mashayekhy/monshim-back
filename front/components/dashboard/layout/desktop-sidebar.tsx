'use client';

import NavItem from './nav-item';
import { dashboardRoutes } from './routes';

export default function DesktopSidebar() {
  return (
    <aside className="hidden lg:flex fixed right-0 top-0 h-screen w-60 bg-white border-l">
      <div className="flex flex-col w-full">
        <div className="h-20 flex items-center justify-center border-b">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white text-xl">
              💈
            </div>

            <div>
              <p className="font-bold">Barber Panel</p>

              <p className="text-xs text-slate-500">مدیریت سالن</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 space-y-2">
          {dashboardRoutes.map(route => (
            <NavItem key={route.href} {...route} />
          ))}
        </div>
      </div>
    </aside>
  );
}
