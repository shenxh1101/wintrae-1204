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
} from 'lucide-react';
import useAppStore from '@/store/useAppStore';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { Table, Guest, SeatingRule } from '@/types';
import { getRelationLabel } from '@/utils/helpers';

const SeatingPage = () => {
  const {
    guests,
    tables,
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

  const sortedTables = [...tables].sort((a, b) => a.tableNumber - b.tableNumber);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-espresso">席位安排</h1>
          <p className="mt-2 text-espresso/60">
            拖拽宾客到对应的餐桌，设置排座规则自动校验
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowRuleModal(true)}>
            <Settings className="w-4 h-4" />
            排座规则
          </Button>
          <Button onClick={handleOpenAddTable}>
            <Plus className="w-4 h-4" />
            添加餐桌
          </Button>
        </div>
      </div>

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
    </div>
  );
};

export default SeatingPage;
