import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Table as TableIcon,
  Clock,
  Wallet,
  Heart,
  ClipboardCheck,
  Gift,
  Monitor,
} from 'lucide-react';
import useAppStore from '@/store/useAppStore';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: '仪表盘' },
  { path: '/guests', icon: Users, label: '宾客名单' },
  { path: '/seating', icon: TableIcon, label: '席位安排' },
  { path: '/signin', icon: ClipboardCheck, label: '现场签到' },
  { path: '/gifts', icon: Gift, label: '礼金登记' },
  { path: '/venue', icon: Monitor, label: '总控大屏' },
  { path: '/timeline', icon: Clock, label: '流程单' },
  { path: '/budget', icon: Wallet, label: '预算' },
];

const Sidebar = () => {
  const { weddingDate, coupleNames } = useAppStore();

  return (
    <aside className="w-64 bg-white border-r border-rose-100 flex flex-col h-screen fixed left-0 top-0 shadow-soft">
      <div className="p-6 border-b border-rose-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-300 to-champagne-400 flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" fill="white" />
          </div>
          <div>
            <h1 className="font-serif text-lg font-semibold text-espresso">婚礼筹备</h1>
            <p className="text-xs text-espresso/60">{coupleNames}</p>
          </div>
        </div>
        {weddingDate && (
          <div className="mt-4 text-center">
            <p className="text-sm text-champagne-600 font-medium">婚礼日期</p>
            <p className="text-lg font-serif font-semibold text-espresso">{weddingDate}</p>
          </div>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-rose-100 to-champagne-100 text-espresso font-medium shadow-sm'
                  : 'text-espresso/70 hover:bg-rose-50 hover:text-espresso'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-rose-50">
        <div className="text-center text-xs text-espresso/50">
          <p>愿你们的爱情甜蜜如初</p>
          <p className="mt-1">💍 💕 🌹</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
