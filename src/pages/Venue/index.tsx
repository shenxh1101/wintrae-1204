import { useState, useMemo } from 'react';
import {
  Monitor,
  Users,
  CheckCircle2,
  AlertCircle,
  Gift,
  Crown,
  MoveRight,
  ChevronDown,
  ChevronUp,
  Utensils,
  Filter,
} from 'lucide-react';
import useAppStore from '@/store/useAppStore';
import Button from '@/components/Button';
import { getRelationLabel, formatCurrency } from '@/utils/helpers';

type RelationFilter = 'all' | 'groom' | 'bride' | 'colleague' | 'friend' | 'other';

const VenuePage = () => {
  const {
    guests,
    tables,
    families,
    giftRecords,
    moveFamilyToTable: storeMoveFamily,
  } = useAppStore();

  const [relationFilter, setRelationFilter] = useState<RelationFilter>('all');
  const [moveTarget, setMoveTarget] = useState<{
    mode: 'guest' | 'family';
    id: string;
  } | null>(null);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const showToast = (type: 'error' | 'success', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const activeGuests = useMemo(
    () => guests.filter((g) => g.status !== 'declined'),
    [guests]
  );

  const filteredGuests = useMemo(() => {
    if (relationFilter === 'all') return activeGuests;
    return activeGuests.filter((g) => g.relation === relationFilter);
  }, [activeGuests, relationFilter]);

  const filteredGuestIds = useMemo(
    () => new Set(filteredGuests.map((g) => g.id)),
    [filteredGuests]
  );

  const sortedTables = useMemo(
    () => [...tables].sort((a, b) => a.tableNumber - b.tableNumber),
    [tables]
  );

  const overallStats = useMemo(() => {
    const totalExpected = filteredGuests.reduce((s, g) => s + 1 + (g.plusOne || 0), 0);
    const signedGuests = filteredGuests.filter((g) => g.signedIn);
    const totalArrived = signedGuests.reduce(
      (s, g) => s + (g.arrivedCount ?? 1 + (g.plusOne || 0)),
      0
    );
    const unassigned = filteredGuests.filter((g) => !g.tableId);
    const unassignedSigned = unassigned.filter((g) => g.signedIn);
    const unassignedArrived = unassignedSigned.reduce(
      (s, g) => s + (g.arrivedCount ?? 1 + (g.plusOne || 0)),
      0
    );
    return {
      totalExpected,
      totalArrived,
      signedCount: signedGuests.length,
      progressPct: totalExpected > 0 ? (totalArrived / totalExpected) * 100 : 0,
      unassignedCount: unassigned.length,
      unassignedArrived,
    };
  }, [filteredGuests]);

  const giftStats = useMemo(() => {
    const relevantGifts = giftRecords.filter((r) => {
      if (relationFilter === 'all') return true;
      const g = guests.find((gg) => gg.id === r.guestId);
      return g && g.relation === relationFilter;
    });
    return {
      total: relevantGifts.reduce((s, r) => s + r.amount, 0),
      count: relevantGifts.length,
      unreturned: relevantGifts.filter((r) => !r.giftReturned).reduce((s, r) => s + r.amount, 0),
      unreturnedCount: relevantGifts.filter((r) => !r.giftReturned).length,
    };
  }, [giftRecords, guests, relationFilter]);

  const allDietary = useMemo(() => {
    const set = new Set<string>();
    filteredGuests.forEach((g) => {
      if (g.dietary && g.dietary !== '无') set.add(g.dietary);
    });
    return Array.from(set);
  }, [filteredGuests]);

  const tableStats = useMemo(() => {
    return sortedTables.map((table) => {
      const tableGuests = filteredGuests.filter((g) => g.tableId === table.id);
      const expected = tableGuests.reduce((s, g) => s + 1 + (g.plusOne || 0), 0);
      const signed = tableGuests.filter((g) => g.signedIn);
      const arrived = signed.reduce((s, g) => s + (g.arrivedCount ?? 1 + (g.plusOne || 0)), 0);
      const allSigned = tableGuests.length > 0 && tableGuests.every((g) => g.signedIn);
      const dietaries = Array.from(
        new Set(
          tableGuests
            .map((g) => g.dietary)
            .filter((d): d is string => !!d && d !== '无')
        )
      );
      return { table, tableGuests, expected, arrived, signed: signed.length, allSigned, dietaries };
    });
  }, [sortedTables, filteredGuests]);

  const unassignedGuests = useMemo(
    () => filteredGuests.filter((g) => !g.tableId),
    [filteredGuests]
  );

  const handleMoveFamily = (familyId: string, targetTableId: string) => {
    const result = storeMoveFamily(familyId, targetTableId);
    if (!result.allowed) {
      showToast('error', result.reason || '整户换桌失败');
    } else {
      showToast('success', result.reason || '整户换桌完成');
    }
    setMoveTarget(null);
  };

  const handleMoveGuest = (guestId: string, targetTableId: string) => {
    const { assignGuestToTable } = useAppStore.getState();
    const result = assignGuestToTable(guestId, targetTableId);
    if (!result.allowed) {
      showToast('error', result.reason || '换桌失败');
    } else {
      showToast('success', '已换桌，签到页同步更新');
    }
    setMoveTarget(null);
  };

  return (
    <div className="space-y-5">
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg animate-slide-in ${
            toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
          }`}
        >
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-espresso">
            <Monitor className="w-8 h-8 inline mr-2 text-champagne-500" />
            婚宴总控大屏
          </h1>
          <p className="mt-2 text-espresso/60">
            各桌到场率、忌口、临时换桌、礼金进度一目了然
          </p>
        </div>
        <div className="flex items-center gap-2 bg-rose-50 rounded-xl p-1">
          {([
            { key: 'all', label: '全部' },
            { key: 'groom', label: '男方亲友' },
            { key: 'bride', label: '女方亲友' },
            { key: 'colleague', label: '同事' },
            { key: 'friend', label: '朋友' },
            { key: 'other', label: '其他' },
          ] as { key: RelationFilter; label: string }[]).map((r) => (
            <button
              key={r.key}
              onClick={() => setRelationFilter(r.key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                relationFilter === r.key
                  ? 'bg-white text-espresso shadow-sm'
                  : 'text-espresso/60 hover:text-espresso'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5 shadow-soft">
          <p className="text-sm text-espresso/60">预计到场</p>
          <p className="mt-1 text-2xl font-bold text-blue-700 font-serif">{overallStats.totalExpected} 人</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-5 shadow-soft">
          <p className="text-sm text-espresso/60">已签到</p>
          <p className="mt-1 text-2xl font-bold text-green-700 font-serif">{overallStats.totalArrived} 人</p>
          <div className="w-full h-2 bg-white/70 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, overallStats.progressPct)}%` }}
            />
          </div>
          <p className="text-xs text-espresso/50 mt-1">{Math.round(overallStats.progressPct)}% 到场率</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-5 shadow-soft">
          <p className="text-sm text-espresso/60">未分桌来宾</p>
          <p className="mt-1 text-2xl font-bold text-amber-700 font-serif">{overallStats.unassignedCount} 位</p>
          <p className="text-xs text-espresso/50 mt-1">已签到 {overallStats.unassignedArrived} 人</p>
        </div>
        <div className="bg-gradient-to-br from-champagne-50 to-champagne-100 rounded-2xl p-5 shadow-soft">
          <p className="text-sm text-espresso/60">礼金总额</p>
          <p className="mt-1 text-2xl font-bold text-champagne-700 font-serif">{formatCurrency(giftStats.total)}</p>
          <p className="text-xs text-espresso/50 mt-1">{giftStats.count} 笔已登记</p>
        </div>
        <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-2xl p-5 shadow-soft">
          <p className="text-sm text-espresso/60">未回礼</p>
          <p className="mt-1 text-2xl font-bold text-rose-600 font-serif">{formatCurrency(giftStats.unreturned)}</p>
          <p className="text-xs text-espresso/50 mt-1">{giftStats.unreturnedCount} 笔待回礼</p>
        </div>
      </div>

      {allDietary.length > 0 && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-2">
            <Utensils className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-semibold text-rose-700">
              全场忌口汇总{relationFilter !== 'all' ? `（${getRelationLabel(relationFilter)}）` : ''}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {allDietary.map((d) => {
              const count = filteredGuests.filter((g) => g.dietary === d).length;
              return (
                <span key={d} className="inline-flex items-center gap-1 text-xs bg-white text-rose-700 px-3 py-1.5 rounded-full border border-rose-200 shadow-sm">
                  ⚠ {d} <span className="text-espresso/50">({count}人)</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tableStats.map(({ table, tableGuests, expected, arrived, signed, allSigned, dietaries }) => (
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
            <div
              className={`p-3 flex items-center justify-between cursor-pointer ${
                allSigned
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50'
                  : arrived > 0
                    ? 'bg-gradient-to-r from-amber-50 to-orange-50'
                    : 'bg-gradient-to-r from-champagne-50 to-rose-50'
              }`}
              onClick={() => {
                setExpandedTables((prev) => {
                  const next = new Set(prev);
                  if (next.has(table.id)) next.delete(table.id);
                  else next.add(table.id);
                  return next;
                });
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white font-serif ${
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
                    <span className="font-semibold text-espresso text-sm">
                      {table.tableName || `第${table.tableNumber}桌`}
                    </span>
                    {allSigned && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">齐</span>
                    )}
                    {arrived > expected && (
                      <span className="text-xs bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full">+{arrived - expected}</span>
                    )}
                  </div>
                  <p className="text-xs text-espresso/50">
                    {signed}/{tableGuests.length}位 · {arrived}/{expected}人
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-2 bg-white/70 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      allSigned ? 'bg-green-400' : 'bg-amber-400'
                    }`}
                    style={{ width: `${expected > 0 ? Math.min(100, (arrived / expected) * 100) : 0}%` }}
                  />
                </div>
                {expandedTables.has(table.id) ? (
                  <ChevronUp className="w-4 h-4 text-espresso/40" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-espresso/40" />
                )}
              </div>
            </div>

            {expandedTables.has(table.id) && (
              <div className="p-3 space-y-1.5 border-t border-rose-50">
                {dietaries.length > 0 && (
                  <div className="p-2 bg-rose-50 rounded-lg mb-2">
                    <p className="text-xs text-rose-600 font-medium">⚠ 忌口：{dietaries.join('、')}</p>
                  </div>
                )}
                {tableGuests.map((g) => {
                  const fam = g.familyId ? families.find((f) => f.id === g.familyId) : null;
                  return (
                    <div key={g.id} className="flex items-center justify-between py-1 group">
                      <div className="flex items-center gap-2 min-w-0">
                        {g.signedIn ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
                        )}
                        <span className={`text-sm truncate ${g.signedIn ? 'text-espresso' : 'text-espresso/50'}`}>
                          {g.name}
                        </span>
                        {fam && (
                          <Crown className="w-3 h-3 text-champagne-500 flex-shrink-0" />
                        )}
                        {g.dietary && g.dietary !== '无' && (
                          <span className="text-[10px] text-rose-500">⚠{g.dietary}</span>
                        )}
                      </div>
                      <button
                        onClick={() => setMoveTarget({ mode: fam ? 'family' : 'guest', id: fam ? fam.id : g.id })}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-rose-50 rounded text-espresso/40 hover:text-rose-500"
                        title="换桌"
                      >
                        <MoveRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {unassignedGuests.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 border-2 border-amber-200 rounded-2xl p-5 shadow-soft">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-amber-800">
              未分桌来宾 ({unassignedGuests.length} 位)
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {unassignedGuests.map((g) => (
              <span
                key={g.id}
                className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full ${
                  g.signedIn
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-white text-espresso/60 border border-amber-200'
                }`}
              >
                {g.signedIn ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border-2 border-slate-300" />}
                {g.name}
                {g.signedIn && <span className="text-green-600">· {(g.arrivedCount ?? 1 + (g.plusOne || 0))}人</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {moveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-espresso/40 backdrop-blur-sm" onClick={() => setMoveTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-card w-full max-w-md p-6">
            <h3 className="font-serif text-lg font-semibold text-espresso mb-4">临时换桌</h3>
            <p className="text-sm text-espresso/70 mb-4">
              选择目标桌位，签到页和宾客名单的桌次会同步更新
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-72 overflow-y-auto">
              {sortedTables.map((t) => {
                const count = guests.filter(
                  (g) => g.tableId === t.id && g.status !== 'declined'
                ).length;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      if (moveTarget.mode === 'family') {
                        handleMoveFamily(moveTarget.id, t.id);
                      } else {
                        handleMoveGuest(moveTarget.id, t.id);
                      }
                    }}
                    className="p-3 text-left border border-rose-100 hover:border-rose-300 hover:bg-rose-50 rounded-xl transition-colors"
                  >
                    <p className="font-semibold text-espresso text-sm">
                      第{t.tableNumber}桌
                    </p>
                    <p className="text-xs text-espresso/50 mt-1">
                      {count}/{t.capacity} 人
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end pt-4">
              <Button variant="secondary" onClick={() => setMoveTarget(null)}>取消</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VenuePage;
