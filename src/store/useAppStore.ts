import { create } from 'zustand';
import { AppState, Guest, Table, SeatingRule, TimelineItem, BudgetItem, Payment, InspirationImage, Family } from '@/types';
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
      const newGuest = { ...guest, id: generateId() };
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
      }));
      set((state) => ({ guests: [...state.guests, ...newGuests] }));
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
          if (currentGuests.length >= table.capacity && !currentGuests.find((g) => g.id === guestId)) {
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
        
        if (rule.type === 'together' && otherInRule.length > 0 && othersInTable.length !== otherInRule.length) {
          const missing = otherInRule
            .filter((id) => !tableGuestIds.includes(id))
            .map((id) => state.guests.find((g) => g.id === id)?.name)
            .filter(Boolean)
            .join('、');
          return {
            allowed: false,
            reason: `同桌规则：必须与 ${missing} 在同一桌`,
          };
        }
      }
      
      return { allowed: true };
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
      const newPayment = { ...payment, id: generateId() };
      set((state) => ({ payments: [...state.payments, newPayment] }));
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
