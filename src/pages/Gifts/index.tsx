import { useState, useMemo } from 'react';
import {
  Gift,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Download,
  Crown,
  Users,
  AlertCircle,
  X,
} from 'lucide-react';
import useAppStore from '@/store/useAppStore';
import Button from '@/components/Button';
import { GiftRecord } from '@/types';
import { getRelationLabel, formatCurrency } from '@/utils/helpers';

type ViewMode = 'byFamily' | 'byTable' | 'byRelation';
type FilterReturned = 'all' | 'returned' | 'unreturned';

const GiftsPage = () => {
  const {
    guests,
    tables,
    families,
    giftRecords,
    addGiftRecord,
    updateGiftRecord,
    deleteGiftRecord,
    markGiftReturned,
  } = useAppStore();

  const [viewMode, setViewMode] = useState<ViewMode>('byFamily');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterReturned, setFilterReturned] = useState<FilterReturned>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [addForm, setAddForm] = useState({
    familyId: '',
    guestId: '',
    amount: 0,
    receivedBy: '新郎',
    notes: '',
  });

  const activeGuests = useMemo(
    () => guests.filter((g) => g.status !== 'declined'),
    [guests]
  );

  const stats = useMemo(() => {
    const total = giftRecords.reduce((s, r) => s + r.amount, 0);
    const returned = giftRecords.filter((r) => r.giftReturned).reduce((s, r) => s + r.amount, 0);
    const unreturned = giftRecords.filter((r) => !r.giftReturned).reduce((s, r) => s + r.amount, 0);
    const count = giftRecords.length;
    const returnedCount = giftRecords.filter((r) => r.giftReturned).length;
    const unreturnedCount = count - returnedCount;
    const signedFamilies = new Set(
      activeGuests.filter((g) => g.signedIn && g.familyId).map((g) => g.familyId)
    );
    const familiesWithGift = new Set(
      giftRecords.filter((r) => r.familyId).map((r) => r.familyId)
    );
    const signedWithoutGift = [...signedFamilies].filter((f) => !familiesWithGift.has(f)).length;
    return { total, returned, unreturned, count, returnedCount, unreturnedCount, signedWithoutGift };
  }, [giftRecords, activeGuests]);

  const filteredRecords = useMemo(() => {
    let records = [...giftRecords];
    if (filterReturned === 'returned') records = records.filter((r) => r.giftReturned);
    if (filterReturned === 'unreturned') records = records.filter((r) => !r.giftReturned);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      records = records.filter((r) => {
        const g = guests.find((gg) => gg.id === r.guestId);
        const f = families.find((ff) => ff.id === r.familyId);
        return (
          (g && g.name.toLowerCase().includes(q)) ||
          (f && f.name.toLowerCase().includes(q)) ||
          r.receivedBy.toLowerCase().includes(q) ||
          r.notes.toLowerCase().includes(q)
        );
      });
    }
    return records;
  }, [giftRecords, filterReturned, searchQuery, guests, families]);

  const groupedByFamily = useMemo(() => {
    const map = new Map<string, { familyId: string | null; familyName: string; records: GiftRecord[]; relation: string; tableNames: string }>();
    filteredRecords.forEach((r) => {
      const key = r.familyId || `__single_${r.guestId}`;
      if (!map.has(key)) {
        const fam = r.familyId ? families.find((f) => f.id === r.familyId) : null;
        const g = guests.find((gg) => gg.id === r.guestId);
        const familyMembers = r.familyId
          ? guests.filter((gg) => gg.familyId === r.familyId)
          : g ? [g] : [];
        const tableIds = new Set(familyMembers.map((m) => m.tableId).filter(Boolean));
        const tNames = [...tableIds]
          .map((tid) => {
            const t = tables.find((tt) => tt.id === tid);
            return t ? `第${t.tableNumber}桌` : '';
          })
          .filter(Boolean)
          .join('、') || '未分桌';
        map.set(key, {
          familyId: r.familyId,
          familyName: fam ? fam.name : g?.name || '未知',
          records: [],
          relation: fam ? getRelationLabel(fam.relation) : g ? getRelationLabel(g.relation) : '',
          tableNames: tNames,
        });
      }
      map.get(key)!.records.push(r);
    });
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a.startsWith('__single_') && !b.startsWith('__single_')) return 1;
      if (!a.startsWith('__single_') && b.startsWith('__single_')) return -1;
      return 0;
    });
  }, [filteredRecords, families, guests, tables]);

  const groupedByTable = useMemo(() => {
    const map = new Map<string, { tableId: string; tableName: string; records: GiftRecord[] }>();
    const unassigned: GiftRecord[] = [];
    filteredRecords.forEach((r) => {
      const g = guests.find((gg) => gg.id === r.guestId);
      const familyMembers = r.familyId
        ? guests.filter((gg) => gg.familyId === r.familyId)
        : g ? [g] : [];
      const tableIds = new Set(familyMembers.map((m) => m.tableId).filter((t): t is string => !!t));
      if (tableIds.size === 0) {
        unassigned.push(r);
        return;
      }
      tableIds.forEach((tid) => {
        const t = tables.find((tt) => tt.id === tid);
        const key: string = tid;
        if (!map.has(key)) {
          map.set(key, {
            tableId: tid,
            tableName: t ? `第${t.tableNumber}桌 ${t.tableName || ''}` : '未知桌',
            records: [],
          });
        }
        map.get(key)!.records.push(r);
      });
    });
    const result = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    if (unassigned.length > 0) {
      result.push(['__unassigned', { tableId: '', tableName: '未分桌', records: unassigned }]);
    }
    return result;
  }, [filteredRecords, guests, tables]);

  const groupedByRelation = useMemo(() => {
    const map = new Map<string, { label: string; records: GiftRecord[] }>();
    const order = ['groom', 'bride', 'colleague', 'friend', 'other'];
    filteredRecords.forEach((r) => {
      const g = guests.find((gg) => gg.id === r.guestId);
      const f = r.familyId ? families.find((ff) => ff.id === r.familyId) : null;
      const rel = f ? f.relation : g ? g.relation : 'other';
      if (!map.has(rel)) {
        map.set(rel, { label: getRelationLabel(rel), records: [] });
      }
      map.get(rel)!.records.push(r);
    });
    return order
      .filter((k) => map.has(k))
      .map((k) => [k, map.get(k)!] as [string, { label: string; records: GiftRecord[] }]);
  }, [filteredRecords, guests, families]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleAddGift = () => {
    if (addForm.amount <= 0) return;
    addGiftRecord({
      familyId: addForm.familyId || null,
      guestId: addForm.guestId || null,
      amount: addForm.amount,
      receivedBy: addForm.receivedBy,
      receivedAt: new Date().toISOString(),
      giftReturned: false,
      returnedAt: null,
      notes: addForm.notes,
    });
    setShowAddModal(false);
    setAddForm({ familyId: '', guestId: '', amount: 0, receivedBy: '新郎', notes: '' });
  };

  const handleExport = () => {
    let text = '礼金登记汇总\n';
    text += '='.repeat(70) + '\n';
    text += `导出时间: ${new Date().toLocaleString('zh-CN')}\n`;
    text += `总笔数: ${stats.count}  总金额: ${formatCurrency(stats.total)}\n`;
    text += `已回礼: ${stats.returnedCount}笔 ${formatCurrency(stats.returned)}  未回礼: ${stats.unreturnedCount}笔 ${formatCurrency(stats.unreturned)}\n\n`;

    text += '【礼金明细】\n';
    text += '-'.repeat(70) + '\n';
    giftRecords.forEach((r, i) => {
      const g = guests.find((gg) => gg.id === r.guestId);
      const f = r.familyId ? families.find((ff) => ff.id === r.familyId) : null;
      const name = f ? f.name : g?.name || '未知';
      const ret = r.giftReturned ? '✓已回礼' : '○未回礼';
      text += `${String(i + 1).padStart(2, '0')}. ${name.padEnd(12)} ${formatCurrency(r.amount).padEnd(10)} 代收:${r.receivedBy} ${ret} ${r.notes ? '(' + r.notes + ')' : ''}\n`;
    });

    text += '\n【未回礼清单】\n';
    text += '-'.repeat(70) + '\n';
    const unreturned = giftRecords.filter((r) => !r.giftReturned);
    if (unreturned.length === 0) {
      text += '（全部已回礼）\n';
    } else {
      unreturned.forEach((r, i) => {
        const g = guests.find((gg) => gg.id === r.guestId);
        const f = r.familyId ? families.find((ff) => ff.id === r.familyId) : null;
        const name = f ? f.name : g?.name || '未知';
        text += `${String(i + 1).padStart(2, '0')}. ${name.padEnd(12)} ${formatCurrency(r.amount)}  代收:${r.receivedBy}\n`;
      });
      text += `\n未回礼合计: ${formatCurrency(stats.unreturned)}\n`;
    }

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `礼金汇总_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderRecordRow = (r: GiftRecord) => {
    const g = guests.find((gg) => gg.id === r.guestId);
    const f = r.familyId ? families.find((ff) => ff.id === r.familyId) : null;
    return (
      <div
        key={r.id}
        className={`flex items-center justify-between px-4 py-3 border-b border-rose-50 last:border-0 ${
          r.giftReturned ? 'bg-green-50/30' : ''
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {r.giftReturned ? (
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
          ) : (
            <Circle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-espresso truncate">
              {g?.name || '未知'}
              {f && <span className="text-espresso/50 ml-1">({f.name})</span>}
            </p>
            <p className="text-xs text-espresso/50">
              代收: {r.receivedBy} · {new Date(r.receivedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              {r.notes && ` · ${r.notes}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="font-bold text-espresso font-serif">
            {formatCurrency(r.amount)}
          </span>
          {!r.giftReturned && (
            <button
              onClick={() => markGiftReturned(r.id)}
              className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full hover:bg-green-200 transition-colors font-medium"
            >
              回礼
            </button>
          )}
          <button
            onClick={() => deleteGiftRecord(r.id)}
            className="text-xs text-espresso/30 hover:text-red-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderGroupHeader = (
    key: string,
    title: string,
    subtitle: string,
    count: number,
    amount: number
  ) => {
    const isExpanded = expandedGroups.has(key);
    return (
      <button
        key={key}
        onClick={() => toggleGroup(key)}
        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-champagne-50 to-rose-50 hover:from-champagne-100 hover:to-rose-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-espresso/50" />
          ) : (
            <ChevronDown className="w-4 h-4 text-espresso/50" />
          )}
          <div className="text-left">
            <p className="font-semibold text-espresso text-sm">{title}</p>
            <p className="text-xs text-espresso/50">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-espresso/50">{count} 笔</span>
          <span className="font-bold text-espresso font-serif text-sm">
            {formatCurrency(amount)}
          </span>
        </div>
      </button>
    );
  };

  const groups =
    viewMode === 'byFamily'
      ? groupedByFamily
      : viewMode === 'byTable'
        ? groupedByTable
        : groupedByRelation;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-espresso">礼金登记</h1>
          <p className="mt-2 text-espresso/60">
            签到时顺手登记礼金，按家庭/桌次/关系分组查看，婚宴后一键拉出汇总和未回礼清单
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" />
            登记礼金
          </Button>
          <Button variant="secondary" onClick={handleExport}>
            <Download className="w-4 h-4" />
            导出汇总
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-amber-50 to-champagne-100 rounded-2xl p-5 shadow-soft">
          <p className="text-sm text-espresso/60">礼金总额</p>
          <p className="mt-2 text-2xl font-bold text-amber-700 font-serif">
            {formatCurrency(stats.total)}
          </p>
          <p className="text-xs text-espresso/50 mt-1">{stats.count} 笔</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-5 shadow-soft">
          <p className="text-sm text-espresso/60">已回礼</p>
          <p className="mt-2 text-2xl font-bold text-green-700 font-serif">
            {formatCurrency(stats.returned)}
          </p>
          <p className="text-xs text-espresso/50 mt-1">{stats.returnedCount} 笔</p>
        </div>
        <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-2xl p-5 shadow-soft">
          <p className="text-sm text-espresso/60">未回礼</p>
          <p className="mt-2 text-2xl font-bold text-rose-600 font-serif">
            {formatCurrency(stats.unreturned)}
          </p>
          <p className="text-xs text-espresso/50 mt-1">{stats.unreturnedCount} 笔</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5 shadow-soft">
          <p className="text-sm text-espresso/60">已签到未登记</p>
          <p className="mt-2 text-2xl font-bold text-blue-700 font-serif">
            {stats.signedWithoutGift} 户
          </p>
          <p className="text-xs text-espresso/50 mt-1">到场但未记礼金</p>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4 bg-white rounded-2xl p-4 shadow-soft">
        <div className="flex items-center gap-2 bg-rose-50 rounded-xl p-1">
          {([
            { key: 'byFamily', label: '按家庭', icon: Crown },
            { key: 'byTable', label: '按桌次', icon: Users },
            { key: 'byRelation', label: '按关系', icon: Filter },
          ] as { key: ViewMode; label: string; icon: typeof Crown }[]).map((v) => (
            <button
              key={v.key}
              onClick={() => setViewMode(v.key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                viewMode === v.key
                  ? 'bg-white text-espresso shadow-sm'
                  : 'text-espresso/60 hover:text-espresso'
              }`}
            >
              <v.icon className="w-3.5 h-3.5" />
              {v.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-espresso/40" />
            <input
              type="text"
              placeholder="搜索家庭/宾客..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 bg-rose-50 border border-rose-100 rounded-xl text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200 w-44"
            />
          </div>
          <select
            value={filterReturned}
            onChange={(e) => setFilterReturned(e.target.value as FilterReturned)}
            className="px-3 py-2 bg-rose-50 border border-rose-100 rounded-xl text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
          >
            <option value="all">全部</option>
            <option value="returned">已回礼</option>
            <option value="unreturned">未回礼</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="py-16 text-center">
            <Gift className="w-16 h-16 text-champagne-400 mx-auto mb-4" />
            <p className="font-serif text-lg text-espresso">暂无礼金记录</p>
            <p className="mt-2 text-espresso/50 text-sm">点击「登记礼金」开始记录</p>
          </div>
        ) : viewMode === 'byFamily' ? (
          <div className="divide-y divide-rose-50">
            {groupedByFamily.map(([key, group]) => {
              const amount = group.records.reduce((s, r) => s + r.amount, 0);
              const returned = group.records.filter((r) => r.giftReturned).length;
              return (
                <div key={key}>
                  {renderGroupHeader(
                    key,
                    group.familyName,
                    `${group.relation} · ${group.tableNames}`,
                    group.records.length,
                    amount
                  )}
                  {expandedGroups.has(key) && (
                    <div className="bg-white">
                      {group.records.map(renderRecordRow)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : viewMode === 'byTable' ? (
          <div className="divide-y divide-rose-50">
            {groupedByTable.map(([key, group]) => {
              const amount = group.records.reduce((s, r) => s + r.amount, 0);
              return (
                <div key={key}>
                  {renderGroupHeader(key, group.tableName, '', group.records.length, amount)}
                  {expandedGroups.has(key) && (
                    <div className="bg-white">{group.records.map(renderRecordRow)}</div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="divide-y divide-rose-50">
            {groupedByRelation.map(([key, group]) => {
              const amount = group.records.reduce((s, r) => s + r.amount, 0);
              return (
                <div key={key}>
                  {renderGroupHeader(key, group.label, '', group.records.length, amount)}
                  {expandedGroups.has(key) && (
                    <div className="bg-white">{group.records.map(renderRecordRow)}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-espresso/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-card w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100">
              <h3 className="font-serif text-lg font-semibold text-espresso">登记礼金</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-rose-50 text-espresso/60">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-espresso/80 mb-1">选择家庭</label>
                <select
                  value={addForm.familyId}
                  onChange={(e) => {
                    const fid = e.target.value;
                    setAddForm((prev) => ({ ...prev, familyId: fid, guestId: '' }));
                  }}
                  className="w-full px-3 py-2.5 bg-rose-50 border border-rose-100 rounded-xl text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
                >
                  <option value="">不选家庭（选个人）</option>
                  {families.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              {!addForm.familyId && (
                <div>
                  <label className="block text-sm font-medium text-espresso/80 mb-1">选择宾客</label>
                  <select
                    value={addForm.guestId}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, guestId: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-rose-50 border border-rose-100 rounded-xl text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
                  >
                    <option value="">选择宾客</option>
                    {activeGuests.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-espresso/80 mb-1">礼金金额</label>
                <input
                  type="number"
                  value={addForm.amount || ''}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, amount: Number(e.target.value) }))}
                  className="w-full px-3 py-2.5 bg-rose-50 border border-rose-100 rounded-xl text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
                  placeholder="输入金额"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-espresso/80 mb-1">代收人</label>
                <select
                  value={addForm.receivedBy}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, receivedBy: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-rose-50 border border-rose-100 rounded-xl text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
                >
                  <option value="新郎">新郎</option>
                  <option value="新娘">新娘</option>
                  <option value="新郎父母">新郎父母</option>
                  <option value="新娘父母">新娘父母</option>
                  <option value="其他">其他</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-espresso/80 mb-1">备注</label>
                <input
                  type="text"
                  value={addForm.notes}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-rose-50 border border-rose-100 rounded-xl text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-rose-200"
                  placeholder="微信转账、现金等"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setShowAddModal(false)}>取消</Button>
                <Button onClick={handleAddGift} disabled={addForm.amount <= 0 || (!addForm.familyId && !addForm.guestId)}>
                  登记
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GiftsPage;
