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
  } = useAppStore();

  const [showTableModal, setShowTableModal] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [draggedGuest, setDraggedGuest] = useState<string | null>(null);
  const [dragOverTable, setDragOverTable] = useState<string | null>(null);

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
      assignGuestToTable(draggedGuest, tableId);
      setDraggedGuest(null);
    }
  };

  const handleDropUnassigned = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedGuest) {
      assignGuestToTable(draggedGuest, null);
      setDraggedGuest(null);
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-espresso">席位安排</h1>
          <p className="mt-2 text-espresso/60">
            拖拽宾客到对应的餐桌，轻松安排座位
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

              return (
                <div
                  key={table.id}
                  className={`bg-white rounded-2xl shadow-soft overflow-hidden transition-all ${
                    dragOverTable === table.id ? 'ring-2 ring-champagne-400 scale-[1.02]' : ''
                  } ${isOver ? 'ring-2 ring-red-300' : ''}`}
                  onDragOver={(e) => handleDragOver(e, table.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, table.id)}
                >
                  {/* Table Header */}
                  <div className="p-4 bg-gradient-to-r from-champagne-50 to-champagne-100 border-b border-champagne-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-full bg-champagne-400 text-white flex items-center justify-center text-sm font-bold">
                            {table.tableNumber}
                          </span>
                          <h3 className="font-semibold text-espresso">
                            {table.tableName || `第${table.tableNumber}桌`}
                          </h3>
                        </div>
                        <p className="text-xs text-espresso/50 mt-1">
                          {tableGuests.length}/{table.capacity} 人
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
                  <div className="p-6 flex justify-center">
                    <div className="relative w-48 h-48">
                      {/* Table circle */}
                      <div className="absolute inset-6 rounded-full bg-gradient-to-br from-champagne-200 to-champagne-300 shadow-inner flex items-center justify-center">
                        <span className="text-champagne-700 font-serif font-semibold">
                          {table.tableNumber}号桌
                        </span>
                      </div>
                      {/* Seats */}
                      {tableGuests.slice(0, 10).map((guest, idx) => {
                        const angle = (idx / 10) * Math.PI * 2 - Math.PI / 2;
                        const radius = 84;
                        const x = Math.cos(angle) * radius + 96;
                        const y = Math.sin(angle) * radius + 96;

                        return (
                          <div
                            key={guest.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, guest.id)}
                            onDragEnd={() => setDraggedGuest(null)}
                            className={`absolute w-10 h-10 -ml-5 -mt-5 rounded-full bg-white border-2 border-rose-300 flex items-center justify-center text-xs font-medium text-espresso cursor-grab active:cursor-grabbing hover:scale-110 hover:border-rose-500 transition-all shadow-sm ${
                              draggedGuest === guest.id ? 'opacity-50' : ''
                            }`}
                            style={{ left: x, top: y }}
                            title={`${guest.name} (${getRelationLabel(guest.relation)})`}
                          >
                            {guest.name.charAt(0)}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Guest List */}
                  <div className="px-4 pb-4">
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {tableGuests.map((guest) => (
                        <div
                          key={guest.id}
                          className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg hover:bg-rose-50 group"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-champagne-400" />
                          <span className="flex-1 text-espresso/80 truncate">
                            {guest.name}
                          </span>
                          <button
                            onClick={() => assignGuestToTable(guest.id, null)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-espresso/40 hover:text-red-500 transition-all"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
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
                value={tableForm.capacity}
                onChange={(e) =>
                  setTableForm({
                    ...tableForm,
                    capacity: parseInt(e.target.value) || 10,
                  })
                }
                className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
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
