import { Guest, Table, TimelineItem, BudgetItem, Payment } from '@/types';

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
    const parts = line.split(/[,，\t\s]+/);
    const name = parts[0] || '';
    const phone = parts[1] || '';
    const relation = parts[2] || 'other';
    return { name, phone, relation: relation as any };
  }).filter(g => g.name);
};

export const generateSignInList = (guests: Guest[], tables: Table[]): string => {
  let content = '婚礼签到名单\n';
  content += '=' .repeat(50) + '\n\n';
  
  const sortedTables = [...tables].sort((a, b) => a.tableNumber - b.tableNumber);
  
  sortedTables.forEach(table => {
    const tableGuests = guests.filter(g => g.tableId === table.id && g.status !== 'declined');
    if (tableGuests.length > 0) {
      content += `第${table.tableNumber}桌 - ${table.tableName}\n`;
      content += '-'.repeat(40) + '\n';
      tableGuests.forEach((g, i) => {
        const total = g.plusOne + 1;
        content += `${String(i + 1).padStart(2, '0')}. ${g.name}  ${g.phone || ''}  ${total}人\n`;
      });
      content += `\n本桌共 ${tableGuests.length + tableGuests.reduce((s, g) => s + g.plusOne, 0)} 人\n\n`;
    }
  });
  
  const unassigned = guests.filter(g => !g.tableId && g.status !== 'declined');
  if (unassigned.length > 0) {
    content += '未安排座位\n';
    content += '-'.repeat(40) + '\n';
    unassigned.forEach((g, i) => {
      const total = g.plusOne + 1;
      content += `${String(i + 1).padStart(2, '0')}. ${g.name}  ${g.phone || ''}  ${total}人\n`;
    });
  }
  
  return content;
};

export const generateTimelineExport = (items: TimelineItem[]): string => {
  let content = '婚礼当天执行清单\n';
  content += '=' .repeat(50) + '\n\n';
  
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
