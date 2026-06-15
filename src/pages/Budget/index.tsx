import { useState, useMemo, useRef } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Wallet,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Image as ImageIcon,
  Upload,
  X,
  ChevronDown,
  ChevronUp,
  Building2,
  UtensilsCrossed,
  Camera,
  Shirt,
  Flower2,
  Package,
  FileText,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import useAppStore from '@/store/useAppStore';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { BudgetItem, Payment, InspirationImage } from '@/types';
import {
  formatCurrency,
  calculateBudgetStats,
  getPaymentStatusLabel,
  getPaymentStatusColor,
  summarizeByVendor,
  VendorSummary,
  getUpcomingPayments,
  UpcomingPayment,
} from '@/utils/helpers';

const iconMap: Record<string, any> = {
  building: Building2,
  utensils: UtensilsCrossed,
  camera: Camera,
  shirt: Shirt,
  flower: Flower2,
  package: Package,
};

const BudgetPage = () => {
  const {
    budgetCategories,
    budgetItems,
    payments,
    inspirationImages,
    weddingDate,
    addBudgetItem,
    updateBudgetItem,
    deleteBudgetItem,
    addPayment,
    updatePayment,
    deletePayment,
    togglePaymentStatus,
    addInspirationImage,
    deleteInspirationImage,
  } = useAppStore();

  const [showItemModal, setShowItemModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'budget' | 'contract' | 'inspiration'>('budget');
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [itemForm, setItemForm] = useState({
    categoryId: '',
    name: '',
    budgeted: 0,
    actual: 0,
    vendor: '',
    contractNo: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    budgetItemId: '',
    name: '',
    amount: 0,
    dueDate: '',
    status: 'pending' as 'pending' | 'paid',
  });

  const [contractView, setContractView] = useState<'vendor' | 'timeline'>('vendor');
  const [timelineDays, setTimelineDays] = useState<7 | 14 | 30>(14);
  const [timelineCategory, setTimelineCategory] = useState<'all' | 'payment' | 'confirm' | 'check' | 'final'>('all');

  const budgetStats = useMemo(() => calculateBudgetStats(budgetItems), [budgetItems]);

  const categoryStats = useMemo(() => {
    return budgetCategories.map((cat) => {
      const items = budgetItems.filter((i) => i.categoryId === cat.id);
      const budgeted = items.reduce((sum, i) => sum + i.budgeted, 0);
      const actual = items.reduce((sum, i) => sum + i.actual, 0);
      return { ...cat, budgeted, actual, items };
    });
  }, [budgetCategories, budgetItems]);

  const vendorSummaries = useMemo(
    () => summarizeByVendor(budgetItems, payments),
    [budgetItems, payments]
  );

  const pendingPayments = payments.filter((p) => p.status === 'pending');

  const urgentVendors = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return vendorSummaries
      .filter((v) => v.nextPaymentDue && v.nextPaymentDue.dueDate <= today)
      .sort((a, b) => (a.nextPaymentDue?.dueDate || '').localeCompare(b.nextPaymentDue?.dueDate || ''));
  }, [vendorSummaries]);

  const upcomingPayments = useMemo(() => {
    const all = getUpcomingPayments(budgetItems, payments, timelineDays);
    if (timelineCategory === 'all') return all;
    return all.filter((p) => (p.payment.category || 'payment') === timelineCategory);
  }, [budgetItems, payments, timelineDays, timelineCategory]);

  const paymentsByDay = useMemo(() => {
    const groups = new Map<string, UpcomingPayment[]>();
    upcomingPayments.forEach((p) => {
      const key = p.payment.dueDate || 'unknown';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [upcomingPayments]);

  const handleOpenAddItem = (categoryId?: string) => {
    setEditingItem(null);
    setItemForm({
      categoryId: categoryId || budgetCategories[0]?.id || '',
      name: '',
      budgeted: 0,
      actual: 0,
      vendor: '',
      contractNo: '',
    });
    setShowItemModal(true);
  };

  const handleOpenEditItem = (item: BudgetItem) => {
    setEditingItem(item);
    setItemForm({
      categoryId: item.categoryId,
      name: item.name,
      budgeted: item.budgeted,
      actual: item.actual,
      vendor: item.vendor,
      contractNo: item.contractNo,
    });
    setShowItemModal(true);
  };

  const handleSaveItem = () => {
    if (!itemForm.name.trim()) return;

    if (editingItem) {
      updateBudgetItem(editingItem.id, itemForm);
    } else {
      addBudgetItem(itemForm as Omit<BudgetItem, 'id'>);
    }
    setShowItemModal(false);
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('确定要删除这个预算项吗？相关的付款记录也会被删除。')) {
      deleteBudgetItem(id);
    }
  };

  const handleOpenAddPayment = (itemId: string) => {
    setEditingPayment(null);
    setSelectedItemId(itemId);
    setPaymentForm({
      budgetItemId: itemId,
      name: '',
      amount: 0,
      dueDate: '',
      status: 'pending',
    });
    setShowPaymentModal(true);
  };

  const handleOpenEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setSelectedItemId(payment.budgetItemId);
    setPaymentForm({
      budgetItemId: payment.budgetItemId,
      name: payment.name,
      amount: payment.amount,
      dueDate: payment.dueDate,
      status: payment.status,
    });
    setShowPaymentModal(true);
  };

  const handleSavePayment = () => {
    if (!paymentForm.name.trim()) return;

    if (editingPayment) {
      updatePayment(editingPayment.id, paymentForm);
    } else {
      addPayment(paymentForm as Omit<Payment, 'id'>);
    }
    setShowPaymentModal(false);
  };

  const handleDeletePayment = (id: string) => {
    if (confirm('确定要删除这条付款记录吗？')) {
      deletePayment(id);
    }
  };

  const getItemPayments = (itemId: string) => {
    return payments.filter((p) => p.budgetItemId === itemId);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        addInspirationImage({
          dataUrl,
          title: file.name.replace(/\.[^/.]+$/, ''),
          category: '未分类',
        });
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getCategoryIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || Package;
    return IconComponent;
  };

  const formatDueDate = (date: string) => {
    if (!date) return '未设置';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(date);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return `逾期 ${Math.abs(diff)} 天`;
    if (diff === 0) return '今天到期';
    if (diff <= 7) return `${diff} 天后`;
    return date;
  };

  const isDueDateUrgent = (date: string) => {
    if (!date) return false;
    const today = new Date().toISOString().split('T')[0];
    return date <= today;
  };

  const renderVendorCard = (vendor: VendorSummary) => {
    const isExpanded = expandedVendor === vendor.vendor;
    const paymentProgress = vendor.totalActual > 0
      ? Math.min((vendor.totalPaid / vendor.totalActual) * 100, 100)
      : 0;
    const nextDue = vendor.nextPaymentDue;
    const isUrgent = nextDue ? isDueDateUrgent(nextDue.dueDate) : false;

    return (
      <div
        key={vendor.vendor}
        className={`bg-white rounded-2xl shadow-soft overflow-hidden transition-all ${
          isUrgent ? 'ring-2 ring-red-200' : ''
        }`}
      >
        <button
          onClick={() => setExpandedVendor(isExpanded ? null : vendor.vendor)}
          className="w-full p-5 text-left hover:bg-rose-50/30 transition-colors"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isUrgent
                    ? 'bg-gradient-to-br from-red-100 to-red-200'
                    : 'bg-gradient-to-br from-champagne-100 to-rose-100'
                }`}>
                  <Building2 className={`w-5 h-5 ${
                    isUrgent ? 'text-red-500' : 'text-champagne-600'
                  }`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-espresso truncate">
                    {vendor.vendor}
                  </h3>
                  <p className="text-xs text-espresso/50">
                    {vendor.items.length} 个项目 · {vendor.payments.length} 笔付款
                  </p>
                </div>
              </div>

              {nextDue && (
                <div className={`flex items-center gap-1.5 text-xs mb-3 ${
                  isUrgent ? 'text-red-600 font-medium' : 'text-amber-600'
                }`}>
                  {isUrgent ? (
                    <AlertCircle className="w-3.5 h-3.5" />
                  ) : (
                    <Calendar className="w-3.5 h-3.5" />
                  )}
                  <span>
                    下一笔：{nextDue.name} {formatCurrency(nextDue.amount)} · {formatDueDate(nextDue.dueDate)}
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-espresso/60">
                  <span>付款进度</span>
                  <span className="font-medium text-espresso">
                    {formatCurrency(vendor.totalPaid)} / {formatCurrency(vendor.totalActual)}
                  </span>
                </div>
                <div className="h-2 bg-rose-50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      paymentProgress >= 100
                        ? 'bg-gradient-to-r from-green-400 to-green-500'
                        : 'bg-gradient-to-r from-rose-400 to-champagne-400'
                    }`}
                    style={{ width: `${paymentProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className={vendor.totalPending > 0 ? 'text-amber-600' : 'text-green-600'}>
                    {vendor.totalPending > 0
                      ? `待付 ${formatCurrency(vendor.totalPending)}`
                      : '已结清 ✓'}
                  </span>
                  {vendor.totalBudgeted > 0 && vendor.totalActual > vendor.totalBudgeted && (
                    <span className="text-red-500 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      超支 {formatCurrency(vendor.totalActual - vendor.totalBudgeted)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-espresso/40 flex-shrink-0 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        {isExpanded && (
          <div className="border-t border-rose-50 px-5 pb-5 space-y-4">
            <div>
              <h4 className="text-sm font-medium text-espresso/80 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-champagne-500" />
                关联项目
              </h4>
              <div className="space-y-2">
                {vendor.items.map((item) => (
                  <div
                    key={item.name + item.contractNo}
                    className="p-3 bg-rose-50/50 rounded-xl"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-espresso text-sm">{item.name}</p>
                        {item.contractNo && (
                          <p className="text-xs text-espresso/50 mt-0.5">
                            合同号：{item.contractNo}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-xs">
                        <p className="text-espresso/50">
                          预算 {formatCurrency(item.budgeted)}
                        </p>
                        <p className={`font-medium ${
                          item.actual > item.budgeted ? 'text-red-500' : 'text-espresso'
                        }`}>
                          实际 {formatCurrency(item.actual)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {vendor.payments.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-espresso/80 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  付款节点
                </h4>
                <div className="space-y-1.5">
                  {vendor.payments
                    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                    .map((p, idx) => {
                      const pUrgent = p.status === 'pending' && isDueDateUrgent(p.dueDate);
                      return (
                        <div
                          key={`${p.name}-${idx}`}
                          className={`flex items-center gap-3 p-2.5 rounded-xl text-sm ${
                            pUrgent ? 'bg-red-50' : 'bg-rose-50/30'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            p.status === 'paid'
                              ? 'bg-green-400'
                              : pUrgent
                                ? 'bg-red-400 animate-pulse'
                                : 'bg-amber-400'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium truncate ${
                              pUrgent ? 'text-red-700' : 'text-espresso'
                            }`}>
                              {p.name}
                            </p>
                            <p className="text-xs text-espresso/50">
                              {p.dueDate || '无截止日期'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-medium ${
                              p.status === 'paid'
                                ? 'text-green-600 line-through'
                                : pUrgent
                                  ? 'text-red-600'
                                  : 'text-espresso'
                            }`}>
                              {formatCurrency(p.amount)}
                            </p>
                            <p className={`text-xs ${
                              p.status === 'paid' ? 'text-green-500' : 'text-espresso/40'
                            }`}>
                              {getPaymentStatusLabel(p.status)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-espresso">预算管理</h1>
          <p className="mt-2 text-espresso/60">
            记录每一笔开支，让婚礼预算尽在掌握
          </p>
        </div>
        <div className="flex gap-2 bg-white rounded-xl p-1 shadow-soft">
          <button
            onClick={() => setActiveTab('budget')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'budget'
                ? 'bg-gradient-to-r from-rose-400 to-champagne-400 text-white shadow-sm'
                : 'text-espresso/60 hover:text-espresso'
            }`}
          >
            <Wallet className="w-4 h-4 inline mr-2" />
            预算
          </button>
          <button
            onClick={() => setActiveTab('contract')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'contract'
                ? 'bg-gradient-to-r from-rose-400 to-champagne-400 text-white shadow-sm'
                : 'text-espresso/60 hover:text-espresso'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            合同
            {urgentVendors.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs bg-red-500 text-white rounded-full">
                {urgentVendors.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('inspiration')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'inspiration'
                ? 'bg-gradient-to-r from-rose-400 to-champagne-400 text-white shadow-sm'
                : 'text-espresso/60 hover:text-espresso'
            }`}
          >
            <ImageIcon className="w-4 h-4 inline mr-2" />
            灵感
          </button>
        </div>
      </div>

      {activeTab === 'budget' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-espresso/60">总预算</p>
                  <p className="mt-2 text-2xl font-bold text-espresso font-serif">
                    {formatCurrency(budgetStats.totalBudgeted)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-white/80 rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-espresso/60">已支出</p>
                  <p className="mt-2 text-2xl font-bold text-espresso font-serif">
                    {formatCurrency(budgetStats.totalActual)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-white/80 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </div>

            <div className={`rounded-2xl p-5 shadow-soft ${
              budgetStats.overBudget
                ? 'bg-gradient-to-br from-red-50 to-red-100'
                : 'bg-gradient-to-br from-champagne-50 to-champagne-100'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-espresso/60">
                    {budgetStats.overBudget ? '超支' : '剩余'}
                  </p>
                  <p className={`mt-2 text-2xl font-bold font-serif ${
                    budgetStats.overBudget ? 'text-red-600' : 'text-champagne-600'
                  }`}>
                    {formatCurrency(Math.abs(budgetStats.diff))}
                  </p>
                </div>
                <div className="w-12 h-12 bg-white/80 rounded-xl flex items-center justify-center">
                  {budgetStats.overBudget ? (
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                  ) : (
                    <CheckCircle className="w-6 h-6 text-champagne-500" />
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-espresso/60">待付款</p>
                  <p className="mt-2 text-2xl font-bold text-espresso font-serif">
                    {formatCurrency(
                      pendingPayments.reduce((sum, p) => sum + p.amount, 0)
                    )}
                  </p>
                  <p className="text-xs text-espresso/50 mt-1">
                    {pendingPayments.length} 笔待付
                  </p>
                </div>
                <div className="w-12 h-12 bg-white/80 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white rounded-2xl p-5 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-espresso/80">预算使用率</span>
              <span className="text-sm font-semibold text-espresso">
                {budgetStats.percentage.toFixed(1)}%
              </span>
            </div>
            <div className="h-4 bg-rose-50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  budgetStats.overBudget
                    ? 'bg-gradient-to-r from-red-400 to-red-500'
                    : 'bg-gradient-to-r from-rose-400 to-champagne-400'
                }`}
                style={{ width: `${Math.min(budgetStats.percentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Budget Categories */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-semibold text-espresso">
                预算明细
              </h2>
              <Button onClick={() => handleOpenAddItem()}>
                <Plus className="w-4 h-4" />
                添加预算项
              </Button>
            </div>

            {categoryStats.map((category) => {
              const IconComponent = getCategoryIcon(category.icon);
              const isExpanded = expandedCategory === category.id;
              const isOver = category.actual > category.budgeted;

              return (
                <div
                  key={category.id}
                  className="bg-white rounded-2xl shadow-soft overflow-hidden"
                >
                  {/* Category Header */}
                  <button
                    onClick={() =>
                      setExpandedCategory(isExpanded ? null : category.id)
                    }
                    className="w-full p-5 flex items-center gap-4 hover:bg-rose-50/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-100 to-champagne-100 flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-rose-500" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-espresso">{category.name}</h3>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-espresso/60">
                          预算: {formatCurrency(category.budgeted)}
                        </span>
                        <span className={`text-sm font-medium ${
                          isOver ? 'text-red-500' : 'text-green-600'
                        }`}>
                          实际: {formatCurrency(category.actual)}
                        </span>
                        {category.budgeted > 0 && (
                          <span className="text-xs text-espresso/40">
                            {((category.actual / category.budgeted) * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAddItem(category.id);
                        }}
                        className="px-3 py-1.5 text-sm text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        + 添加项
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-espresso/40" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-espresso/40" />
                      )}
                    </div>
                  </button>

                  {/* Progress bar */}
                  <div className="px-5 pb-4">
                    <div className="h-2 bg-rose-50 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOver
                            ? 'bg-gradient-to-r from-red-400 to-red-500'
                            : 'bg-gradient-to-r from-rose-400 to-champagne-400'
                        }`}
                        style={{
                          width: `${category.budgeted > 0 ? Math.min((category.actual / category.budgeted) * 100, 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Items */}
                  {isExpanded && (
                    <div className="border-t border-rose-50">
                      {category.items.length === 0 ? (
                        <div className="p-8 text-center">
                          <p className="text-sm text-espresso/40">暂无预算项</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-rose-50">
                          {category.items.map((item) => {
                            const itemPayments = getItemPayments(item.id);
                            const isOverBudget = item.actual > item.budgeted;

                            return (
                              <div
                                key={item.id}
                                className="p-4 hover:bg-rose-50/30 transition-colors"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                      <h4 className="font-medium text-espresso">
                                        {item.name}
                                      </h4>
                                      {isOverBudget && (
                                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                                          超支
                                        </span>
                                      )}
                                    </div>
                                    {item.vendor && (
                                      <p className="text-sm text-espresso/50 mt-1">
                                        商家: {item.vendor}
                                        {item.contractNo && ` · 合同: ${item.contractNo}`}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-4 mt-2">
                                      <span className="text-sm text-espresso/70">
                                        预算: {formatCurrency(item.budgeted)}
                                      </span>
                                      <span className={`text-sm font-medium ${
                                        isOverBudget ? 'text-red-500' : 'text-espresso/80'
                                      }`}>
                                        实际: {formatCurrency(item.actual)}
                                      </span>
                                      {item.budgeted > 0 && (
                                        <span className="text-xs text-espresso/40">
                                          {((item.actual / item.budgeted) * 100).toFixed(0)}%
                                        </span>
                                      )}
                                    </div>

                                    {/* Payments */}
                                    {itemPayments.length > 0 && (
                                      <div className="mt-3 space-y-2">
                                        <p className="text-xs font-medium text-espresso/60">
                                          付款节点:
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                          {itemPayments.map((p) => (
                                            <button
                                              key={p.id}
                                              onClick={() => togglePaymentStatus(p.id)}
                                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors ${
                                                getPaymentStatusColor(p.status)
                                              }`}
                                              title="点击切换付款状态"
                                            >
                                              {p.status === 'paid' ? (
                                                <CheckCircle className="w-3 h-3" />
                                              ) : (
                                                <Clock className="w-3 h-3" />
                                              )}
                                              {p.name}: {formatCurrency(p.amount)}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleOpenAddPayment(item.id)}
                                      className="p-2 rounded-lg hover:bg-green-50 text-espresso/40 hover:text-green-500"
                                      title="添加付款"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleOpenEditItem(item)}
                                      className="p-2 rounded-lg hover:bg-champagne-50 text-espresso/40 hover:text-champagne-500"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteItem(item.id)}
                                      className="p-2 rounded-lg hover:bg-red-50 text-espresso/40 hover:text-red-500"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeTab === 'contract' && (
        <>
          {/* Contract Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-champagne-50 to-champagne-100 rounded-2xl p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-espresso/60">供应商数</p>
                  <p className="mt-2 text-2xl font-bold text-espresso font-serif">
                    {vendorSummaries.filter(v => v.vendor !== '未指定供应商').length}
                    <span className="text-sm font-normal text-espresso/50 ml-1">家</span>
                  </p>
                </div>
                <div className="w-12 h-12 bg-white/80 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-champagne-500" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-2xl p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-espresso/60">合同项目数</p>
                  <p className="mt-2 text-2xl font-bold text-espresso font-serif">
                    {budgetItems.length}
                    <span className="text-sm font-normal text-espresso/50 ml-1">项</span>
                  </p>
                </div>
                <div className="w-12 h-12 bg-white/80 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-rose-500" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-espresso/60">已付款合计</p>
                  <p className="mt-2 text-2xl font-bold text-espresso font-serif">
                    {formatCurrency(
                      vendorSummaries.reduce((s, v) => s + v.totalPaid, 0)
                    )}
                  </p>
                </div>
                <div className="w-12 h-12 bg-white/80 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </div>

            <div className={`rounded-2xl p-5 shadow-soft ${
              urgentVendors.length > 0
                ? 'bg-gradient-to-br from-red-50 to-red-100'
                : 'bg-gradient-to-br from-amber-50 to-amber-100'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-espresso/60">
                    {urgentVendors.length > 0 ? '紧急待付' : '待付款合计'}
                  </p>
                  <p className={`mt-2 text-2xl font-bold font-serif ${
                    urgentVendors.length > 0 ? 'text-red-600' : 'text-amber-600'
                  }`}>
                    {formatCurrency(
                      vendorSummaries.reduce((s, v) => s + v.totalPending, 0)
                    )}
                  </p>
                  <p className="text-xs text-espresso/50 mt-1">
                    {urgentVendors.length > 0
                      ? `${urgentVendors.length} 家供应商需尽快处理`
                      : `${pendingPayments.length} 笔待付款`}
                  </p>
                </div>
                <div className="w-12 h-12 bg-white/80 rounded-xl flex items-center justify-center">
                  {urgentVendors.length > 0 ? (
                    <AlertCircle className="w-6 h-6 text-red-500" />
                  ) : (
                    <Clock className="w-6 h-6 text-amber-500" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {urgentVendors.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <h3 className="font-semibold text-red-700">
                  需要尽快处理的付款节点
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {urgentVendors.map((v) => (
                  <div
                    key={v.vendor + '-urgent'}
                    className="bg-white rounded-xl p-4 border border-red-100"
                  >
                    <p className="font-medium text-espresso text-sm">{v.vendor}</p>
                    {v.nextPaymentDue && (
                      <>
                        <p className="text-xs text-red-600 mt-1 font-medium">
                          {v.nextPaymentDue.name} · {formatCurrency(v.nextPaymentDue.amount)}
                        </p>
                        <p className="text-xs text-red-500 mt-0.5">
                          {formatDueDate(v.nextPaymentDue.dueDate)}
                        </p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="font-serif text-xl font-semibold text-espresso">
                  供应商合同一览
                </h2>
                <div className="flex items-center gap-1 bg-espresso/5 rounded-lg p-1">
                  <button
                    onClick={() => setContractView('vendor')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      contractView === 'vendor'
                        ? 'bg-white text-espresso shadow-sm'
                        : 'text-espresso/60 hover:text-espresso'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5 inline mr-1" />
                    按供应商
                  </button>
                  <button
                    onClick={() => setContractView('timeline')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                      contractView === 'timeline'
                        ? 'bg-white text-espresso shadow-sm'
                        : 'text-espresso/60 hover:text-espresso'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    到期时间线
                    {upcomingPayments.length > 0 && (
                      <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 text-[10px] bg-red-500 text-white rounded-full">
                        {upcomingPayments.length}
                      </span>
                    )}
                  </button>
                </div>

                {contractView === 'timeline' && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1 border border-espresso/10 rounded-lg p-1">
                      {[7, 14, 30].map((days) => (
                        <button
                          key={days}
                          onClick={() => setTimelineDays(days as 7 | 14 | 30)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                            timelineDays === days
                              ? 'bg-espresso/10 text-espresso'
                              : 'text-espresso/50 hover:text-espresso/70'
                          }`}
                        >
                          未来{days}天
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 border border-espresso/10 rounded-lg p-1">
                      {([
                        { key: 'all', label: '全部' },
                        { key: 'payment', label: '付款' },
                        { key: 'confirm', label: '确认' },
                        { key: 'check', label: '检查' },
                        { key: 'final', label: '收尾' },
                      ] as { key: typeof timelineCategory; label: string }[]).map((cat) => (
                        <button
                          key={cat.key}
                          onClick={() => setTimelineCategory(cat.key)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                            timelineCategory === cat.key
                              ? 'bg-rose-100 text-rose-700'
                              : 'text-espresso/50 hover:text-espresso/70'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Button onClick={() => handleOpenAddItem()}>
                <Plus className="w-4 h-4" />
                添加预算项
              </Button>
            </div>

            {contractView === 'timeline' ? (
              <div className="bg-white rounded-2xl p-6 shadow-soft">
                {upcomingPayments.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
                      <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                    <h3 className="font-serif text-lg font-semibold text-espresso mb-2">
                      未来{timelineDays}天没有待付款项
                    </h3>
                    <p className="text-espresso/50 text-sm">
                      所有合同节点都已安排妥当，祝婚礼顺利 💕
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-espresso/5">
                      <div>
                        <p className="text-xs text-espresso/50 mb-1">
                          未来{timelineDays}天
                        </p>
                        <p className="text-sm text-espresso/80">
                          共 <span className="font-bold text-espresso">{upcomingPayments.length}</span> 笔待付款，
                          合计 <span className="font-bold text-rose-600">
                            {formatCurrency(upcomingPayments.reduce((s, p) => s + p.payment.amount, 0))}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                          <span className="text-espresso/60">逾期</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                          <span className="text-espresso/60">3天内</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-champagne-400" />
                          <span className="text-espresso/60">7天内</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                          <span className="text-espresso/60">稍后</span>
                        </div>
                      </div>
                    </div>

                    <div className="relative">
                      {/* Vertical line */}
                      <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-gradient-to-b from-red-300 via-amber-300 to-green-300 rounded-full" />

                      <div className="space-y-5">
                        {paymentsByDay.map(([day, list], dayIdx) => {
                          const overdueCount = list.filter((p) => p.overdue).length;
                          const urgentCount = list.filter(
                            (p) => !p.overdue && p.daysUntilDue <= 3
                          ).length;
                          const sum = list.reduce((s, p) => s + p.payment.amount, 0);
                          const firstItem = list[0];

                          let dotColor = 'bg-green-400';
                          if (overdueCount > 0) dotColor = 'bg-red-500';
                          else if (urgentCount > 0) dotColor = 'bg-amber-500';
                          else if (firstItem.daysUntilDue <= 7)
                            dotColor = 'bg-champagne-400';

                          const dayLabel = list[0].dueLabel;

                          return (
                            <div key={day} className="relative pl-16">
                              {/* Date bubble */}
                              <div className={`absolute left-0 w-12 h-12 rounded-full ${dotColor} text-white flex flex-col items-center justify-center text-xs font-bold shadow-md z-10 ring-4 ring-white`}>
                                <span className="text-[10px] leading-none">
                                  {new Date(day + 'T00:00:00').getMonth() + 1}月
                                </span>
                                <span className="leading-none">
                                  {new Date(day + 'T00:00:00').getDate()}
                                </span>
                              </div>

                              <div className="pt-1">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <span
                                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                      overdueCount > 0
                                        ? 'bg-red-100 text-red-700'
                                        : urgentCount > 0
                                          ? 'bg-amber-100 text-amber-700'
                                          : firstItem.daysUntilDue <= 7
                                            ? 'bg-champagne-100 text-champagne-700'
                                            : 'bg-green-100 text-green-700'
                                    }`}
                                  >
                                    {dayLabel}
                                  </span>
                                  <span className="text-xs text-espresso/50">
                                    {list.length} 笔 · 合计
                                    <span
                                      className={`ml-1 font-bold ${
                                        overdueCount > 0 ? 'text-red-600' : 'text-espresso'
                                      }`}
                                    >
                                      {formatCurrency(sum)}
                                    </span>
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  {list.map((p, idx) => {
                                    const cat = p.payment.category || 'payment';
                                    const catLabel: Record<string, { label: string; color: string; icon: string }> = {
                                      payment: { label: '付款', color: 'bg-blue-100 text-blue-700', icon: '💰' },
                                      confirm: { label: '确认', color: 'bg-purple-100 text-purple-700', icon: '📞' },
                                      check: { label: '检查', color: 'bg-indigo-100 text-indigo-700', icon: '✅' },
                                      final: { label: '收尾', color: 'bg-rose-100 text-rose-700', icon: '🎯' },
                                    };
                                    const ci = catLabel[cat] || catLabel.payment;
                                    const ms = p.payment.milestoneStatus || (p.payment.status === 'paid' ? 'done' : 'todo');
                                    const msLabel: Record<string, { label: string; color: string }> = {
                                      todo: { label: '待处理', color: 'bg-slate-100 text-slate-600 hover:bg-slate-200' },
                                      contacted: { label: '已沟通', color: 'bg-sky-100 text-sky-700 hover:bg-sky-200' },
                                      followup: { label: '待催办', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
                                      done: { label: '已完成', color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
                                    };
                                    const msInfo = msLabel[ms];
                                    const nextStatus: Record<string, typeof ms> = {
                                      todo: 'contacted',
                                      contacted: 'followup',
                                      followup: 'done',
                                      done: 'todo',
                                    };
                                    const daysUntilWedding = (() => {
                                      if (!weddingDate) return null;
                                      const d1 = new Date(weddingDate + 'T00:00:00').getTime();
                                      const d2 = new Date(p.payment.dueDate + 'T00:00:00').getTime();
                                      const diff = Math.round((d2 - d1) / 86400000);
                                      return diff;
                                    })();
                                    return (
                                    <div
                                      key={p.payment.id}
                                      className={`bg-espresso/[0.02] border rounded-xl p-3.5 transition-all hover:shadow-md ${
                                        ms === 'done' ? 'opacity-70' : ''
                                      } ${
                                        p.overdue
                                          ? 'border-red-200 bg-red-50/40'
                                          : p.daysUntilDue <= 3
                                            ? 'border-amber-200 bg-amber-50/40'
                                            : 'border-espresso/5 hover:border-champagne-200'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <h4 className="font-medium text-espresso text-sm">
                                              {p.payment.name}
                                            </h4>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${ci.color} font-semibold`}>
                                              {ci.icon} {ci.label}
                                            </span>
                                            <span className="text-xs bg-white/80 text-espresso/60 px-2 py-0.5 rounded-full border border-espresso/5">
                                              {p.vendor}
                                            </span>
                                            {daysUntilWedding !== null && (
                                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                                Math.abs(daysUntilWedding) <= 3
                                                  ? 'bg-red-100 text-red-700'
                                                  : daysUntilWedding < 0
                                                    ? 'bg-slate-100 text-slate-500'
                                                    : daysUntilWedding === 0
                                                      ? 'bg-rose-100 text-rose-700'
                                                      : 'bg-champagne-50 text-champagne-700'
                                              }`}>
                                                {daysUntilWedding < 0
                                                  ? `婚礼后${Math.abs(daysUntilWedding)}天`
                                                  : daysUntilWedding === 0
                                                    ? '💒 婚礼当天'
                                                    : `婚礼前${daysUntilWedding}天`}
                                              </span>
                                            )}
                                            {p.overdue && (
                                              <span className="inline-flex items-center gap-1 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">
                                                <AlertCircle className="w-3 h-3" />
                                                请优先处理
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-xs text-espresso/50">
                                            关联项目：{p.itemName}
                                          </p>
                                          {p.payment.notes && (
                                            <p className="text-xs text-espresso/60 mt-1.5 pl-2 border-l-2 border-champagne-200">
                                              📝 {p.payment.notes}
                                            </p>
                                          )}
                                        </div>
                                        <div className="text-right flex-shrink-0 space-y-1.5">
                                          <p
                                            className={`font-bold ${
                                              cat === 'confirm' || cat === 'check'
                                                ? 'text-espresso/40 text-xs font-normal line-through'
                                                : p.overdue
                                                  ? 'text-red-600'
                                                  : p.daysUntilDue <= 3
                                                    ? 'text-amber-700'
                                                    : 'text-espresso'
                                            }`}
                                          >
                                            {cat === 'confirm' || cat === 'check'
                                              ? '（沟通类）'
                                              : formatCurrency(p.payment.amount)}
                                          </p>
                                          <div className="flex items-center gap-1 justify-end flex-wrap">
                                            <button
                                              onClick={() => {
                                                const next = nextStatus[ms];
                                                const patch: Partial<Payment> = {
                                                  milestoneStatus: next,
                                                };
                                                if (
                                                  (cat === 'payment' || cat === 'final') &&
                                                  next === 'done' &&
                                                  p.payment.status !== 'paid'
                                                ) {
                                                  patch.status = 'paid';
                                                } else if (
                                                  (cat === 'payment' || cat === 'final') &&
                                                  next === 'todo' &&
                                                  p.payment.status === 'paid'
                                                ) {
                                                  patch.status = 'pending';
                                                }
                                                updatePayment(p.payment.id, patch);
                                              }}
                                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors ${msInfo.color}`}
                                            >
                                              {msInfo.label}
                                            </button>
                                            {cat !== 'confirm' && cat !== 'check' && (
                                              <button
                                                onClick={() =>
                                                  togglePaymentStatus(p.payment.id)
                                                }
                                                className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors ${
                                                  p.overdue
                                                    ? 'bg-red-500 hover:bg-red-600 text-white'
                                                    : p.daysUntilDue <= 3
                                                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                                      : 'bg-gradient-to-r from-green-400 to-emerald-500 hover:shadow-md text-white'
                                                }`}
                                              >
                                                <CheckCircle className="w-3 h-3" />
                                                {p.payment.status === 'paid' ? '已付' : '标记已付'}
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : vendorSummaries.length === 0 ? (
              <div className="bg-white rounded-2xl p-16 text-center shadow-soft">
                <Building2 className="w-16 h-16 text-espresso/20 mx-auto mb-4" />
                <p className="text-espresso/50 mb-4">还没有供应商数据</p>
                <Button onClick={() => handleOpenAddItem()}>
                  <Plus className="w-4 h-4" />
                  添加第一个预算项
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {urgentVendors.map(renderVendorCard)}
                {vendorSummaries
                  .filter((v) => !urgentVendors.find((u) => u.vendor === v.vendor))
                  .map(renderVendorCard)}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'inspiration' && (
        /* Inspiration Tab */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-espresso/60">
              上传你的婚礼灵感图片，记录喜欢的风格
            </p>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4" />
                上传图片
              </Button>
            </div>
          </div>

          {inspirationImages.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 text-center shadow-soft">
              <ImageIcon className="w-16 h-16 text-espresso/20 mx-auto mb-4" />
              <p className="text-espresso/50 mb-4">还没有灵感图片</p>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4" />
                上传第一张灵感图
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {inspirationImages.map((img) => (
                <div
                  key={img.id}
                  className="relative group bg-white rounded-xl overflow-hidden shadow-soft"
                >
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={img.dataUrl}
                      alt={img.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-espresso truncate">
                      {img.title}
                    </p>
                    <p className="text-xs text-espresso/50">{img.category}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('确定删除这张图片吗？')) {
                        deleteInspirationImage(img.id);
                      }
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                  >
                    <X className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              ))}

              {/* Add more */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square border-2 border-dashed border-rose-200 bg-white/50 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-white hover:border-rose-400 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center group-hover:bg-rose-200 transition-colors">
                  <Plus className="w-6 h-6 text-rose-500" />
                </div>
                <span className="text-sm text-espresso/50 group-hover:text-rose-500 transition-colors">
                  添加图片
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Budget Item Modal */}
      <Modal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        title={editingItem ? '编辑预算项' : '添加预算项'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-espresso/80 mb-2">
              分类
            </label>
            <select
              value={itemForm.categoryId}
              onChange={(e) =>
                setItemForm({ ...itemForm, categoryId: e.target.value })
              }
              className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
            >
              {budgetCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-espresso/80 mb-2">
              项目名称 *
            </label>
            <input
              type="text"
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
              placeholder="如：婚宴场地"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-espresso/80 mb-2">
                预算金额
              </label>
              <input
                type="number"
                min="0"
                value={itemForm.budgeted}
                onChange={(e) =>
                  setItemForm({
                    ...itemForm,
                    budgeted: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-espresso/80 mb-2">
                实际金额
              </label>
              <input
                type="number"
                min="0"
                value={itemForm.actual}
                onChange={(e) =>
                  setItemForm({
                    ...itemForm,
                    actual: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-espresso/80 mb-2">
                服务商
              </label>
              <input
                type="text"
                value={itemForm.vendor}
                onChange={(e) =>
                  setItemForm({ ...itemForm, vendor: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
                placeholder="商家名称（用于合同汇总）"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-espresso/80 mb-2">
                合同编号
              </label>
              <input
                type="text"
                value={itemForm.contractNo}
                onChange={(e) =>
                  setItemForm({ ...itemForm, contractNo: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
                placeholder="可选"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowItemModal(false)}>
              取消
            </Button>
            <Button onClick={handleSaveItem}>
              {editingItem ? '保存' : '添加'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title={editingPayment ? '编辑付款' : '添加付款节点'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-espresso/80 mb-2">
              付款名称 *
            </label>
            <input
              type="text"
              value={paymentForm.name}
              onChange={(e) =>
                setPaymentForm({ ...paymentForm, name: e.target.value })
              }
              className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
              placeholder="如：定金、中期款、尾款"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-espresso/80 mb-2">
                金额
              </label>
              <input
                type="number"
                min="0"
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-espresso/80 mb-2">
                状态
              </label>
              <select
                value={paymentForm.status}
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    status: e.target.value as 'pending' | 'paid',
                  })
                }
                className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
              >
                <option value="pending">待付款</option>
                <option value="paid">已付款</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-espresso/80 mb-2">
              到期日期
            </label>
            <input
              type="date"
              value={paymentForm.dueDate}
              onChange={(e) =>
                setPaymentForm({ ...paymentForm, dueDate: e.target.value })
              }
              className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            {editingPayment && (
              <Button
                variant="danger"
                className="mr-auto"
                onClick={() => {
                  handleDeletePayment(editingPayment.id);
                  setShowPaymentModal(false);
                }}
              >
                删除
              </Button>
            )}
            <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>
              取消
            </Button>
            <Button onClick={handleSavePayment}>
              {editingPayment ? '保存' : '添加'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BudgetPage;
