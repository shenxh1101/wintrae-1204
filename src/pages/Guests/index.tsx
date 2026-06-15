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
  ChevronDown,
  ChevronUp,
  UsersRound,
  UserPlus2,
  Home,
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
import { Guest, GuestRelation, GuestStatus, Family } from '@/types';

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

interface DisplayRow {
  type: 'family' | 'guest';
  id: string;
  family?: Family;
  familyMembers?: Guest[];
  guest?: Guest;
  familyRelation?: GuestRelation;
}

const GuestsPage = () => {
  const {
    guests,
    families,
    tables,
    addGuest,
    updateGuest,
    deleteGuest,
    bulkAddGuests,
    addFamily,
    updateFamily,
  } = useAppStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [relationFilter, setRelationFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);
  const [importText, setImportText] = useState('');
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());

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

  const [familyForm, setFamilyForm] = useState({
    name: '',
    relation: 'other' as GuestRelation,
    notes: '',
  });

  const toggleFamilyExpand = (familyId: string) => {
    setExpandedFamilies((prev) => {
      const next = new Set(prev);
      if (next.has(familyId)) {
        next.delete(familyId);
      } else {
        next.add(familyId);
      }
      return next;
    });
  };

  const getFamilyById = (id: string | null) => families.find((f) => f.id === id);

  const displayRows: DisplayRow[] = useMemo(() => {
    const rows: DisplayRow[] = [];
    const processedGuestIds = new Set<string>();

    const allFamilies = [...families];
    if (relationFilter !== 'all') {
      const filtered = allFamilies.filter((f) => f.relation === relationFilter);
      rows.push(...filtered.map((f) => ({ type: 'family' as const, id: f.id, family: f })));
    } else {
      rows.push(...allFamilies.map((f) => ({ type: 'family' as const, id: f.id, family: f })));
    }

    const sortedRows = rows.sort((a, b) => {
      const ra = a.family?.relation || '';
      const rb = b.family?.relation || '';
      return ra.localeCompare(rb);
    });

    sortedRows.forEach((row) => {
      const members = guests.filter((g) => g.familyId === row.id);
      row.familyMembers = members;
      members.forEach((m) => processedGuestIds.add(m.id));
      row.familyRelation = members.length > 0 ? members[0].relation : row.family?.relation;
    });

    const ungroupedGuests = guests.filter(
      (g) => !g.familyId && !processedGuestIds.has(g.id)
    );

    const filteredUngrouped = ungroupedGuests.filter((g) => {
      const matchSearch =
        g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.phone.includes(searchTerm) ||
        g.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRelation = relationFilter === 'all' || g.relation === relationFilter;
      const matchStatus = statusFilter === 'all' || g.status === statusFilter;
      return matchSearch && matchRelation && matchStatus;
    });

    const finalRows = sortedRows.filter((row) => {
      const members = row.familyMembers || [];
      const family = row.family!;
      
      const matchSearch =
        searchTerm === '' ||
        family.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        members.some(
          (m) =>
            m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.phone.includes(searchTerm)
        );
      const matchRelation =
        relationFilter === 'all' ||
        family.relation === relationFilter ||
        members.some((m) => m.relation === relationFilter);
      const matchStatus =
        statusFilter === 'all' ||
        members.some((m) => m.status === statusFilter);
      
      return matchSearch && matchRelation && matchStatus;
    });

    return [
      ...finalRows,
      ...filteredUngrouped.map((g) => ({ type: 'guest' as const, id: g.id, guest: g })),
    ];
  }, [guests, families, searchTerm, relationFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = guests.length;
    const confirmed = guests.filter((g) => g.status === 'confirmed').length;
    const declined = guests.filter((g) => g.status === 'declined').length;
    const pending = guests.filter((g) => g.status === 'pending').length;
    const totalPeople = guests.reduce(
      (sum, g) => sum + (g.status === 'confirmed' ? 1 + g.plusOne : 0),
      0
    );
    const familyCount = families.length;
    return { total, confirmed, declined, pending, totalPeople, familyCount };
  }, [guests, families]);

  const handleOpenAdd = (familyId?: string | null) => {
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
      familyId: familyId || null,
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
    const content = generateSignInList(guests, tables, families);
    exportToText(content, '婚礼签到名单.txt');
  };

  const handleOpenAddFamily = () => {
    setEditingFamily(null);
    setFamilyForm({ name: '', relation: 'other', notes: '' });
    setShowFamilyModal(true);
  };

  const handleOpenEditFamily = (family: Family) => {
    setEditingFamily(family);
    setFamilyForm({
      name: family.name,
      relation: family.relation,
      notes: family.notes,
    });
    setShowFamilyModal(true);
  };

  const handleSaveFamily = () => {
    if (!familyForm.name.trim()) return;

    if (editingFamily) {
      updateFamily(editingFamily.id, familyForm);
    } else {
      addFamily(familyForm);
    }
    setShowFamilyModal(false);
  };

  const getTableName = (tableId: string | null) => {
    if (!tableId) return '未安排';
    const table = tables.find((t) => t.id === tableId);
    return table ? `${table.tableNumber}桌 ${table.tableName}` : '未安排';
  };

  const getFamilyStats = (members: Guest[]) => {
    const count = members.length;
    const peopleCount = members.reduce(
      (sum, g) => sum + (g.status === 'confirmed' ? 1 + g.plusOne : 0),
      0
    );
    const allConfirmed = members.length > 0 && members.every((g) => g.status === 'confirmed');
    const anyPending = members.some((g) => g.status === 'pending');
    return { count, peopleCount, allConfirmed, anyPending };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-espresso">宾客名单</h1>
          <p className="mt-2 text-espresso/60">
            共 {stats.total} 位宾客 · {stats.familyCount} 户家庭 · 已确认 {stats.confirmed} 人 · 预计出席 {stats.totalPeople} 人
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
          <Button variant="secondary" onClick={handleOpenAddFamily}>
            <Home className="w-4 h-4" />
            添加家庭
          </Button>
          <Button onClick={() => handleOpenAdd()}>
            <Plus className="w-4 h-4" />
            添加宾客
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-soft">
          <p className="text-sm text-espresso/60">总人数</p>
          <p className="text-2xl font-bold text-espresso font-serif mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft">
          <p className="text-sm text-espresso/60">家庭数</p>
          <p className="text-2xl font-bold text-rose-500 font-serif mt-1">{stats.familyCount}</p>
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
              placeholder="搜索宾客姓名、电话、邮箱、家庭名称..."
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
                <th className="text-left px-6 py-4 text-sm font-semibold text-espresso/80 w-12"></th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-espresso/80">
                  姓名 / 家庭
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
                  人数
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
              {displayRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <Users className="w-12 h-12 text-espresso/20 mx-auto mb-4" />
                    <p className="text-espresso/50">暂无宾客数据</p>
                  </td>
                </tr>
              )}

              {displayRows.map((row) => {
                if (row.type === 'family') {
                  const family = row.family!;
                  const members = row.familyMembers || [];
                  const isExpanded = expandedFamilies.has(family.id);
                  const fStats = getFamilyStats(members);

                  return (
                    <>
                      <tr
                        key={family.id}
                        className="bg-gradient-to-r from-rose-50/60 to-champagne-50/40 hover:from-rose-100/60 hover:to-champagne-100/40 transition-colors cursor-pointer"
                        onClick={() => toggleFamilyExpand(family.id)}
                      >
                        <td className="px-6 py-4">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-espresso/50" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-espresso/50" />
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-champagne-400 flex items-center justify-center">
                              <UsersRound className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-espresso">
                                  {family.name}
                                </span>
                                <span className="text-xs text-espresso/50">
                                  ({members.length}人)
                                </span>
                              </div>
                              <p className="text-xs text-espresso/50 mt-0.5">
                                {family.notes || '点击展开查看家庭成员'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-espresso/70">
                            {getRelationLabel(family.relation)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1 max-w-48">
                            {members.slice(0, 2).map((m) => (
                              m.phone && (
                                <div key={m.id} className="flex items-center gap-1 text-xs text-espresso/60">
                                  <Phone className="w-3 h-3" />
                                  {m.phone}
                                </div>
                              )
                            ))}
                            {members.length > 2 && (
                              <span className="text-xs text-espresso/40">+{members.length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {fStats.allConfirmed ? (
                              <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                全部确认
                              </span>
                            ) : fStats.anyPending ? (
                              <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                部分确认
                              </span>
                            ) : (
                              <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                待确认
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-champagne-600">
                            共 {fStats.peopleCount} 人
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {(() => {
                            const diets = members
                              .map((m) => (m.dietary && m.dietary !== '无' ? m.dietary : null))
                              .filter(Boolean);
                            return diets.length > 0 ? (
                              <span className="text-xs text-amber-700">
                                {diets.join('、')}
                              </span>
                            ) : (
                              <span className="text-sm text-espresso/30">无</span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-espresso/50">
                            {members.filter((m) => m.tableId).length}/{members.length} 已安排
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleOpenAdd(family.id)}
                              className="p-2 rounded-lg hover:bg-green-50 text-espresso/60 hover:text-green-600 transition-colors"
                              title="添加家庭成员"
                            >
                              <UserPlus2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEditFamily(family)}
                              className="p-2 rounded-lg hover:bg-champagne-50 text-espresso/60 hover:text-champagne-600 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded &&
                        members.map((member, idx) => (
                          <tr
                            key={member.id}
                            className="bg-rose-50/20 hover:bg-rose-50/50 transition-colors"
                          >
                            <td className="px-6 py-3 pl-12">
                              <div className="w-1 h-1 rounded-full bg-rose-300" />
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-200 to-champagne-200 flex items-center justify-center text-white text-xs font-medium">
                                  {member.name.charAt(0)}
                                </div>
                                <span className="text-sm text-espresso">{member.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3">
                              <span className="text-xs text-espresso/60">
                                {getRelationLabel(member.relation)}
                              </span>
                            </td>
                            <td className="px-6 py-3">
                              <div className="space-y-0.5">
                                {member.phone && (
                                  <div className="flex items-center gap-1.5 text-xs text-espresso/70">
                                    <Phone className="w-3 h-3" />
                                    {member.phone}
                                  </div>
                                )}
                                {member.email && (
                                  <div className="flex items-center gap-1.5 text-xs text-espresso/50">
                                    <Mail className="w-3 h-3" />
                                    {member.email}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-3">
                              <span
                                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                  member.status
                                )}`}
                              >
                                {getStatusLabel(member.status)}
                              </span>
                            </td>
                            <td className="px-6 py-3">
                              <span className="text-xs text-espresso/70">
                                {member.plusOne + 1}人
                              </span>
                            </td>
                            <td className="px-6 py-3">
                              {member.dietary && member.dietary !== '无' ? (
                                <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                                  <Utensils className="w-3 h-3" />
                                  {member.dietary}
                                </span>
                              ) : (
                                <span className="text-xs text-espresso/30">-</span>
                              )}
                            </td>
                            <td className="px-6 py-3">
                              <span
                                className={`text-xs ${
                                  member.tableId ? 'text-espresso/70' : 'text-espresso/30'
                                }`}
                              >
                                {getTableName(member.tableId)}
                              </span>
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleOpenEdit(member)}
                                  className="p-1.5 rounded-lg hover:bg-champagne-50 text-espresso/60 hover:text-champagne-600 transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(member.id)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-espresso/60 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </>
                  );
                }

                // Individual guest
                const guest = row.guest!;
                return (
                  <tr key={guest.id} className="hover:bg-rose-50/50 transition-colors">
                    <td className="px-6 py-4"></td>
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
                      <span className="text-sm text-espresso/70">+{guest.plusOne} 人</span>
                    </td>
                    <td className="px-6 py-4">
                      {guest.dietary && guest.dietary !== '无' ? (
                        <span className="inline-flex items-center gap-1 text-sm text-amber-700">
                          <Utensils className="w-3.5 h-3.5" />
                          {guest.dietary}
                        </span>
                      ) : (
                        <span className="text-sm text-espresso/30">无</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-sm ${
                          guest.tableId ? 'text-espresso/70' : 'text-espresso/30'
                        }`}
                      >
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
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Guest Modal */}
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
                归属家庭
              </label>
              <select
                value={formData.familyId || ''}
                onChange={(e) =>
                  setFormData({ ...formData, familyId: e.target.value || null })
                }
                className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
              >
                <option value="">不归属家庭（个人）</option>
                {families.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({getRelationLabel(f.relation)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

      {/* Add/Edit Family Modal */}
      <Modal
        isOpen={showFamilyModal}
        onClose={() => setShowFamilyModal(false)}
        title={editingFamily ? '编辑家庭' : '添加家庭'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-espresso/80 mb-2">
              家庭名称 *
            </label>
            <input
              type="text"
              value={familyForm.name}
              onChange={(e) => setFamilyForm({ ...familyForm, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
              placeholder="如：张伟一家"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-espresso/80 mb-2">
              关系分类
            </label>
            <select
              value={familyForm.relation}
              onChange={(e) =>
                setFamilyForm({ ...familyForm, relation: e.target.value as GuestRelation })
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
          <div>
            <label className="block text-sm font-medium text-espresso/80 mb-2">
              备注
            </label>
            <input
              type="text"
              value={familyForm.notes}
              onChange={(e) => setFamilyForm({ ...familyForm, notes: e.target.value })}
              className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
              placeholder="可选"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowFamilyModal(false)}>
              取消
            </Button>
            <Button onClick={handleSaveFamily}>
              {editingFamily ? '保存' : '创建家庭'}
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
              请按以下格式粘贴宾客信息，每行一位宾客
            </p>
            <p className="text-sm text-espresso/70 mt-1">
              格式：<code className="bg-white px-1.5 py-0.5 rounded">姓名,手机号,关系分类,备注</code>
            </p>
            <p className="text-xs text-espresso/50 mt-2">
              关系分类支持：男方亲友、男方、新郎、女方亲友、女方、新娘、同事、朋友、其他
            </p>
            <div className="mt-3 text-xs text-espresso/60 font-mono bg-white/60 p-2 rounded">
              例如：<br />
              张三,13800138000,男方亲友,新郎表哥<br />
              李四,13900139000,女方亲友<br />
              王五,13700137000,同事,部门经理
            </div>
          </div>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={12}
            className="w-full px-4 py-3 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200 resize-none font-mono text-sm"
            placeholder={'张三,13800138000,男方亲友\n李四,13900139000,女方亲友\n王五,13700137000,同事'}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowImportModal(false)}>
              取消
            </Button>
            <Button onClick={handleBulkImport}>导入</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GuestsPage;
