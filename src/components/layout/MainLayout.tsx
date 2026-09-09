import { useAuth } from '@/hooks/useAuth';
import { Link, useLocation } from 'react-router';
import { LayoutDashboard, MessageSquare, Upload, LogOut, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Дашборд', icon: LayoutDashboard },
    { path: '/reviews', label: 'Отработка отзывов', icon: MessageSquare },
    { path: '/upload', label: 'Загрузка Excel', icon: Upload },
  ];

  if (isAdmin) {
    navItems.push({ path: '/admin', label: 'Админ', icon: BarChart3 });
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-slate-800">NPS Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">Справочные системы</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-400">{isAdmin ? 'Администратор' : 'Редактор'}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => logout()} className="shrink-0">
              <LogOut className="w-4 h-4 text-slate-400" />
            </Button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
