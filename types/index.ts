export type EventType =
  | "WEDDING"
  | "CORPORATE"
  | "BIRTHDAY"
  | "CONFERENCE"
  | "OTHER";

export type EventStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";

export type MemberRole = "ADMIN" | "EDITOR" | "VIEWER";

export type PaymentMethod =
  | "CASH"
  | "CARD"
  | "TRANSFER"
  | "CHECK"
  | "OTHER";

export type NotificationType =
  | "BUDGET_WARNING"
  | "OVER_BUDGET"
  | "MEMBER_ADDED";

export type CurrencyCode = "USD" | "LKR";

export type LineItemInput = {
  description: string;
  plannedAmount: number;
  notes?: string;
};

export type TeamMemberInput = {
  email: string;
  role: MemberRole;
};

export type CategoryInput = {
  id: string;
  name: string;
  plannedAmount: number;
  color: string;
  lineItems?: LineItemInput[];
};

export type EventDetailsInput = {
  name: string;
  description: string;
  date: string;
  venue: string;
  eventType: EventType;
  status: EventStatus;
};

export type BudgetSetupInput = {
  totalAmount: number;
  currency: CurrencyCode;
  categories: CategoryInput[];
};

export type EventCreationInput = EventDetailsInput & {
  budget: BudgetSetupInput;
  members: TeamMemberInput[];
};

export type EventPermissions = {
  isOwner: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isViewer: boolean;
  canEditBudget: boolean;
  canEditExpenses: boolean;
  canManageRoles: boolean;
  canManageEventLifecycle: boolean;
  canDeleteEvent: boolean;
};

export type EventSummary = {
  id: string;
  name: string;
  description?: string | null;
  date: string;
  createdAt?: string | null;
  venue?: string | null;
  eventType: EventType;
  status: EventStatus;
  totalBudget: number;
  totalPlanned: number;
  totalActual: number;
  variance: number;
  utilizationPercentage: number;
  currency: CurrencyCode;
};

export type BudgetCategoryView = {
  id: string;
  budgetId: string;
  name: string;
  plannedAmount: number;
  actualAmount: number;
  variance: number;
  order: number;
  color: string;
  lineItems: LineItemView[];
};

export type LineItemView = {
  id: string;
  categoryId: string;
  description: string;
  plannedAmount: number;
  actualAmount: number;
  variance: number;
  notes?: string | null;
  attachmentKey?: string | null;
};

export type ExpenseView = {
  id: string;
  lineItemId: string;
  categoryId: string;
  eventId: string;
  amount: number;
  vendor: string;
  expenseDate: string;
  paymentMethod: PaymentMethod;
  receiptKey?: string | null;
  notes?: string | null;
  loggedBy: string;
  categoryName?: string;
  lineItemDescription?: string;
};

export type BudgetOverview = {
  id: string;
  eventId: string;
  totalAmount: number;
  totalPlanned: number;
  totalActual: number;
  variance: number;
  currency: CurrencyCode;
  categories: BudgetCategoryView[];
};

export type DashboardSummary = {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  usedPercentage: number;
  overThreshold: boolean;
};

export type ReportFilters = {
  eventId: string;
  startDate?: string;
  endDate?: string;
};

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
};

export type UserPoolUser = {
  email: string;
  name: string;
  status: string;
  enabled: boolean;
};

export type EventTeamMember = {
  email: string;
  role: MemberRole;
};

export type EventTeamSnapshot = {
  event: {
    id: string;
    name: string;
    owner: string;
    admins: string[];
    editors: string[];
    viewers: string[];
  };
  members: EventTeamMember[];
  currentUser: CurrentUser | null;
  permissions: EventPermissions;
};
