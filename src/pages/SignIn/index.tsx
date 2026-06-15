import { useState, useMemo } from 'react';
import {
  Users,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Download,
  Clock,
  Search,
  Filter,
  Minus,
  Plus,
  Undo2,
  Building2,
  Crown,
  AlertCircle,
} from 'lucide-react';
import useAppStore from '@/store/useAppStore';
import Button from '@/components/Button';
import { generateSignInList, getRelationLabel, formatCurrency } from '@/utils/helpers';

type ViewMode = 'byTable' | 'byFamily';
type FilterRelation = 'all' | 'groom' | 'bride' | 'colleague' | 'friend' | 'other';

const SignInPage = () => {
  const {
    guests,
    tables,
    families,
    signInGuest,
    signOutGuest,
    signInFamily,
    signOutFamily,
    updateGuest,
  } = useAppStore();

  const [viewMode, setViewMode] = useState<ViewMode>('byTable');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRelation, setFilterRelation] = useState<FilterRelation>('all');
  const [showOnlyUnsigned, setShowOnlyUnsigned] = useState(false);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());

  const activeGuests = useMemo(
    () => guests.filter((g) => g.status !== 'declined'),
    [guests]
  );

  const stats = useMemo(() => {
    const totalExpected = activeGuests.reduce(
      (sum, g) => sum + 1 + (g.plusOne || 0),
      0
    );
    const signedGuests = activeGuests.filter((g) => g.signedIn);
    const familiesSigned = new Set(
      signedGuests.filter((g) => g.familyId).map((g) => g.familyId)
    ).size;

    const totalArrived = signedGuests.reduce(
      (sum, g) => sum + (g.arrivedCount ?? 1 + (g.plusOne || 0)),
      0
    );

    const signedWithTable = signedGuests.filter((g) => g.tableId).length;
    const signedWithoutTable = signedGuests.filter((g) => !g.tableId).length;

    const tableSignedCount = new Map<string, number>();
    signedGuests.forEach((g) => {
      if (g.tableId) {
        tableSignedCount.set(
          g.tableId,
          (tableSignedCount.get(g.tableId) || 0) +
            (g.arrivedCount ?? 1 + (g.plusOne || 0))
        );
      }
    });

    return {
      totalGuests: activeGuests.length,
      totalExpected,
      signedCount: signedGuests.length,
      familiesSigned,
      totalArrived,
      signedWithTable,
      signedWithoutTable,
      tableSignedCount,
      progressPct: totalExpected > 0 ? (totalArrived / totalExpected) * 100 : 0,
    };
  }, [activeGuests]);

  const unassignedSigned = useMemo(() => {
    return activeGuests.filter((g) => g.signedIn && !g.tableId);
  }, [activeGuests]);

  const handleExport = () => {
    const content = generateSignInList(guests, tables, families);
    const header = '签到名单 - 现场导出\n';
    const headerInfo =
      `导出时间: ${new Date().toLocaleString('zh-CN')}\n` +
      `实际总到场: ${stats.totalArrived} 人  (签到 ${stats.signedCount} 位宾客 + 携伴)\n\n`;
    const signStatusInfo = guests
      .filter((g) => g.signedIn)
      .map((g) => {
        const arrived = g.arrivedCount ?? 1 + (g.plusOne || 0);
        return `✓ ${g.name} - 到场${arrived}人 ${g.signedInAt ? `(${new Date(g.signedInAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })})` : ''}`;
      })
      .join('\n');
    const finalContent =
      header +
      headerInfo +
      '--- 现场签到记录 ---\n' +
      (signStatusInfo || '暂无签到记录') +
      '\n\n--- 预计席位名单 (与席位安排一致) ---\n' +
      content;
    const blob = new Blob([finalContent], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `签到名单_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleTable = (tableId: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableId)) next.delete(tableId);
      else next.add(tableId);
      return next;
    });
  };

  const toggleFamily = (familyId: string) => {
    setExpandedFamilies((prev) => {
      const next = new Set(prev);
      if (next.has(familyId)) next.delete(familyId);
      else next.add(familyId);
      return next;
    });
  };

  const matchesFilters = (
    name: string,
    relation: string,
    signedIn: boolean
  ) => {
    if (searchQuery && !name.toLowerCase().includes(searchQuery.toLowerCase()))
      return false;
    if (filterRelation !== 'all' && relation !== filterRelation) return false;
    if (showOnlyUnsigned && signedIn) return false;
    return true;
  };

  const adjustArrived = (guestId: string, delta: number) => {
    const guest = guests.find((g) => g.id === guestId);
    if (!guest) return;
    const current =
      guest.arrivedCount ??
      (guest.signedIn ? 1 + (guest.plusOne || 0) : 1 + (guest.plusOne || 0));
    const next = Math.max(0, Math.min(99, current + delta));
    updateGuest(guestId, { arrivedCount: next });
  };

  const signedInAtLabel = (iso: string | null) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const sortedTables = [...tables].sort((a, b) => a.tableNumber - b.tableNumber);

  // ====== By Table View ======
  const renderByTable = () => (
    <div className="space-y-4">
      {unassignedSigned.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 border-2 border-amber-200 rounded-2xl p-5 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-amber-800">
                未分桌已签到 ({unassignedSigned.length} 位)
              </h3>
            </div>
            <span className="text-sm font-medium text-amber-700 bg-white/60 px-3 py-1 rounded-full">
              到场
              {unassignedSigned.reduce(
                (s, g) => s + (g.arrivedCount ?? 1 + (g.plusOne || 0)),
                0
              )}{' '}
              人（已计入总统计）
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {unassignedSigned.map((g) => (
              <div
                key={g.id}
                className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-300 to-amber-400 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                  {g.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-espresso truncate">
                    {g.name}
                  </p>
                  <p className="text-xs text-espresso/50">
                    {getRelationLabel(g.relation)} · 到场
                    {g.arrivedCount ?? 1 + (g.plusOne || 0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sortedTables.map((table) => {
        const tableGuests = activeGuests.filter((g) => g.tableId === table.id);
        const visibleGuests = tableGuests.filter((g) =>
          matchesFilters(g.name, g.relation, g.signedIn)
        );
        if (showOnlyUnsigned && visibleGuests.length === 0) return null;
        if (
          searchQuery &&
          !tableGuests.some((g) =>
            g.name.toLowerCase().includes(searchQuery.toLowerCase())
          ) &&
          filterRelation === 'all'
        )
          return null;

        const signedInThis = tableGuests.filter((g) => g.signedIn);
        const arrivedThis = signedInThis.reduce(
          (s, g) => s + (g.arrivedCount ?? 1 + (g.plusOne || 0)),
          0
        );
        const totalExpectedThis = tableGuests.reduce(
          (s, g) => s + 1 + (g.plusOne || 0),
          0
        );
        const isExpanded = expandedTables.has(table.id);
        const allSigned =
          tableGuests.length > 0 &&
          tableGuests.every((g) => g.signedIn);

        return (
          <div
            key={table.id}
            className={`bg-white rounded-2xl shadow-soft overflow-hidden transition-all ${
              allSigned ? 'ring-2 ring-green-200' : ''
            }`}
          >
            <button
              onClick={() => toggleTable(table.id)}
              className={`w-full p-4 flex items-center justify-between text-left transition-colors ${
                allSigned
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50'
                  : 'bg-gradient-to-r from-rose-50 to-champagne-50 hover:from-rose-100 hover:to-champagne-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                    allSigned
                      ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                      : 'bg-gradient-to-br from-champagne-400 to-champagne-500'
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
                      <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        全部签到
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-espresso/50 mt-0.5">
                    {signedInThis.length}/{tableGuests.length} 位宾客 · 到场 {arrivedThis}/{totalExpectedThis} 人
                    {table.notes && ` · ${table.notes}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <div className="text-sm">
                    <span className="font-bold text-green-600">{arrivedThis}</span>
                    <span className="text-espresso/40"> / {totalExpectedThis} 人</span>
                  </div>
                  <div className="w-24 h-1.5 bg-rose-100 rounded-full overflow-hidden mt-1 ml-auto">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full transition-all"
                      style={{
                        width: `${totalExpectedThis > 0 ? Math.min(100, (arrivedThis / totalExpectedThis) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-espresso/40" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-espresso/40" />
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="divide-y divide-rose-50 border-t border-rose-50">
                {visibleGuests.length === 0 ? (
                  <div className="p-6 text-center text-espresso/40 text-sm">
                    {showOnlyUnsigned
                      ? '该桌宾客均已完成签到'
                      : '暂无匹配的宾客'}
                  </div>
                ) : (
                  visibleGuests.map((g) => (
                    <GuestSignInRow
                      key={g.id}
                      guest={g}
                      onSignIn={() => signInGuest(g.id)}
                      onSignOut={() => signOutGuest(g.id)}
                      onAdjust={(delta) => adjustArrived(g.id, delta)}
                      signedInAtLabel={signedInAtLabel(g.signedInAt)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ====== By Family View ======
  const renderByFamily = () => {
    const familiesWithMembers = families.filter((f) =>
      activeGuests.some((g) => g.familyId === f.id)
    );
    const ungroupedGuests = activeGuests.filter((g) => !g.familyId);

    const matchUngrouped = ungroupedGuests.filter((g) =>
      matchesFilters(g.name, g.relation, g.signedIn)
    );

    return (
      <div className="space-y-4">
        {familiesWithMembers.map((family) => {
          const members = activeGuests.filter((g) => g.familyId === family.id);
          const visible = members.filter((g) =>
            matchesFilters(g.name, g.relation, g.signedIn)
          );

          if (
            searchQuery &&
            !members.some((m) =>
              m.name.toLowerCase().includes(searchQuery.toLowerCase())
            ) &&
            !family.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
            return null;
          if (showOnlyUnsigned && visible.length === 0) return null;
          if (filterRelation !== 'all' && family.relation !== filterRelation)
            return null;

          const signedMembers = members.filter((m) => m.signedIn);
          const arrivedTotal = signedMembers.reduce(
            (s, m) => s + (m.arrivedCount ?? 1 + (m.plusOne || 0)),
            0
          );
          const expectedTotal = members.reduce(
            (s, m) => s + 1 + (m.plusOne || 0),
            0
          );
          const allSigned =
            members.length > 0 && members.every((m) => m.signedIn);
          const isExpanded = expandedFamilies.has(family.id);

          const primaryTableId = members.find((m) => m.tableId)?.tableId;
          const primaryTable = tables.find((t) => t.id === primaryTableId);

          return (
            <div
              key={family.id}
              className={`bg-white rounded-2xl shadow-soft overflow-hidden ${
                allSigned ? 'ring-2 ring-green-200' : ''
              }`}
            >
              <button
                onClick={() => toggleFamily(family.id)}
                className={`w-full p-4 flex items-center justify-between text-left transition-colors ${
                  allSigned
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50'
                    : 'bg-gradient-to-r from-champagne-50 to-rose-50 hover:from-champagne-100 hover:to-rose-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                      allSigned
                        ? 'bg-gradient-to-br from-green-300 to-emerald-400'
                        : 'bg-gradient-to-br from-rose-200 to-champagne-300'
                    }`}
                  >
                    <Users
                      className={`w-5 h-5 ${
                        allSigned ? 'text-white' : 'text-rose-600'
                      }`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-espresso">
                        {family.name}
                      </h3>
                      <span className="text-xs bg-espresso/5 text-espresso/60 px-2 py-0.5 rounded-full">
                        {getRelationLabel(family.relation)}
                      </span>
                      {primaryTable && (
                        <span className="text-xs bg-champagne-100 text-champagne-700 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          {primaryTable.tableName || `${primaryTable.tableNumber}号桌`}
                        </span>
                      )}
                      {allSigned && (
                        <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          全家签到
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-espresso/50 mt-0.5">
                      {signedMembers.length}/{members.length} 位家庭成员 · 到场{' '}
                      {arrivedTotal}/{expectedTotal} 人
                      {family.notes && ` · ${family.notes}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <div className="text-sm">
                      <span className="font-bold text-green-600">
                        {arrivedTotal}
                      </span>
                      <span className="text-espresso/40">
                        {' '}
                        / {expectedTotal} 人
                      </span>
                    </div>
                    <div className="w-24 h-1.5 bg-rose-100 rounded-full overflow-hidden mt-1 ml-auto">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full transition-all"
                        style={{
                          width: `${expectedTotal > 0 ? Math.min(100, (arrivedTotal / expectedTotal) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!allSigned && signedMembers.length === 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          signInFamily(family.id);
                        }}
                        className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-lg hover:shadow-md transition-all"
                      >
                        一键全家签到
                      </button>
                    )}
                    {signedMembers.length > 0 && !allSigned && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          signInFamily(family.id);
                        }}
                        className="px-3 py-1.5 text-xs font-medium bg-champagne-100 text-champagne-700 rounded-lg hover:bg-champagne-200 transition-all"
                      >
                        全家补签到
                      </button>
                    )}
                    {signedMembers.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('确定撤销整户签到记录吗？')) {
                            signOutFamily(family.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-espresso/40 hover:bg-red-50 hover:text-red-500 transition-all"
                        title="撤销整户签到"
                      >
                        <Undo2 className="w-4 h-4" />
                      </button>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-espresso/40 ml-1" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-espresso/40 ml-1" />
                    )}
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="divide-y divide-rose-50 border-t border-rose-50">
                  {visible.map((m) => (
                    <GuestSignInRow
                      key={m.id}
                      guest={m}
                      onSignIn={() => signInGuest(m.id)}
                      onSignOut={() => signOutGuest(m.id)}
                      onAdjust={(delta) => adjustArrived(m.id, delta)}
                      signedInAtLabel={signedInAtLabel(m.signedInAt)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Ungrouped */}
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-espresso/5 to-espresso/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-espresso/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-espresso/60" />
              </div>
              <div>
                <h3 className="font-semibold text-espresso">未分组宾客</h3>
                <p className="text-xs text-espresso/50 mt-0.5">
                  {ungroupedGuests.filter((g) => g.signedIn).length}/
                  {ungroupedGuests.length} 位
                </p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-rose-50">
            {matchUngrouped.length === 0 ? (
              <div className="p-6 text-center text-espresso/40 text-sm">
                {showOnlyUnsigned ? '全部已签到' : '暂无匹配的宾客'}
              </div>
            ) : (
              matchUngrouped.map((g) => (
                <GuestSignInRow
                  key={g.id}
                  guest={g}
                  onSignIn={() => signInGuest(g.id)}
                  onSignOut={() => signOutGuest(g.id)}
                  onAdjust={(delta) => adjustArrived(g.id, delta)}
                  signedInAtLabel={signedInAtLabel(g.signedInAt)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-espresso">现场签到</h1>
          <p className="mt-2 text-espresso/60">
            按桌或按家庭签到，实时查看到场统计，和导出名单完全一致
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleExport}>
            <Download className="w-4 h-4" />
            导出签到名单
          </Button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-espresso/60">预计总人数</p>
              <p className="mt-2 text-3xl font-bold text-espresso font-serif">
                {stats.totalExpected}
              </p>
              <p className="text-xs text-espresso/50 mt-1">
                {stats.totalGuests} 位宾客 + 携伴
              </p>
            </div>
            <div className="w-12 h-12 bg-white/70 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-espresso/60">已到场总人数</p>
              <p className="mt-2 text-3xl font-bold text-green-700 font-serif">
                {stats.totalArrived}
              </p>
              <p className="text-xs text-espresso/50 mt-1">
                {stats.signedCount} 位宾客已签到
              </p>
            </div>
            <div className="w-12 h-12 bg-white/70 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-espresso/60">到场家庭数</p>
              <p className="mt-2 text-3xl font-bold text-amber-700 font-serif">
                {stats.familiesSigned}
              </p>
              <p className="text-xs text-espresso/50 mt-1">
                未分桌到场 {stats.signedWithoutTable} 位
              </p>
            </div>
            <div className="w-12 h-12 bg-white/70 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-champagne-100 rounded-2xl p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-espresso/60">整体到场率</p>
              <p className="mt-2 text-3xl font-bold text-rose-600 font-serif">
                {stats.progressPct.toFixed(0)}%
              </p>
              <div className="w-full h-1.5 bg-white/70 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-gradient-to-r from-rose-400 to-champagne-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, stats.progressPct)}%` }}
                />
              </div>
            </div>
            <div className="w-12 h-12 bg-white/70 rounded-xl flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-rose-500" />
            </div>
          </div>
        </div>
      </div>

      {/* View Switcher + Filters */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white rounded-2xl p-4 shadow-soft">
        <div className="flex items-center gap-2 bg-rose-50 rounded-xl p-1">
          <button
            onClick={() => setViewMode('byTable')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'byTable'
                ? 'bg-white text-espresso shadow-sm'
                : 'text-espresso/60 hover:text-espresso'
            }`}
          >
            <Crown className="w-4 h-4 inline mr-1.5" />
            按桌签到
          </button>
          <button
            onClick={() => setViewMode('byFamily')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'byFamily'
                ? 'bg-white text-espresso shadow-sm'
                : 'text-espresso/60 hover:text-espresso'
            }`}
          >
            <Users className="w-4 h-4 inline mr-1.5" />
            按家庭签到
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-espresso/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-rose-100 rounded-xl w-52 focus:outline-none focus:ring-2 focus:ring-rose-200"
              placeholder="搜索宾客姓名..."
            />
          </div>
          <div className="flex items-center gap-1.5 border border-rose-100 rounded-xl px-2 py-1.5">
            <Filter className="w-4 h-4 text-espresso/40" />
            <select
              value={filterRelation}
              onChange={(e) =>
                setFilterRelation(e.target.value as FilterRelation)
              }
              className="text-sm text-espresso/70 bg-transparent focus:outline-none cursor-pointer pr-1"
            >
              <option value="all">全部关系</option>
              <option value="groom">男方亲友</option>
              <option value="bride">女方亲友</option>
              <option value="colleague">同事</option>
              <option value="friend">朋友</option>
              <option value="other">其他</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-espresso/70 select-none px-3 py-2 border border-rose-100 rounded-xl hover:bg-rose-50 transition-colors">
            <input
              type="checkbox"
              checked={showOnlyUnsigned}
              onChange={(e) => setShowOnlyUnsigned(e.target.checked)}
              className="w-4 h-4 text-rose-500 rounded focus:ring-rose-300"
            />
            仅看未签到
          </label>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'byTable' ? renderByTable() : renderByFamily()}
    </div>
  );
};

// ===== Sub Component =====
interface GuestSignInRowProps {
  guest: any;
  onSignIn: () => void;
  onSignOut: () => void;
  onAdjust: (delta: number) => void;
  signedInAtLabel: string;
}

const GuestSignInRow = ({
  guest,
  onSignIn,
  onSignOut,
  onAdjust,
  signedInAtLabel,
}: GuestSignInRowProps) => {
  const defaultCount = 1 + (guest.plusOne || 0);
  const arrived = guest.signedIn
    ? guest.arrivedCount ?? defaultCount
    : defaultCount;

  return (
    <div
      className={`p-4 flex items-center gap-4 transition-colors ${
        guest.signedIn ? 'bg-green-50/40 hover:bg-green-50/60' : 'hover:bg-rose-50/40'
      }`}
    >
      <button
        onClick={guest.signedIn ? onSignOut : onSignIn}
        className={`p-0.5 transition-all flex-shrink-0 ${
          guest.signedIn
            ? 'text-green-500 hover:text-green-600'
            : 'text-espresso/30 hover:text-rose-500'
        }`}
        title={guest.signedIn ? '点击撤销签到' : '点击签到'}
      >
        {guest.signedIn ? (
          <CheckCircle2 className="w-6 h-6" fill="currentColor" />
        ) : (
          <Circle className="w-6 h-6" />
        )}
      </button>

      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-200 to-champagne-300 flex items-center justify-center text-espresso text-sm font-medium flex-shrink-0">
        {guest.name.charAt(0)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`font-medium ${
              guest.signedIn ? 'text-espresso' : 'text-espresso/90'
            }`}
          >
            {guest.name}
          </span>
          <span className="text-xs bg-espresso/5 text-espresso/60 px-2 py-0.5 rounded-full">
            {getRelationLabel(guest.relation)}
          </span>
          {guest.dietary && (
            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100">
              {guest.dietary}
            </span>
          )}
          {guest.plusOne > 0 && (
            <span className="text-xs bg-champagne-50 text-champagne-700 px-2 py-0.5 rounded-full">
              +{guest.plusOne} 携伴
            </span>
          )}
        </div>
        <div className="text-xs text-espresso/50 mt-0.5 flex items-center gap-2 flex-wrap">
          {guest.phone && <span>{guest.phone}</span>}
          {guest.signedIn && signedInAtLabel && (
            <span className="inline-flex items-center gap-1 text-green-600/80">
              <Clock className="w-3 h-3" />
              {signedInAtLabel} 签到
            </span>
          )}
          {!guest.signedIn && guest.notes && (
            <span className="text-espresso/40">{guest.notes}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-espresso/50 hidden sm:inline">
          到场人数
        </span>
        <div
          className={`flex items-center border rounded-lg overflow-hidden transition-colors ${
            guest.signedIn
              ? 'border-green-200 bg-green-50'
              : 'border-espresso/10 bg-espresso/[0.02] opacity-50'
          }`}
        >
          <button
            disabled={!guest.signedIn}
            onClick={() => onAdjust(-1)}
            className={`px-2.5 py-1.5 transition-colors ${
              guest.signedIn
                ? 'hover:bg-green-100 text-green-700'
                : 'text-espresso/30 cursor-not-allowed'
            }`}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span
            className={`px-3 py-1.5 min-w-[2.5rem] text-center font-bold ${
              guest.signedIn ? 'text-green-700' : 'text-espresso/40'
            }`}
          >
            {arrived}
          </span>
          <button
            disabled={!guest.signedIn}
            onClick={() => onAdjust(1)}
            className={`px-2.5 py-1.5 transition-colors ${
              guest.signedIn
                ? 'hover:bg-green-100 text-green-700'
                : 'text-espresso/30 cursor-not-allowed'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
