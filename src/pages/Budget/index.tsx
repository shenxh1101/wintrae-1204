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
  const [activeTab, setActiveTab] = useState<'budget' | 'inspiration'>('budget');
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

  const budgetStats = useMemo(() => calculateBudgetStats(budgetItems), [budgetItems]);

  const categoryStats = useMemo(() => {
    return budgetCategories.map((cat) => {
      const items = budgetItems.filter((i) => i.categoryId === cat.id);
      const budgeted = items.reduce((sum, i) => sum + i.budgeted, 0);
      const actual = items.reduce((sum, i) => sum + i.actual, 0);
      return { ...cat, budgeted, actual, items };
    });
  }, [budgetCategories, budgetItems]);

  const pendingPayments = payments.filter((p) => p.status === 'pending');

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

      {activeTab === 'budget' ? (
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
      ) : (
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
                placeholder="商家名称"
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
