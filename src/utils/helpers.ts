import { Guest, Table, TimelineItem, BudgetItem, Payment, Family } from '@/types';

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

export const formatCurrency = (amount: number): string => {
  return `¥${amount.toLocaleString('zh-CN')}`;
};

export const getRelationLabel = (relation: string): string => {
  const labels: Record<string, string> = {
    groom: '男方亲友',
    bride: '女方亲友',
    colleague: '同事',
    friend: '朋友',
    other: '其他',
  };
  return labels[relation] || relation;
};

export const normalizeRelation = (relation: string): Guest['relation'] => {
  const map: Record<string, Guest['relation']> = {
    '男方亲友': 'groom',
    '男方': 'groom',
    '新郎': 'groom',
    '新郎家': 'groom',
    groom: 'groom',
    '女方亲友': 'bride',
    '女方': 'bride',
    '新娘': 'bride',
    '新娘家': 'bride',
    bride: 'bride',
    '同事': 'colleague',
    colleague: 'colleague',
    '朋友': 'friend',
    friend: 'friend',
    '其他': 'other',
    other: 'other',
  };
  return map[relation] || 'other';
};

export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: '待确认',
    confirmed: '确认出席',
    declined: '确认缺席',
  };
  return labels[status] || status;
};

export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    confirmed: 'bg-green-100 text-green-800',
    declined: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const getTimelineCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    prep: '准备',
    ceremony: '仪式',
    banquet: '宴席',
    toast: '敬酒',
    end: '结束',
  };
  return labels[category] || category;
};

export const getTimelineCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    prep: 'bg-champagne-200 text-champagne-800',
    ceremony: 'bg-rose-200 text-rose-800',
    banquet: 'bg-green-200 text-green-800',
    toast: 'bg-amber-200 text-amber-800',
    end: 'bg-gray-200 text-gray-800',
  };
  return colors[category] || 'bg-gray-200 text-gray-800';
};

export const getPaymentStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: '待付款',
    paid: '已付款',
  };
  return labels[status] || status;
};

export const getPaymentStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: 'bg-orange-100 text-orange-800',
    paid: 'bg-green-100 text-green-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const parseBulkImport = (text: string): Partial<Guest>[] => {
  const lines = text.trim().split('\n').filter(line => line.trim());
  return lines.map(line => {
    const parts = line.split(/[,，\t]+/).map(s => s.trim()).filter(Boolean);
    const name = parts[0] || '';
    const phone = parts[1] || '';
    const relation = normalizeRelation(parts[2] || 'other');
    const notes = parts[3] || '';
    return { 
      name, 
      phone, 
      relation, 
      notes,
      status: 'pending' as const,
      plusOne: 0,
    };
  }).filter(g => g.name);
};

export const generateSignInList = (
  guests: Guest[], 
  tables: Table[], 
  families: Family[]
): string => {
  const getFamily = (id: string | null) => families.find(f => f.id === id);
  
  let content = '婚礼签到名单\n';
  content += '='.repeat(60) + '\n\n';

  // ===== 家庭出席状态聚合 =====
  content += '【家庭出席状态汇总】\n';
  content += '-'.repeat(60) + '\n';
  const byStatus: Record<string, Family[]> = {
    all_confirmed: [],
    all_declined: [],
    mixed: [],
    all_pending: [],
  };
  families.forEach((f) => {
    const members = guests.filter((g) => g.familyId === f.id);
    const s = getFamilyAggregateStatus(members);
    byStatus[s].push(f);
  });
  const labelMap: Record<string, string> = {
    all_confirmed: '✓ 整户出席',
    all_declined: '✗ 整户缺席',
    mixed: '◐ 部分待定',
    all_pending: '○ 整户待确认',
  };
  (Object.keys(byStatus) as (keyof typeof byStatus)[]).forEach((k) => {
    const list = byStatus[k];
    const expected = list.reduce((sum, f) => {
      const ms = guests.filter((g) => g.familyId === f.id);
      return sum + ms.filter((m) => m.status !== 'declined').reduce((s, g) => s + 1 + (g.plusOne || 0), 0);
    }, 0);
    content += `  ${labelMap[k]}：${list.length} 户 · 预计 ${expected} 人\n`;
    if (list.length > 0 && k !== 'all_declined') {
      list.slice(0, 5).forEach((f) => {
        const ms = guests.filter((g) => g.familyId === f.id);
        const count = ms.filter((m) => m.status !== 'declined').reduce((s, g) => s + 1 + (g.plusOne || 0), 0);
        const names = ms.map((m) => m.name).join('、');
        content += `      · ${f.name}（${names}）${count}人\n`;
      });
      if (list.length > 5) content += `      · ...等共 ${list.length} 户\n`;
    }
    content += '\n';
  });
  content += '\n';
  
  const sortedTables = [...tables].sort((a, b) => a.tableNumber - b.tableNumber);
  let grandTotal = 0;
  
  sortedTables.forEach(table => {
    const tableGuests = guests.filter(g => g.tableId === table.id && g.status !== 'declined');
    if (tableGuests.length === 0) return;
    
    content += `【第${table.tableNumber}桌】${table.tableName}\n`;
    content += '-'.repeat(60) + '\n';
    
    const familyGroups = new Map<string, Guest[]>();
    tableGuests.forEach(g => {
      const key = g.familyId || '__ungrouped_' + g.id;
      if (!familyGroups.has(key)) familyGroups.set(key, []);
      familyGroups.get(key)!.push(g);
    });
    
    let idx = 1;
    familyGroups.forEach((familyMembers, key) => {
      if (key.startsWith('__ungrouped_')) {
        familyMembers.forEach(g => {
          const total = g.plusOne + 1;
          grandTotal += total;
          const dietary = g.dietary && g.dietary !== '无' ? `【${g.dietary}】` : '';
          content += `${String(idx).padStart(2, '0')}. ${g.name.padEnd(8, ' ')}  ${g.phone.padEnd(13, ' ')}  ${total}人  ${dietary}\n`;
          idx++;
        });
      } else {
        const family = getFamily(key);
        const total = familyMembers.reduce((s, g) => s + g.plusOne + 1, 0);
        grandTotal += total;
        const names = familyMembers.map(g => g.name).join('、');
        const phones = familyMembers.map(g => g.phone).filter(Boolean).join('/');
        const dietaries = familyMembers.map(g => g.dietary && g.dietary !== '无' ? g.dietary : '').filter(Boolean);
        const dietaryNote = dietaries.length > 0 ? `【${dietaries.join('、')}】` : '';
        content += `${String(idx).padStart(2, '0')}. 👨‍👩‍👧${family?.name || '家庭'}：${names}\n`;
        content += `     电话：${phones}\n`;
        content += `     共 ${total} 人 ${dietaryNote}\n`;
        idx++;
      }
    });
    
    const tableTotal = tableGuests.reduce((s, g) => s + g.plusOne + 1, 0);
    content += `\n                                     本桌合计：${tableGuests.length}位 共${tableTotal}人\n\n`;
  });
  
  const unassigned = guests.filter(g => !g.tableId && g.status !== 'declined');
  if (unassigned.length > 0) {
    content += '【未安排座位】\n';
    content += '-'.repeat(60) + '\n';
    unassigned.forEach((g, i) => {
      const total = g.plusOne + 1;
      content += `${String(i + 1).padStart(2, '0')}. ${g.name.padEnd(8, ' ')}  ${g.phone.padEnd(13, ' ')}  ${total}人\n`;
    });
  }
  
  content += '\n' + '='.repeat(60) + '\n';
  content += `总人数：${grandTotal} 人\n`;
  
  return content;
};

export interface ReconciliationTableRow {
  tableNumber: number;
  tableName: string;
  capacity: number;
  expectedGuests: number;
  expectedPeople: number;
  actualSignedGuests: number;
  actualArrivedPeople: number;
  diffPeople: number;
  families: { name: string; expected: number; actual: number; memberNames: string }[];
  dietaryNotes: string[];
  unassignedArrived: number;
}

export const generateReconciliation = (
  guests: Guest[],
  tables: Table[],
  families: Family[]
): { tables: ReconciliationTableRow[]; total: ReconciliationTableRow; text: string } => {
  const getFamily = (id: string | null) => families.find((f) => f.id === id);
  const sortedTables = [...tables].sort((a, b) => a.tableNumber - b.tableNumber);

  const rows: ReconciliationTableRow[] = [];
  let grandExpectedGuests = 0;
  let grandExpectedPeople = 0;
  let grandSignedGuests = 0;
  let grandArrivedPeople = 0;
  const grandDietary = new Set<string>();

  const unassignedArrived = guests
    .filter((g) => !g.tableId && g.status !== 'declined' && g.signedIn)
    .reduce(
      (s, g) => s + (g.arrivedCount ?? 1 + (g.plusOne || 0)),
      0
    );

  sortedTables.forEach((table) => {
    const tableGuests = guests.filter(
      (g) => g.tableId === table.id && g.status !== 'declined'
    );
    const expectedGuests = tableGuests.length;
    const expectedPeople = tableGuests.reduce(
      (s, g) => s + 1 + (g.plusOne || 0),
      0
    );
    const signedGuests = tableGuests.filter((g) => g.signedIn);
    const actualSignedGuests = signedGuests.length;
    const actualArrivedPeople = signedGuests.reduce(
      (s, g) => s + (g.arrivedCount ?? 1 + (g.plusOne || 0)),
      0
    );
    const diffPeople = actualArrivedPeople - expectedPeople;

    const familyGroups = new Map<string, Guest[]>();
    tableGuests.forEach((g) => {
      const key = g.familyId || `__single_${g.id}`;
      if (!familyGroups.has(key)) familyGroups.set(key, []);
      familyGroups.get(key)!.push(g);
    });

    const familiesArr: ReconciliationTableRow['families'] = [];
    const dietarySet = new Set<string>();

    familyGroups.forEach((members, key) => {
      const fam = key.startsWith('__single_')
        ? null
        : getFamily(key);
      const expected = members.reduce(
        (s, g) => s + 1 + (g.plusOne || 0),
        0
      );
      const actual = members
        .filter((g) => g.signedIn)
        .reduce(
          (s, g) => s + (g.arrivedCount ?? 1 + (g.plusOne || 0)),
          0
        );
      members.forEach((g) => {
        if (g.dietary && g.dietary !== '无') {
          dietarySet.add(g.dietary);
          grandDietary.add(g.dietary);
        }
      });
      familiesArr.push({
        name: fam ? fam.name : members[0].name,
        expected,
        actual,
        memberNames: members.map((g) => g.name).join('、'),
      });
    });

    rows.push({
      tableNumber: table.tableNumber,
      tableName: table.tableName || `第${table.tableNumber}桌`,
      capacity: table.capacity,
      expectedGuests,
      expectedPeople,
      actualSignedGuests,
      actualArrivedPeople,
      diffPeople,
      families: familiesArr,
      dietaryNotes: Array.from(dietarySet),
      unassignedArrived: 0,
    });

    grandExpectedGuests += expectedGuests;
    grandExpectedPeople += expectedPeople;
    grandSignedGuests += actualSignedGuests;
    grandArrivedPeople += actualArrivedPeople;
  });

  const unassignedSignedCount = guests.filter(
    (g) => !g.tableId && g.status !== 'declined' && g.signedIn
  ).length;

  const totalRow: ReconciliationTableRow = {
    tableNumber: 0,
    tableName: '合计',
    capacity: sortedTables.reduce((s, t) => s + t.capacity, 0),
    expectedGuests: grandExpectedGuests,
    expectedPeople: grandExpectedPeople,
    actualSignedGuests: grandSignedGuests + unassignedSignedCount,
    actualArrivedPeople: grandArrivedPeople + unassignedArrived,
    diffPeople: grandArrivedPeople + unassignedArrived - grandExpectedPeople,
    families: [],
    dietaryNotes: Array.from(grandDietary),
    unassignedArrived,
  };

  let text = '婚宴对账结算单\n';
  text += '='.repeat(70) + '\n';
  text += `导出时间: ${new Date().toLocaleString('zh-CN')}\n\n`;

  rows.forEach((r) => {
    const diffLabel =
      r.diffPeople > 0
        ? `多来 +${r.diffPeople}`
        : r.diffPeople < 0
          ? `少来 ${r.diffPeople}`
          : `持平 ±0`;
    const diffColor =
      r.diffPeople > 0 ? '▲' : r.diffPeople < 0 ? '▼' : '■';
    text += `【第${r.tableNumber}桌】${r.tableName}  (容量${r.capacity}人)\n`;
    text += '-'.repeat(70) + '\n';
    text += `  预计: ${r.expectedGuests}位宾客 共${r.expectedPeople}人\n`;
    text += `  实际: ${r.actualSignedGuests}位签到 共${r.actualArrivedPeople}人  ${diffColor} ${diffLabel}\n`;
    text += `  明细:\n`;
    r.families.forEach((f) => {
      const fd =
        f.actual > f.expected
          ? `+${f.actual - f.expected}`
          : f.actual < f.expected
            ? `${f.actual - f.expected}`
            : '±0';
      text += `    · ${f.name}（${f.memberNames}）: 预计${f.expected} / 实际${f.actual} (${fd})\n`;
    });
    if (r.dietaryNotes.length > 0) {
      text += `  忌口: ${r.dietaryNotes.join('、')}\n`;
    }
    text += '\n';
  });

  if (unassignedArrived > 0) {
    text += `【未分桌临时到场】: ${unassignedArrived} 人\n\n`;
  }

  text += '='.repeat(70) + '\n';
  text += `【总计】\n`;
  const tdiff =
    totalRow.diffPeople > 0
      ? `多来 +${totalRow.diffPeople}`
      : totalRow.diffPeople < 0
        ? `少来 ${totalRow.diffPeople}`
        : `持平 ±0`;
  text += `  桌数: ${sortedTables.length} 桌  (总容量 ${totalRow.capacity} 位)\n`;
  text += `  预计: ${totalRow.expectedGuests}位宾客 共${totalRow.expectedPeople}人\n`;
  text += `  实际: ${totalRow.actualSignedGuests}位签到 共${totalRow.actualArrivedPeople}人  ${totalRow.diffPeople > 0 ? '▲' : totalRow.diffPeople < 0 ? '▼' : '■'} ${tdiff}\n`;
  if (totalRow.dietaryNotes.length > 0) {
    text += `  全场忌口汇总: ${totalRow.dietaryNotes.join('、')}\n`;
  }
  text += '\n' + '='.repeat(70) + '\n';
  text += '本单据可直接用于与酒店结算桌数及确认备餐人数\n';

  return { tables: rows, total: totalRow, text };
};

export type FamilyAggregateStatus =
  | 'all_confirmed'
  | 'all_declined'
  | 'mixed'
  | 'all_pending';

export const getFamilyAggregateStatus = (
  members: Pick<Guest, 'status'>[]
): FamilyAggregateStatus => {
  if (members.length === 0) return 'all_pending';
  const confirmed = members.filter((m) => m.status === 'confirmed').length;
  const declined = members.filter((m) => m.status === 'declined').length;
  const pending = members.filter((m) => m.status === 'pending').length;
  if (confirmed === members.length) return 'all_confirmed';
  if (declined === members.length) return 'all_declined';
  if (pending === members.length) return 'all_pending';
  return 'mixed';
};

export const getFamilyStatusLabel = (s: FamilyAggregateStatus): string => {
  return {
    all_confirmed: '整户出席',
    all_declined: '整户缺席',
    mixed: '部分待定',
    all_pending: '待确认',
  }[s];
};

export const generateTimelineExport = (items: TimelineItem[]): string => {
  let content = '婚礼当天执行清单\n';
  content += '='.repeat(50) + '\n\n';
  
  const sorted = [...items].sort((a, b) => a.orderIndex - b.orderIndex);
  
  sorted.forEach((item, index) => {
    content += `${String(index + 1).padStart(2, '0')}. [${item.time}] ${item.title}\n`;
    content += `    地点：${item.location}\n`;
    content += `    负责人：${item.personInCharge}  ${item.phone}\n`;
    content += `    说明：${item.description}\n\n`;
  });
  
  return content;
};

export const exportToText = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const calculateBudgetStats = (items: BudgetItem[]) => {
  const totalBudgeted = items.reduce((sum, item) => sum + item.budgeted, 0);
  const totalActual = items.reduce((sum, item) => sum + item.actual, 0);
  const overBudget = totalActual > totalBudgeted;
  const diff = totalActual - totalBudgeted;
  
  const overBudgetItems = items.filter(item => item.actual > item.budgeted);
  
  return {
    totalBudgeted,
    totalActual,
    diff,
    overBudget,
    overBudgetItems,
    percentage: totalBudgeted > 0 ? Math.min((totalActual / totalBudgeted) * 100, 100) : 0,
  };
};

export const calculateGuestsStats = (guests: Guest[]) => {
  const total = guests.length;
  const confirmed = guests.filter(g => g.status === 'confirmed').length;
  const declined = guests.filter(g => g.status === 'declined').length;
  const pending = guests.filter(g => g.status === 'pending').length;
  const totalPeople = guests.reduce((sum, g) => sum + (g.status === 'confirmed' ? 1 + g.plusOne : 0), 0);
  
  return { total, confirmed, declined, pending, totalPeople };
};

export interface VendorSummary {
  vendor: string;
  items: { name: string; budgeted: number; actual: number; contractNo: string }[];
  totalBudgeted: number;
  totalActual: number;
  totalPaid: number;
  totalPending: number;
  payments: { name: string; amount: number; dueDate: string; status: string }[];
  nextPaymentDue: { name: string; amount: number; dueDate: string } | null;
}

export const summarizeByVendor = (
  items: BudgetItem[],
  payments: Payment[]
): VendorSummary[] => {
  const vendorMap = new Map<string, VendorSummary>();
  
  items.forEach(item => {
    const vendor = item.vendor?.trim() || '未指定供应商';
    if (!vendorMap.has(vendor)) {
      vendorMap.set(vendor, {
        vendor,
        items: [],
        totalBudgeted: 0,
        totalActual: 0,
        totalPaid: 0,
        totalPending: 0,
        payments: [],
        nextPaymentDue: null,
      });
    }
    
    const summary = vendorMap.get(vendor)!;
    summary.items.push({
      name: item.name,
      budgeted: item.budgeted,
      actual: item.actual,
      contractNo: item.contractNo,
    });
    summary.totalBudgeted += item.budgeted;
    summary.totalActual += item.actual;
    
    const itemPayments = payments.filter(p => p.budgetItemId === item.id);
    itemPayments.forEach(p => {
      summary.payments.push({
        name: p.name,
        amount: p.amount,
        dueDate: p.dueDate,
        status: p.status,
      });
      if (p.status === 'paid') {
        summary.totalPaid += p.amount;
      } else {
        summary.totalPending += p.amount;
      }
    });
  });
  
  vendorMap.forEach(summary => {
    const pending = summary.payments.filter(p => p.status === 'pending' && p.dueDate);
    if (pending.length > 0) {
      pending.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      const next = pending[0];
      summary.nextPaymentDue = {
        name: next.name,
        amount: next.amount,
        dueDate: next.dueDate,
      };
    }
  });
  
  return Array.from(vendorMap.values()).sort((a, b) => {
    const ad = a.nextPaymentDue?.dueDate || '9999-12-31';
    const bd = b.nextPaymentDue?.dueDate || '9999-12-31';
    return ad.localeCompare(bd);
  });
};

export interface UpcomingPayment {
  payment: Payment;
  vendor: string;
  itemName: string;
  daysUntilDue: number;
  overdue: boolean;
  dueLabel: string;
}

export const getUpcomingPayments = (
  items: BudgetItem[],
  payments: Payment[],
  daysAhead: number = 14,
  todayStr?: string
): UpcomingPayment[] => {
  const today = todayStr
    ? new Date(todayStr + 'T00:00:00')
    : new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + daysAhead);

  const result: UpcomingPayment[] = [];

  payments
    .filter((p) => p.status === 'pending' && p.dueDate)
    .forEach((p) => {
      const due = new Date(p.dueDate + 'T00:00:00');
      due.setHours(0, 0, 0, 0);
      const diffMs = due.getTime() - today.getTime();
      const daysUntilDue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (due <= endDate) {
        const item = items.find((i) => i.id === p.budgetItemId);
        const overdue = daysUntilDue < 0;
        let dueLabel = '';
        if (overdue) dueLabel = `已逾期 ${Math.abs(daysUntilDue)} 天`;
        else if (daysUntilDue === 0) dueLabel = '今天到期';
        else if (daysUntilDue <= 3) dueLabel = `${daysUntilDue} 天后（紧急）`;
        else if (daysUntilDue <= 7) dueLabel = `${daysUntilDue} 天后`;
        else dueLabel = `${daysUntilDue} 天后`;

        result.push({
          payment: p,
          vendor: item?.vendor?.trim() || '未指定供应商',
          itemName: item?.name || '',
          daysUntilDue,
          overdue,
          dueLabel,
        });
      }
    });

  return result.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
};
