import { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Settings,
  Users,
  UserPlus,
  Link as LinkIcon,
  Ban,
  Edit2,
  X,
  GripVertical,
  AlertCircle,
  Crown,
  Download,
  Printer,
  ChevronDown,
  CheckCircle2,
  MoveRight,
} from 'lucide-react';
import useAppStore from '@/store/useAppStore';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { Table, Guest, SeatingRule, Family } from '@/types';
import { getRelationLabel } from '@/utils/helpers';

const SeatingPage = () => {
  const {
    guests,
    tables,
    families,
    seatingRules,
    addTable,
    updateTable,
    deleteTable,
    assignGuestToTable,
    addSeatingRule,
    deleteSeatingRule,
    checkSeatingRules,
  } = useAppStore();

  const [showTableModal, setShowTableModal] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [seatingView, setSeatingView] = useState<'arrange' | 'venue'>('arrange');
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [draggedGuest, setDraggedGuest] = useState<string | null>(null);
  const [dragOverTable, setDragOverTable] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const [tableForm, setTableForm] = useState({
    tableNumber: 1,
    tableName: '',
    capacity: 10,
    notes: '',
  });

  const [ruleForm, setRuleForm] = useState({
    type: 'together' as 'together' | 'avoid',
    guestIds: [] as string[],
  });

  const showToast = (type: 'error' | 'success', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const unassignedGuests = useMemo(() => {
    return guests.filter((g) => !g.tableId && g.status !== 'declined');
  }, [guests]);

  const getTableGuests = (tableId: string) => {
    return guests.filter((g) => g.tableId === tableId);
  };

  const handleOpenAddTable = () => {
    setEditingTable(null);
    const maxNum = Math.max(...tables.map((t) => t.tableNumber), 0);
    setTableForm({
      tableNumber: maxNum + 1,
      tableName: '',
      capacity: 10,
      notes: '',
    });
    setShowTableModal(true);
  };

  const handleOpenEditTable = (table: Table) => {
    setEditingTable(table);
    setTableForm({
      tableNumber: table.tableNumber,
      tableName: table.tableName,
      capacity: table.capacity,
      notes: table.notes,
    });
    setShowTableModal(true);
  };

  const handleSaveTable = () => {
    if (editingTable) {
      updateTable(editingTable.id, tableForm);
    } else {
      addTable(tableForm);
    }
    setShowTableModal(false);
  };

  const handleDeleteTable = (tableId: string) => {
    if (confirm('确定要删除这桌吗？已安排的宾客将变为未分配状态。')) {
      deleteTable(tableId);
    }
  };

  const handleDragStart = (e: React.DragEvent, guestId: string) => {
    setDraggedGuest(guestId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, tableId: string) => {
    e.preventDefault();
    setDragOverTable(tableId);
  };

  const handleDragLeave = () => {
    setDragOverTable(null);
  };

  const handleDrop = (e: React.DragEvent, tableId: string) => {
    e.preventDefault();
    setDragOverTable(null);
    if (draggedGuest) {
      const result = assignGuestToTable(draggedGuest, tableId);
      if (!result.allowed) {
        showToast('error', result.reason || '无法安排到该桌');
      } else {
        const guest = guests.find((g) => g.id === draggedGuest);
        showToast('success', `${guest?.name || '宾客'} 已安排`);
      }
      setDraggedGuest(null);
    }
  };

  const handleDropUnassigned = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedGuest) {
      assignGuestToTable(draggedGuest, null, null, true);
      const guest = guests.find((g) => g.id === draggedGuest);
      showToast('success', `${guest?.name || '宾客'} 已移出座位`);
      setDraggedGuest(null);
    }
  };

  const handleRemoveFromTable = (guestId: string) => {
    assignGuestToTable(guestId, null, null, true);
    const guest = guests.find((g) => g.id === guestId);
    showToast('success', `${guest?.name || '宾客'} 已移出座位`);
  };

  const handleAddRule = () => {
    if (ruleForm.guestIds.length < 2) {
      alert('请至少选择两位宾客');
      return;
    }
    addSeatingRule({
      type: ruleForm.type,
      guestIds: ruleForm.guestIds,
    });
    setShowRuleModal(false);
    setRuleForm({ type: 'together', guestIds: [] });
  };

  const toggleRuleGuest = (guestId: string) => {
    setRuleForm((prev) => ({
      ...prev,
      guestIds: prev.guestIds.includes(guestId)
        ? prev.guestIds.filter((id) => id !== guestId)
        : [...prev.guestIds, guestId],
    }));
  };

  const getGuestName = (id: string) => {
    const guest = guests.find((g) => g.id === id);
    return guest?.name || '';
  };

  const confirmedGuests = guests.filter(
    (g) => g.status !== 'declined'
  );

  const getTableDragState = (tableId: string) => {
    if (!draggedGuest || dragOverTable !== tableId) return null;
    const check = checkSeatingRules(draggedGuest, tableId);
    const table = tables.find((t) => t.id === tableId);
    const currentCount = getTableGuests(tableId).length;
    const isFull = table ? currentCount >= table.capacity : false;
    return {
      allowed: check.allowed && !isFull,
      reason: !check.allowed ? check.reason : isFull ? '该桌已满' : null,
    };
  };

  const renderSeats = (table: Table) => {
    const tableGuests = getTableGuests(table.id);
    const capacity = table.capacity;
    
    const baseSize = 192;
    const tableCircleInset = capacity <= 8 ? 40 : capacity <= 12 ? 36 : 32;
    const seatSize = capacity <= 8 ? 40 : capacity <= 12 ? 36 : capacity <= 16 ? 32 : 28;
    const radius = (baseSize / 2) - tableCircleInset;
    const center = baseSize / 2;

    const seats = [];
    for (let i = 0; i < capacity; i++) {
      const angle = (i / capacity) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * radius + center;
      const y = Math.sin(angle) * radius + center;
      const guest = tableGuests[i];

      if (guest) {
        seats.push(
          <div
            key={`seat-${i}-${guest.id}`}
            draggable
            onDragStart={(e) => handleDragStart(e, guest.id)}
            onDragEnd={() => setDraggedGuest(null)}
            className={`absolute rounded-full bg-white border-2 border-rose-300 flex items-center justify-center font-medium text-espresso cursor-grab active:cursor-grabbing hover:scale-110 hover:border-rose-500 transition-all shadow-sm z-10 ${
              draggedGuest === guest.id ? 'opacity-50' : ''
            }`}
            style={{
              left: x,
              top: y,
              width: seatSize,
              height: seatSize,
              marginLeft: -seatSize / 2,
              marginTop: -seatSize / 2,
              fontSize: seatSize <= 32 ? 11 : 12,
            }}
            title={`${guest.name} (${getRelationLabel(guest.relation)})`}
          >
            {guest.name.charAt(0)}
          </div>
        );
      } else {
        seats.push(
          <div
            key={`seat-empty-${i}`}
            className="absolute rounded-full bg-white/40 border-2 border-dashed border-champagne-200 flex items-center justify-center text-champagne-300 transition-all"
            style={{
              left: x,
              top: y,
              width: seatSize,
              height: seatSize,
              marginLeft: -seatSize / 2,
              marginTop: -seatSize / 2,
              fontSize: seatSize <= 32 ? 9 : 10,
            }}
          >
            {i + 1}
          </div>
        );
      }
    }
    return seats;
  };

  const sortedTables = useMemo(
    () => [...tables].sort((a, b) => a.tableNumber - b.tableNumber),
    [tables]
  );

  const venueStats = useMemo(() => {
    let totalCapacity = 0;
    let totalExpected = 0;
    let totalArrived = 0;
    let totalSigned = 0;
    sortedTables.forEach((table) => {
      totalCapacity += table.capacity;
      const tableGuests = guests.filter(
        (g) => g.tableId === table.id && g.status !== 'declined'
      );
      totalExpected += tableGuests.reduce(
        (s, g) => s + 1 + (g.plusOne || 0),
        0
      );
      const signed = tableGuests.filter((g) => g.signedIn);
      totalSigned += signed.length;
      totalArrived += signed.reduce(
        (s, g) => s + (g.arrivedCount ?? 1 + (g.plusOne || 0)),
        0
      );
    });
    return { totalCapacity, totalExpected, totalArrived, totalSigned };
  }, [sortedTables, guests]);

  const moveGuestToTable = (guestId: string, targetTableId: string) => {
    const result = assignGuestToTable(guestId, targetTableId);
    if (!result.allowed) {
      showToast('error', result.reason || '换桌失败');
    } else {
      showToast('success', '已调整桌位，签到页/宾客名单同步更新');
    }
  };

  const moveFamilyToTable = (familyId: string, targetTableId: string) => {
    const members = guests.filter((g) => g.familyId === familyId);
    for (const m of members) {
      const result = assignGuestToTable(m.id, targetTableId);
      if (!result.allowed) {
        showToast('error', `${m.name} 换桌失败：${result.reason}`);
        return;
      }
    }
    showToast('success', '整户换桌完成，签到页/宾客名单同步更新');
  };

  const generateTableCardText = (table: Table): string => {
    const tableGuests = guests.filter(
      (g) => g.tableId === table.id && g.status !== 'declined'
    );
    const expected = tableGuests.reduce(
      (s, g) => s + 1 + (g.plusOne || 0),
      0
    );
    const signed = tableGuests.filter((g) => g.signedIn);
    const arrived = signed.reduce(
      (s, g) => s + (g.arrivedCount ?? 1 + (g.plusOne || 0)),
      0
    );
    const familyGroups = new Map<string, Guest[]>();
    tableGuests.forEach((g) => {
      const key = g.familyId || `__single_${g.id}`;
      if (!familyGroups.has(key)) familyGroups.set(key, []);
      familyGroups.get(key)!.push(g);
    });

    let text = `════════════════════════════════════\n`;
    text += `         第${table.tableNumber}桌：${table.tableName || `第${table.tableNumber}桌`}\n`;
    text += `════════════════════════════════════\n`;
    text += `容量 ${table.capacity} 人 · 预计 ${expected} 人 · 实际 ${arrived} 人\n\n`;
    familyGroups.forEach((members, key) => {
      const fam = key.startsWith('__single_')
        ? null
        : families.find((f) => f.id === key);
      const names = members.map((g) => g.name).join('、');
      const ex = members.reduce(
        (s, g) => s + 1 + (g.plusOne || 0),
        0
      );
      const ac = members
        .filter((g) => g.signedIn)
        .reduce(
          (s, g) => s + (g.arrivedCount ?? 1 + (g.plusOne || 0)),
          0
        );
      text += ` ▸ ${fam ? fam.name : names}  (${ex}/${ac}人)\n`;
      if (!fam) {
        // 单宾客
      } else {
        text += `   成员：${names}\n`;
      }
    });
    const dietary = Array.from(
      new Set(
        tableGuests
          .map((g) => g.dietary)
          .filter((d): d is string => !!d && d !== '无')
      )
    );
    if (dietary.length > 0) {
      text += `\n ⚠ 忌口：${dietary.join('、')}\n`;
    }
    text += `════════════════════════════════════\n\n`;
    return text;
  };

  const generateAllCardsText = (): string => {
    let text = '婚宴桌卡汇总（打印版）\n';
    text += `导出时间：${new Date().toLocaleString('zh-CN')}\n\n`;
    sortedTables.forEach((t) => {
      text += generateTableCardText(t);
    });
    text += '\n【桌签汇总 - 可打印粘贴】\n';
    text += '════════════════════════════════════\n';
    sortedTables.forEach((t) => {
      text += `\n      第${t.tableNumber}桌\n      ${t.tableName || `第${t.tableNumber}桌`}\n\n`;
      text += '════════════════════════════════════\n';
    });
    return text;
  };

  const handleExportAllCards = () => {
    const text = generateAllCardsText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `婚宴桌卡_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintSingleCard = (table: Table) => {
    const text = generateTableCardText(table);
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(
        `<html><head><title>第${table.tableNumber}桌 桌卡</title><style>body{font-family:"Microsoft YaHei",sans-serif;white-space:pre;padding:40px;font-size:18px;line-height:1.6}</style></head><body>${text}</body></html>`
      );
      w.document.close();
      setTimeout(() => w.print(), 300);
    }
  };

  const [venueFilter, setVenueFilter] = useState<'all' | 'unfinished'>('all');
  const [moveTarget, setMoveTarget] = useState<{
    mode: 'guest' | 'family';
    id: string;
  } | null>(null);

  const renderVenueView = () => {
    const displayTables =
      venueFilter === 'unfinished'
        ? sortedTables.filter((t) => {
            const tableGuests = guests.filter(
              (g) => g.tableId === t.id && g.status !== 'declined'
            );
            return !tableGuests.every((g) => g.signedIn);
          })
        : sortedTables;

    return (
      <div className="space-y-5">
        {/* Venue Summary */}
        <div className="bg-white rounded-2xl p-5 shadow-soft">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
              <div>
                <p className="text-sm text-espresso/60">总桌数 / 容量</p>
                <p className="text-2xl font-bold text-espresso font-serif mt-1">
                  {sortedTables.length} 桌 / {venueStats.totalCapacity} 位
                </p>
              </div>
              <div>
                <p className="text-sm text-espresso/60">预计总人数</p>
                <p className="text-2xl font-bold text-blue-600 font-serif mt-1">
                  {venueStats.totalExpected} 人
                </p>
              </div>
              <div>
                <p className="text-sm text-espresso/60">已签到 / 已到场</p>
                <p className="text-2xl font-bold text-green-600 font-serif mt-1">
                  {venueStats.totalSigned} 位 / {venueStats.totalArrived} 人
                </p>
              </div>
              <div>
                <p className="text-sm text-espresso/60">整体进度</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-3 bg-rose-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all"
                      style={{
                        width: `${venueStats.totalExpected > 0 ? Math.min(100, (venueStats.totalArrived / venueStats.totalExpected) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold text-emerald-600">
                    {venueStats.totalExpected > 0
                      ? Math.round((venueStats.totalArrived / venueStats.totalExpected) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-rose-50">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-rose-50 rounded-lg p-1">
                <button
                  onClick={() => setVenueFilter('all')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    venueFilter === 'all'
                      ? 'bg-white text-espresso shadow-sm'
                      : 'text-espresso/60 hover:text-espresso'
                  }`}
                >
                  全部桌次
                </button>
                <button
                  onClick={() => setVenueFilter('unfinished')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    venueFilter === 'unfinished'
                      ? 'bg-white text-espresso shadow-sm'
                      : 'text-espresso/60 hover:text-espresso'
                  }`}
                >
                  仅看未齐
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handleExportAllCards}>
                <Download className="w-4 h-4" />
                导出全部桌卡
              </Button>
              <Button variant="primary" onClick={handleExportAllCards}>
                <Printer className="w-4 h-4" />
                打印桌签汇总
              </Button>
            </div>
          </div>
        </div>

        {/* Move Confirm Modal */}
        {moveTarget && (
          <Modal isOpen={!!moveTarget} onClose={() => setMoveTarget(null)} title="临时换桌">
            <p className="text-sm text-espresso/70 mb-4">
              选择目标桌位，点击即可移动：签到页和宾客名单的桌次会同步更新
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-80 overflow-y-auto">
              {sortedTables.map((t) => {
                const count = guests.filter(
                  (g) => g.tableId === t.id && g.status !== 'declined'
                ).length;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      if (moveTarget.mode === 'family') {
                        moveFamilyToTable(moveTarget.id, t.id);
                      } else {
                        moveGuestToTable(moveTarget.id, t.id);
                      }
                      setMoveTarget(null);
                    }}
                    className="p-3 text-left border border-rose-100 hover:border-rose-300 hover:bg-rose-50 rounded-xl transition-colors"
                  >
                    <p className="font-semibold text-espresso">
                      第{t.tableNumber}桌 {t.tableName || ''}
                    </p>
                    <p className="text-xs text-espresso/50 mt-1">
                      已坐 {count} / {t.capacity} 人
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end pt-4">
              <Button variant="secondary" onClick={() => setMoveTarget(null)}>
                取消
              </Button>
            </div>
          </Modal>
        )}

        {/* Table Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {displayTables.length === 0 ? (
            <div className="md:col-span-2 xl:col-span-3 bg-white rounded-2xl p-12 text-center shadow-soft">
              <Crown className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <p className="text-xl font-semibold text-espresso font-serif">
                所有桌次宾客都已签到完毕 💕
              </p>
              <p className="mt-2 text-espresso/50">
                祝婚宴圆满顺利，百年好合！
              </p>
            </div>
          ) : (
            displayTables.map((table) => {
              const tableGuests = guests.filter(
                (g) => g.tableId === table.id && g.status !== 'declined'
              );
              const expected = tableGuests.reduce(
                (s, g) => s + 1 + (g.plusOne || 0),
                0
              );
              const signedList = tableGuests.filter((g) => g.signedIn);
              const arrived = signedList.reduce(
                (s, g) => s + (g.arrivedCount ?? 1 + (g.plusOne || 0)),
                0
              );
              const allSigned =
                tableGuests.length > 0 &&
                tableGuests.every((g) => g.signedIn);

              const familyGroups = new Map<string, Guest[]>();
              tableGuests.forEach((g) => {
                const key = g.familyId || `__single_${g.id}`;
                if (!familyGroups.has(key)) familyGroups.set(key, []);
                familyGroups.get(key)!.push(g);
              });

              const dietaryList = Array.from(
                new Set(
                  tableGuests
                    .map((g) => g.dietary)
                    .filter((d): d is string => !!d && d !== '无')
                )
              );

              return (
                <div
                  key={table.id}
                  className={`bg-white rounded-2xl shadow-soft overflow-hidden border-2 transition-all ${
                    allSigned
                      ? 'border-green-200'
                      : arrived > 0
                        ? 'border-amber-200'
                        : 'border-transparent'
                  }`}
                >
                  {/* Card Header */}
                  <div
                    className={`p-4 flex items-center justify-between ${
                      allSigned
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50'
                        : arrived > 0
                          ? 'bg-gradient-to-r from-amber-50 to-orange-50'
                          : 'bg-gradient-to-r from-champagne-50 to-rose-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white font-serif text-lg ${
                          allSigned
                            ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                            : arrived > 0
                              ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                              : 'bg-gradient-to-br from-champagne-400 to-rose-400'
                        }`}
                      >
                        {table.tableNumber}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-espresso">
                            {table.tableName || `第${table.tableNumber}桌`}
                          </h3>
                          {allSigned && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              齐了
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-espresso/50 mt-0.5">
                          容量 {table.capacity} · {tableGuests.length}位宾客
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-espresso/60">到场</p>
                      <p className="font-bold text-lg text-espresso font-serif">
                        <span className={arrived > 0 ? 'text-green-600' : ''}>
                          {arrived}
                        </span>
                        <span className="text-espresso/40 text-sm font-normal">
                          {' '}
                          / {expected}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Card Body: Families */}
                  <div className="p-4 space-y-2 divide-y divide-rose-50">
                    {Array.from(familyGroups.entries()).map(
                      ([key, members]) => {
                        const fam = key.startsWith('__single_')
                          ? null
                          : families.find((f) => f.id === key);
                        const fExpected = members.reduce(
                          (s, g) => s + 1 + (g.plusOne || 0),
                          0
                        );
                        const fArrived = members
                          .filter((g) => g.signedIn)
                          .reduce(
                            (s, g) =>
                              s +
                              (g.arrivedCount ?? 1 + (g.plusOne || 0)),
                            0
                          );
                        const fAllSigned = members.every((g) => g.signedIn);

                        return (
                          <div
                            key={key}
                            className={`pt-2 first:pt-0 ${!fam ? 'py-2' : ''} group`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                {fam ? (
                                  <Crown className="w-4 h-4 text-champagne-500 flex-shrink-0" />
                                ) : (
                                  <Users className="w-4 h-4 text-espresso/40 flex-shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-espresso truncate">
                                    {fam
                                      ? fam.name
                                      : members[0].name}
                                  </p>
                                  {fam && (
                                    <p className="text-xs text-espresso/50 truncate">
                                      {members.map((m) => m.name).join('、')}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full ${
                                    fAllSigned
                                      ? 'bg-green-100 text-green-700'
                                      : fArrived > 0
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  {fArrived}/{fExpected}
                                </span>
                                {fam ? (
                                  <button
                                    onClick={() =>
                                      setMoveTarget({ mode: 'family', id: key })
                                    }
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-rose-50 rounded-md text-espresso/50 hover:text-rose-500"
                                    title="整户换桌"
                                  >
                                    <MoveRight className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() =>
                                      setMoveTarget({ mode: 'guest', id: members[0].id })
                                    }
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-rose-50 rounded-md text-espresso/50 hover:text-rose-500"
                                    title="换桌"
                                  >
                                    <MoveRight className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                            {/* Members line-by-line signed status */}
                            <div className="flex flex-wrap gap-1 mt-2 pl-6">
                              {members.map((m) => (
                                <span
                                  key={m.id}
                                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md ${
                                    m.signedIn
                                      ? 'bg-green-50 text-green-700 border border-green-200'
                                      : 'bg-slate-50 text-slate-500 border border-slate-200'
                                  }`}
                                >
                                  {m.signedIn ? (
                                    <CheckCircle2 className="w-3 h-3" />
                                  ) : (
                                    <div className="w-3 h-3 rounded-full border-2 border-slate-300" />
                                  )}
                                  {m.name}
                                  {m.dietary && m.dietary !== '无' && (
                                    <span className="text-[10px] text-rose-500">
                                      ⚠{m.dietary}
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>

                  {/* Dietary + Actions Footer */}
                  <div className="px-4 pb-4 space-y-3">
                    {dietaryList.length > 0 && (
                      <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl">
                        <p className="text-xs text-rose-600 font-medium mb-1">
                          ⚠ 本桌忌口汇总
                        </p>
                        <p className="text-sm text-espresso/70">
                          {dietaryList.join('、')}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-rose-50">
                      <div className="text-xs text-espresso/50">
                        {signedList.length}/{tableGuests.length} 位已签到
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handlePrintSingleCard(table)}
                          className="p-2 hover:bg-rose-50 rounded-lg text-espresso/50 hover:text-espresso transition-colors"
                          title="打印本桌卡"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            const text = generateTableCardText(table);
                            const blob = new Blob([text], {
                              type: 'text/plain;charset=utf-8',
                            });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `第${table.tableNumber}桌桌卡.txt`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="p-2 hover:bg-rose-50 rounded-lg text-espresso/50 hover:text-espresso transition-colors"
                          title="下载本桌卡"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 relative">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg animate-slide-in ${
            toast.type === 'error'
              ? 'bg-red-500 text-white'
              : 'bg-green-500 text-white'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <UserPlus className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-espresso">席位安排</h1>
          <p className="mt-2 text-espresso/60">
            拖拽宾客到对应的餐桌，设置排座规则自动校验；婚宴现场一键查看桌卡和忌口
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-rose-50 rounded-xl p-1">
            <button
              onClick={() => setSeatingView('arrange')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                seatingView === 'arrange'
                  ? 'bg-white text-espresso shadow-sm'
                  : 'text-espresso/60 hover:text-espresso'
              }`}
            >
              排座模式
            </button>
            <button
              onClick={() => setSeatingView('venue')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                seatingView === 'venue'
                  ? 'bg-white text-espresso shadow-sm'
                  : 'text-espresso/60 hover:text-espresso'
              }`}
            >
              婚宴现场视图
            </button>
          </div>
          {seatingView === 'arrange' && (
            <>
              <Button variant="secondary" onClick={() => setShowRuleModal(true)}>
                <Settings className="w-4 h-4" />
                排座规则
              </Button>
              <Button onClick={handleOpenAddTable}>
                <Plus className="w-4 h-4" />
                添加餐桌
              </Button>
            </>
          )}
        </div>
      </div>

      {seatingView === 'venue' ? (
        renderVenueView()
      ) : (
        <>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-soft">
          <p className="text-sm text-espresso/60">餐桌总数</p>
          <p className="text-2xl font-bold text-espresso font-serif mt-1">
            {tables.length} 桌
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft">
          <p className="text-sm text-espresso/60">总座位数</p>
          <p className="text-2xl font-bold text-espresso font-serif mt-1">
            {tables.reduce((sum, t) => sum + t.capacity, 0)} 位
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft">
          <p className="text-sm text-green-600">已安排</p>
          <p className="text-2xl font-bold text-green-600 font-serif mt-1">
            {confirmedGuests.filter((g) => g.tableId).length} 人
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft">
          <p className="text-sm text-amber-600">待安排</p>
          <p className="text-2xl font-bold text-amber-600 font-serif mt-1">
            {unassignedGuests.length} 人
          </p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left: Guest Pool */}
        <div
          className={`w-72 flex-shrink-0 bg-white rounded-2xl shadow-soft overflow-hidden transition-all ${
            dragOverTable === 'unassigned' ? 'ring-2 ring-rose-400' : ''
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverTable('unassigned');
          }}
          onDragLeave={handleDragLeave}
          onDrop={handleDropUnassigned}
        >
          <div className="p-4 bg-gradient-to-r from-rose-50 to-champagne-50 border-b border-rose-100">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-rose-500" />
              <h3 className="font-semibold text-espresso">待安排宾客</h3>
            </div>
            <p className="text-sm text-espresso/50 mt-1">
              共 {unassignedGuests.length} 人待安排
            </p>
          </div>
          <div className="p-3 max-h-[calc(100vh-320px)] overflow-y-auto">
            {unassignedGuests.length === 0 ? (
              <div className="py-8 text-center">
                <UserPlus className="w-10 h-10 text-espresso/20 mx-auto mb-2" />
                <p className="text-sm text-espresso/40">所有宾客已安排</p>
              </div>
            ) : (
              <div className="space-y-2">
                {unassignedGuests.map((guest) => (
                  <div
                    key={guest.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, guest.id)}
                    onDragEnd={() => setDraggedGuest(null)}
                    className={`flex items-center gap-3 p-3 rounded-xl bg-rose-50/50 hover:bg-rose-100 cursor-grab active:cursor-grabbing transition-colors group ${
                      draggedGuest === guest.id ? 'opacity-50' : ''
                    }`}
                  >
                    <GripVertical className="w-4 h-4 text-espresso/30 group-hover:text-espresso/50" />
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-300 to-champagne-300 flex items-center justify-center text-white text-sm font-medium">
                      {guest.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-espresso truncate">
                        {guest.name}
                      </p>
                      <p className="text-xs text-espresso/50">
                        {getRelationLabel(guest.relation)}
                        {guest.plusOne > 0 && ` · +${guest.plusOne}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Tables Grid */}
        <div className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {sortedTables.map((table) => {
              const tableGuests = getTableGuests(table.id);
              const isOver = tableGuests.length > table.capacity;
              const dragState = getTableDragState(table.id);
              const isDragAllowed = dragState === null ? true : dragState.allowed;
              const showBlocked = dragState !== null && !isDragAllowed;

              return (
                <div
                  key={table.id}
                  className={`bg-white rounded-2xl shadow-soft overflow-hidden transition-all relative ${
                    dragOverTable === table.id
                      ? showBlocked
                        ? 'ring-4 ring-red-400 scale-[1.02]'
                        : 'ring-4 ring-green-400 scale-[1.02]'
                      : ''
                  } ${isOver ? 'ring-2 ring-red-300' : ''}`}
                  onDragOver={(e) => handleDragOver(e, table.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, table.id)}
                >
                  {showBlocked && (
                    <div className="absolute top-4 right-4 z-20 bg-red-500 text-white text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-pulse">
                      <Ban className="w-3.5 h-3.5" />
                      {dragState?.reason || '不符合规则'}
                    </div>
                  )}

                  {/* Table Header */}
                  <div className={`p-4 border-b border-champagne-100 transition-colors ${
                    showBlocked
                      ? 'bg-gradient-to-r from-red-50 to-red-100'
                      : dragOverTable === table.id
                        ? 'bg-gradient-to-r from-green-50 to-champagne-50'
                        : 'bg-gradient-to-r from-champagne-50 to-champagne-100'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`w-8 h-8 rounded-full text-white flex items-center justify-center text-sm font-bold ${
                            showBlocked
                              ? 'bg-red-400'
                              : dragOverTable === table.id
                                ? 'bg-green-400'
                                : 'bg-champagne-400'
                          }`}>
                            {table.tableNumber}
                          </span>
                          <h3 className="font-semibold text-espresso">
                            {table.tableName || `第${table.tableNumber}桌`}
                          </h3>
                        </div>
                        <p className={`text-xs mt-1 ${
                          isOver ? 'text-red-600 font-medium' : 'text-espresso/50'
                        }`}>
                          {tableGuests.length}/{table.capacity} 人
                          {isOver && ' · 超员'}
                          {table.notes && ` · ${table.notes}`}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenEditTable(table)}
                          className="p-1.5 rounded-lg hover:bg-white/60 text-espresso/50 hover:text-espresso transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTable(table.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-espresso/50 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Table Visualization */}
                  <div className={`p-6 flex justify-center transition-colors ${
                    showBlocked ? 'bg-red-50/30' : ''
                  }`}>
                    <div className="relative" style={{ width: 192, height: 192 }}>
                      {/* Table circle */}
                      <div
                        className={`absolute rounded-full shadow-inner flex items-center justify-center transition-colors ${
                          showBlocked
                            ? 'bg-gradient-to-br from-red-200 to-red-300'
                            : isOver
                              ? 'bg-gradient-to-br from-red-200 to-amber-200'
                              : 'bg-gradient-to-br from-champagne-200 to-champagne-300'
                        }`}
                        style={{
                          inset: table.capacity <= 8 ? 48 : table.capacity <= 12 ? 44 : table.capacity <= 16 ? 40 : 36,
                        }}
                      >
                        <span className={`font-serif font-semibold ${
                          showBlocked ? 'text-red-700' : 'text-champagne-700'
                        }`}>
                          {table.tableNumber}号桌
                        </span>
                      </div>
                      {/* Seats */}
                      {renderSeats(table)}
                    </div>
                  </div>

                  {/* Guest List */}
                  <div className="px-4 pb-4">
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {tableGuests.length === 0 ? (
                        <p className="text-sm text-espresso/30 text-center py-2">暂无宾客，请拖拽安排</p>
                      ) : (
                        tableGuests.map((guest) => {
                          const hasConflict = seatingRules.some((rule) => {
                            if (!rule.guestIds.includes(guest.id)) return false;
                            const othersInRule = rule.guestIds.filter((id) => id !== guest.id);
                            const othersInTable = othersInRule.filter((id) =>
                              tableGuests.some((g) => g.id === id)
                            );
                            if (rule.type === 'avoid' && othersInTable.length > 0) return true;
                            return false;
                          });

                          return (
                            <div
                              key={guest.id}
                              className={`flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg group transition-colors ${
                                hasConflict
                                  ? 'bg-red-50 border border-red-100'
                                  : 'hover:bg-rose-50'
                              }`}
                            >
                              {hasConflict ? (
                                <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                              ) : (
                                <span className="w-1.5 h-1.5 rounded-full bg-champagne-400 flex-shrink-0" />
                              )}
                              <span className={`flex-1 truncate ${
                                hasConflict ? 'text-red-700 font-medium' : 'text-espresso/80'
                              }`}>
                                {guest.name}
                                {hasConflict && <span className="text-xs text-red-500 ml-1">(冲突)</span>}
                              </span>
                              <button
                                onClick={() => handleRemoveFromTable(guest.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-espresso/40 hover:text-red-500 transition-all"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add Table Card */}
            <button
              onClick={handleOpenAddTable}
              className="min-h-80 rounded-2xl border-2 border-dashed border-rose-200 bg-white/50 hover:bg-white hover:border-rose-400 transition-all flex flex-col items-center justify-center gap-3 group"
            >
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center group-hover:bg-rose-200 transition-colors">
                <Plus className="w-6 h-6 text-rose-500" />
              </div>
              <span className="text-espresso/50 group-hover:text-rose-500 transition-colors">
                添加餐桌
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Seating Rules */}
      {seatingRules.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-soft">
          <h3 className="font-semibold text-espresso mb-4">排座规则</h3>
          <div className="grid grid-cols-2 gap-4">
            {seatingRules.map((rule) => (
              <div
                key={rule.id}
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  rule.type === 'together' ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                {rule.type === 'together' ? (
                  <LinkIcon className="w-5 h-5 text-green-500" />
                ) : (
                  <Ban className="w-5 h-5 text-red-500" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-espresso">
                    {rule.type === 'together' ? '必须同桌' : '避开同桌'}
                  </p>
                  <p className="text-xs text-espresso/60">
                    {rule.guestIds.map((id) => getGuestName(id)).join('、')}
                  </p>
                </div>
                <button
                  onClick={() => deleteSeatingRule(rule.id)}
                  className="p-1.5 rounded-lg hover:bg-white text-espresso/40 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table Modal */}
      <Modal
        isOpen={showTableModal}
        onClose={() => setShowTableModal(false)}
        title={editingTable ? '编辑餐桌' : '添加餐桌'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-espresso/80 mb-2">
                桌号
              </label>
              <input
                type="number"
                min="1"
                value={tableForm.tableNumber}
                onChange={(e) =>
                  setTableForm({
                    ...tableForm,
                    tableNumber: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-espresso/80 mb-2">
                座位数
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={tableForm.capacity}
                onChange={(e) =>
                  setTableForm({
                    ...tableForm,
                    capacity: parseInt(e.target.value) || 10,
                  })
                }
                className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
              <p className="text-xs text-espresso/40 mt-1">建议 6-20 人，支持大桌展示</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-espresso/80 mb-2">
              桌名
            </label>
            <input
              type="text"
              value={tableForm.tableName}
              onChange={(e) =>
                setTableForm({ ...tableForm, tableName: e.target.value })
              }
              className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
              placeholder="如：主桌、亲友桌等"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-espresso/80 mb-2">
              备注
            </label>
            <input
              type="text"
              value={tableForm.notes}
              onChange={(e) =>
                setTableForm({ ...tableForm, notes: e.target.value })
              }
              className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
              placeholder="可选"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowTableModal(false)}>
              取消
            </Button>
            <Button onClick={handleSaveTable}>
              {editingTable ? '保存' : '添加'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Rule Modal */}
      <Modal
        isOpen={showRuleModal}
        onClose={() => setShowRuleModal(false)}
        title="设置排座规则"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-espresso/80 mb-2">
              规则类型
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setRuleForm({ ...ruleForm, type: 'together' })}
                className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                  ruleForm.type === 'together'
                    ? 'border-green-400 bg-green-50 text-green-700'
                    : 'border-rose-100 text-espresso/60 hover:border-rose-200'
                }`}
              >
                <LinkIcon className="w-5 h-5 mx-auto mb-1" />
                <p className="text-sm font-medium">必须同桌</p>
              </button>
              <button
                onClick={() => setRuleForm({ ...ruleForm, type: 'avoid' })}
                className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                  ruleForm.type === 'avoid'
                    ? 'border-red-400 bg-red-50 text-red-700'
                    : 'border-rose-100 text-espresso/60 hover:border-rose-200'
                }`}
              >
                <Ban className="w-5 h-5 mx-auto mb-1" />
                <p className="text-sm font-medium">避开同桌</p>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-espresso/80 mb-2">
              选择宾客（至少2位）
            </label>
            <div className="max-h-64 overflow-y-auto border border-rose-100 rounded-xl p-2 space-y-1">
              {confirmedGuests.map((guest) => (
                <label
                  key={guest.id}
                  className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                    ruleForm.guestIds.includes(guest.id)
                      ? 'bg-rose-100'
                      : 'hover:bg-rose-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={ruleForm.guestIds.includes(guest.id)}
                    onChange={() => toggleRuleGuest(guest.id)}
                    className="w-4 h-4 text-rose-500 rounded focus:ring-rose-300"
                  />
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-300 to-champagne-300 flex items-center justify-center text-white text-sm font-medium">
                    {guest.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-espresso">
                      {guest.name}
                    </p>
                    <p className="text-xs text-espresso/50">
                      {getRelationLabel(guest.relation)}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowRuleModal(false)}>
              取消
            </Button>
            <Button onClick={handleAddRule}>添加规则</Button>
          </div>
        </div>
      </Modal>
        </>
      )}
    </div>
  );
};

export default SeatingPage;
