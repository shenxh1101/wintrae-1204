export type GuestStatus = 'pending' | 'confirmed' | 'declined';

export type GuestRelation = 'groom' | 'bride' | 'colleague' | 'friend' | 'other';

export interface Family {
  id: string;
  name: string;
  relation: GuestRelation;
  notes: string;
}

export interface Guest {
  id: string;
  name: string;
  relation: GuestRelation;
  phone: string;
  email: string;
  status: GuestStatus;
  dietary: string;
  plusOne: number;
  familyId: string | null;
  tableId: string | null;
  seatNumber: number | null;
  notes: string;
  signedIn: boolean;
  signedInAt: string | null;
  arrivedCount: number | null;
}

export interface Table {
  id: string;
  tableNumber: number;
  tableName: string;
  capacity: number;
  notes: string;
}

export type SeatingRuleType = 'together' | 'avoid';

export interface SeatingRule {
  id: string;
  type: SeatingRuleType;
  guestIds: string[];
}

export type TimelineCategory = 'prep' | 'ceremony' | 'banquet' | 'toast' | 'end';

export interface TimelineItem {
  id: string;
  title: string;
  time: string;
  location: string;
  description: string;
  personInCharge: string;
  phone: string;
  orderIndex: number;
  category: TimelineCategory;
}

export interface BudgetCategory {
  id: string;
  name: string;
  icon: string;
}

export interface BudgetItem {
  id: string;
  categoryId: string;
  name: string;
  budgeted: number;
  actual: number;
  vendor: string;
  contractNo: string;
}

export type PaymentStatus = 'pending' | 'paid';

export type PaymentCategory = 'payment' | 'confirm' | 'check' | 'final';
export type MilestoneStatus = 'todo' | 'contacted' | 'followup' | 'done';

export interface Payment {
  id: string;
  budgetItemId: string;
  name: string;
  amount: number;
  dueDate: string;
  status: PaymentStatus;
  category?: PaymentCategory;
  milestoneStatus?: MilestoneStatus;
  notes?: string;
}

export interface InspirationImage {
  id: string;
  dataUrl: string;
  title: string;
  category: string;
}

export interface AppState {
  guests: Guest[];
  families: Family[];
  tables: Table[];
  seatingRules: SeatingRule[];
  timeline: TimelineItem[];
  budgetCategories: BudgetCategory[];
  budgetItems: BudgetItem[];
  payments: Payment[];
  inspirationImages: InspirationImage[];
  giftRecords: GiftRecord[];
  weddingDate: string;
  coupleNames: string;
}

export interface GiftRecord {
  id: string;
  familyId: string | null;
  guestId: string | null;
  amount: number;
  receivedBy: string;
  receivedAt: string;
  giftReturned: boolean;
  returnedAt: string | null;
  notes: string;
}
