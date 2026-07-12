export type EventType =
  | "WEDDING"
  | "CORPORATE"
  | "BIRTHDAY"
  | "CONFERENCE"
  | "OTHER";

export type EventStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";

export type MemberRole = "ADMIN" | "EDITOR" | "VIEWER";

export type TaskStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED";

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

export type UserDirectoryProfile = {
  email: string;
  name: string;
  lastSeenAt?: string | null;
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

export type EventTaskView = {
  id: string;
  eventId: string;
  title: string;
  memo?: string | null;
  notes?: string | null;
  assigneeEmail?: string | null;
  status: TaskStatus;
  completedAt?: string | null;
  createdBy: string;
  completedBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type SplitwiseGroupRole = "ADMIN" | "MEMBER";

export type SplitwiseSplitType = "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES";

export type SplitwiseOperationResult = {
  success: boolean;
  code: string;
  message: string;
};

export type SplitwiseGroupListItem = {
  id: string;
  name: string;
  currency: CurrencyCode;
  createdBy: string;
  memberCount: number;
  createdAt?: string | null;
};

export type SplitwiseGroupPermissionSummary = {
  isMember: boolean;
  isAdmin: boolean;
  canManageMembers: boolean;
  canEditAnyExpense: boolean;
  canRecordExpenses: boolean;
  canRecordSettlements: boolean;
};

export type SplitwiseMemberInput = {
  name: string;
  email?: string | null;
};

export type SplitwiseMember = {
  email: string;
  name: string;
  isGuest: boolean;
  role: SplitwiseGroupRole;
};

export type SplitwiseExpenseSplit = {
  email: string;
  amountCents: number;
  percentageBasisPoints?: number | null;
  shares?: number | null;
};

export type SplitwiseExpenseInputSplit = {
  email: string;
  amountCents?: number | null;
  percentageBasisPoints?: number | null;
  shares?: number | null;
};

export type SplitwiseExpense = {
  id: string;
  description: string;
  totalAmount: number;
  paidBy: string;
  splitType: SplitwiseSplitType;
  splits: SplitwiseExpenseSplit[];
  participantEmails: string[];
  createdBy: string;
  updatedBy?: string | null;
  isDeleted: boolean;
  recordedAt: string;
  updatedAt?: string | null;
  deletedAt?: string | null;
};

export type SplitwiseSettlement = {
  id: string;
  fromEmail: string;
  toEmail: string;
  amount: number;
  note?: string | null;
  settledAt: string;
  createdBy: string;
};

export type SplitwiseBalance = {
  email: string;
  name: string;
  balance: number;
};

export type SplitwiseSimplifiedDebt = {
  fromEmail: string;
  toEmail: string;
  amount: number;
};

export type SplitwiseActivityItem = {
  id: string;
  actorEmail: string;
  actorName: string;
  actionType:
    | "GROUP_CREATED"
    | "MEMBER_ADDED"
    | "MEMBER_UPDATED"
    | "MEMBER_REMOVED"
    | "EXPENSE_ADDED"
    | "EXPENSE_EDITED"
    | "EXPENSE_DELETED"
    | "SETTLEMENT_RECORDED";
  entityType: "GROUP" | "MEMBER" | "EXPENSE" | "SETTLEMENT";
  entityId?: string | null;
  message: string;
  details?: unknown;
  beforeState?: unknown;
  afterState?: unknown;
  diff?: unknown;
  loggedAt: string;
};

export type SplitwiseGroupView = {
  group: SplitwiseGroupListItem;
  permissions: SplitwiseGroupPermissionSummary;
  members: SplitwiseMember[];
  expenses: SplitwiseExpense[];
  settlements: SplitwiseSettlement[];
  balances: SplitwiseBalance[];
  simplifiedDebts: SplitwiseSimplifiedDebt[];
};

export type SplitwiseGroupMutationResult = SplitwiseOperationResult & {
  groupId?: string | null;
};

export type SplitwiseExpenseMutationResult = SplitwiseOperationResult & {
  groupId?: string | null;
  expenseId?: string | null;
};

export type SplitwiseSettlementMutationResult = SplitwiseOperationResult & {
  groupId?: string | null;
  settlementId?: string | null;
};

export type SplitwiseActivityPage = SplitwiseOperationResult & {
  items: SplitwiseActivityItem[];
  nextToken?: string | null;
};
