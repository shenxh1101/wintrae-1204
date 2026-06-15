import { create } from 'zustand';
import { AppState, Guest, Table, SeatingRule, TimelineItem, BudgetItem, Payment, InspirationImage, Family, PaymentCategory, MilestoneStatus } from '@/types';
import { loadFromStorage, saveToStorage, resetToMockData, generateId } from '@/utils';

interface SeatingCheckResult {
  allowed: boolean;
  reason?: string;
}

interface AppStore extends AppState {
  // Families
  addFamily: (family: Omit<Family, 'id'>) => string;
  updateFamily: (id: string, family: Partial<Family>) => void;
  deleteFamily: (id: string) => void;
  
  // Guests
  addGuest: (guest: Omit<Guest, 'id'>) => void;
  updateGuest: (id: string, guest: Partial<Guest>) => void;
  deleteGuest: (id: string) => void;
  bulkAddGuests: (guests: Partial<Guest>[]) => void;
  signInGuest: (guestId: string, arrivedCount?: number) => void;
  signOutGuest: (guestId: string) => void;
  signInFamily: (familyId: string, arrivedCounts?: Record<string, number>) => void;
  signOutFamily: (familyId: string) => void;

  // Families batch
  updateFamilyRelation: (familyId: string, relation: Guest['relation']) => void;
  updateFamilyStatus: (familyId: string, status: Guest['status']) => void;
  
  // Tables
  addTable: (table: Omit<Table, 'id'>) => void;
  updateTable: (id: string, table: Partial<Table>) => void;
  deleteTable: (id: string) => void;
  assignGuestToTable: (guestId: string, tableId: string | null, seatNumber?: number | null, skipRules?: boolean) => SeatingCheckResult;
  
  // Seating Rules
  addSeatingRule: (rule: Omit<SeatingRule, 'id'>) => void;
  deleteSeatingRule: (id: string) => void;
  checkSeatingRules: (guestId: string, tableId: string) => SeatingCheckResult;
  
  // Timeline
  addTimelineItem: (item: Omit<TimelineItem, 'id'>) => void;
  updateTimelineItem: (id: string, item: Partial<TimelineItem>) => void;
  deleteTimelineItem: (id: string) => void;
  reorderTimeline: (items: TimelineItem[]) => void;
  
  // Budget
  addBudgetItem: (item: Omit<BudgetItem, 'id'>) => void;
  updateBudgetItem: (id: string, item: Partial<BudgetItem>) => void;
  deleteBudgetItem: (id: string) => void;
  
  // Payments
  addPayment: (payment: Omit<Payment, 'id'>) => void;
  updatePayment: (id: string, payment: Partial<Payment>) => void;
  deletePayment: (id: string) => void;
  togglePaymentStatus: (id: string) => void;
  
  // Inspiration
  addInspirationImage: (image: Omit<InspirationImage, 'id'>) => void;
  deleteInspirationImage: (id: string) => void;
  
  // Settings
  setWeddingDate: (date: string) => void;
  setCoupleNames: (names: string) => void;
  
  // Reset
  resetData: () => void;
}

const useAppStore = create<AppStore>((set, get) => {
  const initialState = loadFromStorage();
  
  const saveState = () => {
    const { guests, families, tables, seatingRules, timeline, budgetCategories, budgetItems, payments, inspirationImages, weddingDate, coupleNames } = get();
    saveToStorage({
      guests, families, tables, seatingRules, timeline, budgetCategories, budgetItems,
      payments, inspirationImages, weddingDate, coupleNames,
    });
  };

  return {
    ...initialState,

    // Families
    addFamily: (family) => {
      const id = generateId();
      const newFamily = { ...family, id };
      set((state) => ({ families: [...state.families, newFamily] }));
      saveState();
      return id;
    },
    updateFamily: (id, family) => {
      set((state) => ({
        families: state.families.map((f) => (f.id === id ? { ...f, ...family } : f)),
      }));
      saveState();
    },
    deleteFamily: (id) => {
      set((state) => {
        const updatedGuests = state.guests.map((g) =>
          g.familyId === id ? { ...g, familyId: null } : g
        );
        return {
          families: state.families.filter((f) => f.id !== id),
          guests: updatedGuests,
        };
      });
      saveState();
    },

    // Guests
    addGuest: (guest) => {
      const newGuest = {
        ...guest,
        id: generateId(),
        signedIn: guest.signedIn ?? false,
        signedInAt: guest.signedInAt ?? null,
        arrivedCount: guest.arrivedCount ?? null,
      };
      set((state) => ({ guests: [...state.guests, newGuest] }));
      saveState();
    },
    updateGuest: (id, guest) => {
      set((state) => ({
        guests: state.guests.map((g) => (g.id === id ? { ...g, ...guest } : g)),
      }));
      saveState();
    },
    deleteGuest: (id) => {
      set((state) => ({ guests: state.guests.filter((g) => g.id !== id) }));
      saveState();
    },
    bulkAddGuests: (guests) => {
      const newGuests = guests.map((g) => ({
        id: generateId(),
        name: g.name || '',
        relation: g.relation || 'other',
        phone: g.phone || '',
        email: g.email || '',
        status: g.status || 'pending',
        dietary: g.dietary || '',
        plusOne: g.plusOne || 0,
        familyId: g.familyId || null,
        tableId: null,
        seatNumber: null,
        notes: g.notes || '',
        signedIn: false,
        signedInAt: null,
        arrivedCount: null,
      }));
      set((state) => ({ guests: [...state.guests, ...newGuests] }));
      saveState();
    },
    signInGuest: (guestId, arrivedCount) => {
      const state = get();
      const guest = state.guests.find((g) => g.id === guestId);
      if (!guest) return;
      const defaultCount = 1 + (guest.plusOne || 0);
      set({
        guests: state.guests.map((g) =>
          g.id === guestId
            ? {
                ...g,
                signedIn: true,
                signedInAt: new Date().toISOString(),
                arrivedCount: arrivedCount ?? defaultCount,
              }
            : g
        ),
      });
      saveState();
    },
    signOutGuest: (guestId) => {
      set((state) => ({
        guests: state.guests.map((g) =>
          g.id === guestId
            ? { ...g, signedIn: false, signedInAt: null, arrivedCount: null }
            : g
        ),
      }));
      saveState();
    },
    signInFamily: (familyId, arrivedCounts) => {
      const state = get();
      const now = new Date().toISOString();
      set({
        guests: state.guests.map((g) => {
          if (g.familyId !== familyId) return g;
          const defaultCount = 1 + (g.plusOne || 0);
          return {
            ...g,
            signedIn: true,
            signedInAt: now,
            arrivedCount: arrivedCounts?.[g.id] ?? defaultCount,
          };
        }),
      });
      saveState();
    },
    signOutFamily: (familyId) => {
      set((state) => ({
        guests: state.guests.map((g) =>
          g.familyId === familyId
            ? { ...g, signedIn: false, signedInAt: null, arrivedCount: null }
            : g
        ),
      }));
      saveState();
    },

    // Tables
    addTable: (table) => {
      const newTable = { ...table, id: generateId() };
      set((state) => ({ tables: [...state.tables, newTable] }));
      saveState();
    },
    updateTable: (id, table) => {
      set((state) => ({
        tables: state.tables.map((t) => (t.id === id ? { ...t, ...table } : t)),
      }));
      saveState();
    },
    deleteTable: (id) => {
      set((state) => {
        const updatedGuests = state.guests.map((g) =>
          g.tableId === id ? { ...g, tableId: null, seatNumber: null } : g
        );
        return {
          tables: state.tables.filter((t) => t.id !== id),
          guests: updatedGuests,
        };
      });
      saveState();
    },
    assignGuestToTable: (guestId, tableId, seatNumber = null, skipRules = false) => {
      const state = get();
      
      if (tableId && !skipRules) {
        const check = state.checkSeatingRules(guestId, tableId);
        if (!check.allowed) {
          return check;
        }

        const table = state.tables.find((t) => t.id === tableId);
        if (table) {
          const currentGuests = state.guests.filter((g) => g.tableId === tableId);
          const currentCount = currentGuests.find((g) => g.id === guestId)
            ? currentGuests.length
            : currentGuests.length + 1;

          // 检查 together 组的总人数是否放得下（包括本组已在这桌 + 尚未入这桌的 + 当前入的）
          const togetherGroups = state.seatingRules.filter(
            (r) => r.type === 'together' && r.guestIds.includes(guestId)
          );
          for (const rule of togetherGroups) {
            const groupMembers = rule.guestIds
              .map((id) => state.guests.find((g) => g.id === id))
              .filter((g): g is Guest => !!g && g.status !== 'declined');
            const membersInOtherTables = groupMembers.filter(
              (g) => g.tableId && g.tableId !== tableId && g.id !== guestId
            );

            if (membersInOtherTables.length > 0) {
              const names = membersInOtherTables.map((g) => g.name).join('、');
              return {
                allowed: false,
                reason: `同桌规则冲突：${names} 已在其他桌，建议一起调整`,
              };
            }

            const groupTotal = groupMembers.length;
            if (groupTotal > table.capacity) {
              return {
                allowed: false,
                reason: `本组 ${groupTotal} 人超过该桌 ${table.capacity} 人容量，建议换大桌或拆分规则`,
              };
            }

            // 整组未来都会坐到这桌，提前检查容量
            const existingInThisTable = groupMembers.filter(
              (g) => g.tableId === tableId || g.id === guestId
            ).length;
            const comingLater = groupTotal - existingInThisTable;
            if (currentCount + comingLater > table.capacity) {
              const membersNotYet = groupMembers.filter(
                (g) => g.tableId !== tableId && g.id !== guestId
              );
              const names = membersNotYet.map((g) => g.name).join('、');
              return {
                allowed: false,
                reason: `放完整组还差 ${names} 共 ${comingLater} 人，超出该桌容量，建议换桌或一起调整`,
              };
            }
          }

          if (currentCount > table.capacity) {
            return { allowed: false, reason: `该桌已满（${table.capacity}人）` };
          }
        }
      }
      
      set((s) => ({
        guests: s.guests.map((g) =>
          g.id === guestId ? { ...g, tableId, seatNumber } : g
        ),
      }));
      saveState();
      return { allowed: true };
    },

    // Seating Rules
    addSeatingRule: (rule) => {
      const newRule = { ...rule, id: generateId() };
      set((state) => ({ seatingRules: [...state.seatingRules, newRule] }));
      saveState();
    },
    deleteSeatingRule: (id) => {
      set((state) => ({ seatingRules: state.seatingRules.filter((r) => r.id !== id) }));
      saveState();
    },
    checkSeatingRules: (guestId, tableId) => {
      const state = get();
      const guest = state.guests.find((g) => g.id === guestId);
      if (!guest) return { allowed: true };
      
      const tableGuests = state.guests.filter((g) => g.tableId === tableId && g.id !== guestId);
      const tableGuestIds = tableGuests.map((g) => g.id);
      
      for (const rule of state.seatingRules) {
        const hasGuest = rule.guestIds.includes(guestId);
        if (!hasGuest) continue;
        
        const otherInRule = rule.guestIds.filter((id) => id !== guestId);
        const othersInTable = otherInRule.filter((id) => tableGuestIds.includes(id));
        
        if (rule.type === 'avoid' && othersInTable.length > 0) {
          const names = othersInTable
            .map((id) => state.guests.find((g) => g.id === id)?.name)
            .filter(Boolean)
            .join('、');
          return {
            allowed: false,
            reason: `避桌规则：不能与 ${names} 同桌`,
          };
        }

        if (rule.type === 'together') {
          // 检查同组的人是否分散在别的桌上了（不允许跨桌）
          const membersInOtherTables = otherInRule
            .map((id) => state.guests.find((g) => g.id === id))
            .filter((g): g is Guest => {
              if (!g) return false;
              if (!g.tableId) return false;
              return g.tableId !== tableId;
            });

          if (membersInOtherTables.length > 0) {
            const names = membersInOtherTables.map((g) => g.name).join('、');
            return {
              allowed: false,
              reason: `同桌规则：${names} 已在其他桌，需要一起调整`,
            };
          }
        }
      }
      
      return { allowed: true };
    },

    // Family batch operations
    updateFamilyRelation: (familyId, relation) => {
      const state = get();
      set({
        guests: state.guests.map((g) =>
          g.familyId === familyId ? { ...g, relation } : g
        ),
        families: state.families.map((f) =>
          f.id === familyId ? { ...f, relation } : f
        ),
      });
      saveState();
    },
    updateFamilyStatus: (familyId, status) => {
      const state = get();
      set({
        guests: state.guests.map((g) =>
          g.familyId === familyId ? { ...g, status } : g
        ),
      });
      saveState();
    },

    // Timeline
    addTimelineItem: (item) => {
      const newItem = { ...item, id: generateId() };
      set((state) => ({ timeline: [...state.timeline, newItem] }));
      saveState();
    },
    updateTimelineItem: (id, item) => {
      set((state) => ({
        timeline: state.timeline.map((t) => (t.id === id ? { ...t, ...item } : t)),
      }));
      saveState();
    },
    deleteTimelineItem: (id) => {
      set((state) => ({ timeline: state.timeline.filter((t) => t.id !== id) }));
      saveState();
    },
    reorderTimeline: (items) => {
      const reordered = items.map((item, index) => ({ ...item, orderIndex: index }));
      set({ timeline: reordered });
      saveState();
    },

    // Budget
    addBudgetItem: (item) => {
      const newItem = { ...item, id: generateId() };
      set((state) => ({ budgetItems: [...state.budgetItems, newItem] }));
      saveState();
    },
    updateBudgetItem: (id, item) => {
      set((state) => ({
        budgetItems: state.budgetItems.map((b) => (b.id === id ? { ...b, ...item } : b)),
      }));
      saveState();
    },
    deleteBudgetItem: (id) => {
      set((state) => ({
        budgetItems: state.budgetItems.filter((b) => b.id !== id),
        payments: state.payments.filter((p) => p.budgetItemId !== id),
      }));
      saveState();
    },

    // Payments
    addPayment: (payment) => {
      const pc: PaymentCategory = 'payment';
      const ms: MilestoneStatus = payment.status === 'paid' ? 'done' : 'todo';
      const merged = Object.assign({}, { category: pc, milestoneStatus: ms }, payment);
      const newPayment: Payment = Object.assign({}, merged, { id: generateId() });
      set((state) => ({ payments: state.payments.concat([newPayment]) }));
      saveState();
    },
    updatePayment: (id, payment) => {
      set((state) => ({
        payments: state.payments.map((p) => (p.id === id ? { ...p, ...payment } : p)),
      }));
      saveState();
    },
    deletePayment: (id) => {
      set((state) => ({ payments: state.payments.filter((p) => p.id !== id) }));
      saveState();
    },
    togglePaymentStatus: (id) => {
      set((state) => ({
        payments: state.payments.map((p) =>
          p.id === id ? { ...p, status: p.status === 'paid' ? 'pending' : 'paid' } : p
        ),
      }));
      saveState();
    },

    // Inspiration
    addInspirationImage: (image) => {
      const newImage = { ...image, id: generateId() };
      set((state) => ({ inspirationImages: [...state.inspirationImages, newImage] }));
      saveState();
    },
    deleteInspirationImage: (id) => {
      set((state) => ({ inspirationImages: state.inspirationImages.filter((i) => i.id !== id) }));
      saveState();
    },

    // Settings
    setWeddingDate: (date) => {
      set({ weddingDate: date });
      saveState();
    },
    setCoupleNames: (names) => {
      set({ coupleNames: names });
      saveState();
    },

    // Reset
    resetData: () => {
      const data = resetToMockData();
      set(data);
    },
  };
});

export default useAppStore;
