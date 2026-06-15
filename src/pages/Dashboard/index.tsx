import { useNavigate } from 'react-router-dom';
import {
  Users,
  Table as TableIcon,
  Clock,
  Wallet,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  ChevronRight,
  Heart,
  Calendar,
} from 'lucide-react';
import useAppStore from '@/store/useAppStore';
import { calculateGuestsStats, calculateBudgetStats, formatCurrency } from '@/utils/helpers';

const Dashboard = () => {
  const navigate = useNavigate();
  const { guests, tables, timeline, budgetItems, weddingDate, coupleNames } = useAppStore();

  const guestStats = calculateGuestsStats(guests);
  const budgetStats = calculateBudgetStats(budgetItems);
  const confirmedWithPlusOne = guestStats.totalPeople;
  const totalTables = tables.length;
  const timelineItems = timeline.length;

  const quickActions = [
    { icon: Users, label: '宾客名单', desc: `共 ${guestStats.total} 位宾客`, path: '/guests', color: 'from-rose-400 to-rose-500' },
    { icon: TableIcon, label: '席位安排', desc: `${totalTables} 桌已设置`, path: '/seating', color: 'from-champagne-400 to-champagne-500' },
    { icon: Clock, label: '流程单', desc: `${timelineItems} 个环节`, path: '/timeline', color: 'from-green-400 to-green-500' },
    { icon: Wallet, label: '预算管理', desc: formatCurrency(budgetStats.totalBudgeted), path: '/budget', color: 'from-blue-400 to-blue-500' },
  ];

  const progressItems = [
    { label: '宾客确认', value: guestStats.total > 0 ? Math.round((guestStats.confirmed / guestStats.total) * 100) : 0, color: 'bg-rose-400' },
    { label: '席位安排', value: totalTables > 0 ? Math.round((guests.filter(g => g.tableId).length / guestStats.confirmed) * 100) : 0, color: 'bg-champagne-400' },
    { label: '流程编排', value: timelineItems > 0 ? 100 : 0, color: 'bg-green-400' },
    { label: '预算支出', value: Math.round(budgetStats.percentage), color: 'bg-blue-400' },
  ];

  const upcomingTasks = [
    { title: '确认场地布置方案', date: '10月10日前', status: 'pending' },
    { title: '发送电子请柬', date: '9月30日前', status: 'pending' },
    { title: '试菜确认菜单', date: '10月5日前', status: 'done' },
    { title: '礼服最终试穿', date: '10月15日', status: 'pending' },
    { title: '与摄影团队沟通', date: '10月12日前', status: 'pending' },
  ];

  const daysUntil = () => {
    if (!weddingDate) return 0;
    const today = new Date();
    const wedding = new Date(weddingDate);
    const diff = Math.ceil((wedding.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-espresso">
            欢迎回来，{coupleNames.split(' & ')[0]}
          </h1>
          <p className="mt-2 text-espresso/60">
            距离婚礼还有 <span className="text-rose-500 font-semibold">{daysUntil()}</span> 天，筹备进度一切顺利！
          </p>
        </div>
        <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-rose-100 to-champagne-100 rounded-2xl">
          <Calendar className="w-5 h-5 text-rose-500" />
          <div>
            <p className="text-sm text-espresso/60">婚礼日期</p>
            <p className="font-semibold text-espresso">{weddingDate}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-2xl p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-espresso/60">宾客总数</p>
              <p className="mt-2 text-3xl font-bold text-espresso font-serif">{guestStats.total}</p>
              <p className="mt-1 text-sm text-rose-600">已确认 {guestStats.confirmed} 人</p>
            </div>
            <div className="w-14 h-14 bg-white/80 rounded-2xl flex items-center justify-center shadow-sm">
              <Users className="w-7 h-7 text-rose-500" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-champagne-50 to-champagne-100 rounded-2xl p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-espresso/60">确认出席</p>
              <p className="mt-2 text-3xl font-bold text-espresso font-serif">{confirmedWithPlusOne}</p>
              <p className="mt-1 text-sm text-champagne-600">含随行人员</p>
            </div>
            <div className="w-14 h-14 bg-white/80 rounded-2xl flex items-center justify-center shadow-sm">
              <CheckCircle className="w-7 h-7 text-champagne-500" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-espresso/60">餐桌数量</p>
              <p className="mt-2 text-3xl font-bold text-espresso font-serif">{totalTables}</p>
              <p className="mt-1 text-sm text-green-600">共 {totalTables * 10} 个座位</p>
            </div>
            <div className="w-14 h-14 bg-white/80 rounded-2xl flex items-center justify-center shadow-sm">
              <TableIcon className="w-7 h-7 text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-espresso/60">预算总额</p>
              <p className="mt-2 text-2xl font-bold text-espresso font-serif">{formatCurrency(budgetStats.totalBudgeted)}</p>
              <p className={`mt-1 text-sm ${budgetStats.overBudget ? 'text-red-600' : 'text-green-600'}`}>
                {budgetStats.overBudget ? '超支 ' : '剩余 '}
                {formatCurrency(Math.abs(budgetStats.diff))}
              </p>
            </div>
            <div className="w-14 h-14 bg-white/80 rounded-2xl flex items-center justify-center shadow-sm">
              <Wallet className="w-7 h-7 text-blue-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <h2 className="font-serif text-xl font-semibold text-espresso mb-4">快速入口</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="group bg-white rounded-2xl p-5 shadow-soft hover:shadow-card transition-all duration-300 text-left"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-espresso">{action.label}</h3>
                <p className="mt-1 text-sm text-espresso/50">{action.desc}</p>
                <div className="mt-3 flex items-center text-sm text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>进入</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>

          {/* Progress Section */}
          <h2 className="font-serif text-xl font-semibold text-espresso mt-8 mb-4">筹备进度</h2>
          <div className="bg-white rounded-2xl p-6 shadow-soft">
            <div className="space-y-5">
              {progressItems.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-espresso/80">{item.label}</span>
                    <span className="text-sm font-semibold text-espresso">{item.value}%</span>
                  </div>
                  <div className="h-2.5 bg-rose-50 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-700 ease-out`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div>
          <h2 className="font-serif text-xl font-semibold text-espresso mb-4">待办事项</h2>
          <div className="bg-white rounded-2xl p-5 shadow-soft">
            <div className="space-y-3">
              {upcomingTasks.map((task, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-rose-50 transition-colors"
                >
                  {task.status === 'done' ? (
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-rose-300 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${task.status === 'done' ? 'text-espresso/40 line-through' : 'text-espresso'}`}>
                      {task.title}
                    </p>
                    <p className="text-xs text-espresso/50 mt-0.5">{task.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Budget Alert */}
          {budgetStats.overBudgetItems.length > 0 && (
            <div className="mt-6 bg-red-50 border border-red-100 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold text-red-800">超支预警</h3>
              </div>
              <p className="text-sm text-red-700 mb-3">
                有 {budgetStats.overBudgetItems.length} 项预算超支
              </p>
              <button
                onClick={() => navigate('/budget')}
                className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
              >
                查看详情 <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Love Quote */}
      <div className="text-center py-8">
        <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/60 rounded-full">
          <Heart className="w-4 h-4 text-rose-400" fill="#fb7185" />
          <p className="text-sm text-espresso/60 font-serif italic">
            "愿有岁月可回首，且以深情共白头"
          </p>
          <Heart className="w-4 h-4 text-rose-400" fill="#fb7185" />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
