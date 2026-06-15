import { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Upload,
  FileDown,
  Filter,
  Users,
  Phone,
  Mail,
  Utensils,
  X,
} from 'lucide-react';
import useAppStore from '@/store/useAppStore';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import {
  getRelationLabel,
  getStatusLabel,
  getStatusColor,
  parseBulkImport,
  generateSignInList,
  exportToText,
} from '@/utils/helpers';
import { Guest, GuestRelation, GuestStatus } from '@/types';

const relations: { value: GuestRelation; label: string }[] = [
  { value: 'groom', label: '男方亲友' },
  { value: 'bride', label: '女方亲友' },
  { value: 'colleague', label: '同事' },
  { value: 'friend', label: '朋友' },
  { value: 'other', label: '其他' },
];

const statuses: { value: GuestStatus; label: string }[] = [
  { value: 'pending', label: '待确认' },
  { value: 'confirmed', label: '确认出席' },
  { value: 'declined', label: '确认缺席' },
];

const GuestsPage = () => {
  const {
    guests,
    tables,
    addGuest,
    updateGuest,
    deleteGuest,
    bulkAddGuests,
  } = useAppStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [relationFilter, setRelationFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [importText, setImportText] = useState('');

  const [formData, setFormData] = useState<Partial<Guest>>({
    name: '',
    relation: 'other',
    phone: '',
    email: '',
    status: 'pending',
    dietary: '',
    plusOne: 0,
    notes: '',
    familyId: null,
  });

  const filteredGuests = useMemo(() => {
    return guests.filter((guest) => {
      const matchSearch =
        guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guest.phone.includes(searchTerm) ||
        guest.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRelation = relationFilter === 'all' || guest.relation === relationFilter;
      const matchStatus = statusFilter === 'all' || guest.status === statusFilter;
      return matchSearch && matchRelation && matchStatus;
    });
  }, [guests, searchTerm, relationFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = guests.length;
    const confirmed = guests.filter((g) => g.status === 'confirmed').length;
    const declined = guests.filter((g) => g.status === 'declined').length;
    const pending = guests.filter((g) => g.status === 'pending').length;
    const totalPeople = guests.reduce(
      (sum, g) => sum + (g.status === 'confirmed' ? 1 + g.plusOne : 0),
      0
    );
    return { total, confirmed, declined, pending, totalPeople };
  }, [guests]);

  const handleOpenAdd = () => {
    setEditingGuest(null);
    setFormData({
      name: '',
      relation: 'other',
      phone: '',
      email: '',
      status: 'pending',
      dietary: '',
      plusOne: 0,
      notes: '',
      familyId: null,
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (guest: Guest) => {
    setEditingGuest(guest);
    setFormData({ ...guest });
    setShowAddModal(true);
  };

  const handleSubmit = () => {
    if (!formData.name?.trim()) return;

    if (editingGuest) {
      updateGuest(editingGuest.id, formData);
    } else {
      addGuest(formData as Omit<Guest, 'id'>);
    }
    setShowAddModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这位宾客吗？')) {
      deleteGuest(id);
    }
  };

  const handleBulkImport = () => {
    const parsed = parseBulkImport(importText);
    if (parsed.length === 0) {
      alert('未识别到有效的宾客信息');
      return;
    }
    bulkAddGuests(parsed);
    setShowImportModal(false);
    setImportText('');
  };

  const handleExportSignIn = () => {
    const content = generateSignInList(guests, tables);
    exportToText(content, '婚礼签到名单.txt');
  };

  const getTableName = (tableId: string | null) => {
    if (!tableId) return '未安排';
    const table = tables.find((t) => t.id === tableId);
    return table ? `${table.tableNumber}桌 ${table.tableName}` : '未安排';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-espresso">宾客名单</h1>
          <p className="mt-2 text-espresso/60">
            共 {stats.total} 位宾客 · 已确认 {stats.confirmed} 人 · 预计出席 {stats.totalPeople} 人
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleExportSignIn}>
            <FileDown className="w-4 h-4" />
            导出签到表
          </Button>
          <Button variant="secondary" onClick={() => setShowImportModal(true)}>
            <Upload className="w-4 h-4" />
            批量导入
          </Button>
          <Button onClick={handleOpenAdd}>
            <Plus className="w-4 h-4" />
            添加宾客
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-soft">
          <p className="text-sm text-espresso/60">总人数</p>
          <p className="text-2xl font-bold text-espresso font-serif mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft">
          <p className="text-sm text-green-600">确认出席</p>
          <p className="text-2xl font-bold text-green-600 font-serif mt-1">{stats.confirmed}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft">
          <p className="text-sm text-red-500">确认缺席</p>
          <p className="text-2xl font-bold text-red-500 font-serif mt-1">{stats.declined}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft">
          <p className="text-sm text-amber-600">待确认</p>
          <p className="text-2xl font-bold text-amber-600 font-serif mt-1">{stats.pending}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-5 shadow-soft">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-64">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-espresso/40" />
            <input
              type="text"
              placeholder="搜索宾客姓名、电话、邮箱..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-rose-50 border border-rose-100 rounded-xl text-espresso placeholder:text-espresso/40 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-200"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-espresso/50" />
            <select
              value={relationFilter}
              onChange={(e) => setRelationFilter(e.target.value)}
              className="px-3 py-2.5 bg-rose-50 border border-rose-100 rounded-xl text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
            >
              <option value="all">全部关系</option>
              {relations.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 bg-rose-50 border border-rose-100 rounded-xl text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
            >
              <option value="all">全部状态</option>
              {statuses.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-rose-50 to-champagne-50">
                <th className="text-left px-6 py-4 text-sm font-semibold text-espresso/80">
                  姓名
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-espresso/80">
                  关系
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-espresso/80">
                  联系方式
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-espresso/80">
                  出席状态
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-espresso/80">
                  随行
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-espresso/80">
                  饮食忌口
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-espresso/80">
                  座位
                </th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-espresso/80">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-50">
              {filteredGuests.map((guest) => (
                <tr
                  key={guest.id}
                  className="hover:bg-rose-50/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-300 to-champagne-300 flex items-center justify-center text-white font-medium text-sm">
                        {guest.name.charAt(0)}
                      </div>
                      <span className="font-medium text-espresso">{guest.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-espresso/70">
                      {getRelationLabel(guest.relation)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {guest.phone && (
                        <div className="flex items-center gap-2 text-sm text-espresso/70">
                          <Phone className="w-3.5 h-3.5" />
                          {guest.phone}
                        </div>
                      )}
                      {guest.email && (
                        <div className="flex items-center gap-2 text-sm text-espresso/50">
                          <Mail className="w-3.5 h-3.5" />
                          {guest.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        guest.status
                      )}`}
                    >
                      {getStatusLabel(guest.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-espresso/70">
                      +{guest.plusOne} 人
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {guest.dietary ? (
                      <span className="inline-flex items-center gap-1 text-sm text-amber-700">
                        <Utensils className="w-3.5 h-3.5" />
                        {guest.dietary}
                      </span>
                    ) : (
                      <span className="text-sm text-espresso/30">无</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm ${guest.tableId ? 'text-espresso/70' : 'text-espresso/30'}`}>
                      {getTableName(guest.tableId)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(guest)}
                        className="p-2 rounded-lg hover:bg-champagne-100 text-espresso/60 hover:text-champagne-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(guest.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-espresso/60 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredGuests.length === 0 && (
            <div className="py-16 text-center">
              <Users className="w-12 h-12 text-espresso/20 mx-auto mb-4" />
              <p className="text-espresso/50">暂无宾客数据</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingGuest ? '编辑宾客' : '添加宾客'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-espresso/80 mb-2">
                姓名 *
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
                placeholder="请输入姓名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-espresso/80 mb-2">
                关系
              </label>
              <select
                value={formData.relation}
                onChange={(e) =>
                  setFormData({ ...formData, relation: e.target.value as GuestRelation })
                }
                className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
              >
                {relations.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-espresso/80 mb-2">
                手机号
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
                placeholder="请输入手机号"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-espresso/80 mb-2">
                邮箱
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
                placeholder="请输入邮箱"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-espresso/80 mb-2">
                出席状态
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as GuestStatus })
                }
                className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
              >
                {statuses.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-espresso/80 mb-2">
                随行人数
              </label>
              <input
                type="number"
                min="0"
                value={formData.plusOne || 0}
                onChange={(e) =>
                  setFormData({ ...formData, plusOne: parseInt(e.target.value) || 0 })
                }
                className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-espresso/80 mb-2">
              饮食忌口
            </label>
            <input
              type="text"
              value={formData.dietary || ''}
              onChange={(e) => setFormData({ ...formData, dietary: e.target.value })}
              className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
              placeholder="如：素食、海鲜过敏、清真等"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-espresso/80 mb-2">
              备注
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200 resize-none"
              placeholder="其他需要记录的信息"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>
              {editingGuest ? '保存修改' : '添加宾客'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="批量导入宾客"
        size="lg"
      >
        <div className="space-y-4">
          <div className="p-4 bg-rose-50 rounded-xl">
            <p className="text-sm text-espresso/70">
              请按以下格式粘贴宾客信息，每行一位宾客，格式：姓名,手机号,关系
            </p>
            <p className="text-sm text-espresso/50 mt-1">
              例如：张三,13800138000,男方亲友
            </p>
          </div>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={12}
            className="w-full px-4 py-3 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200 resize-none font-mono text-sm"
            placeholder="张三,13800138000,男方亲友&#10;李四,13900139000,女方亲友&#10;王五,13700137000,朋友"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowImportModal(false)}>
              取消
            </Button>
            <Button onClick={handleBulkImport}>
              导入
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GuestsPage;
