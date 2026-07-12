import { a, defineData } from "@aws-amplify/backend";
import { memberInviteFunction } from "../functions/memberInviteFunction/resource";
import { splitwiseFunction } from "../functions/splitwiseFunction/resource";

export const schema = a
  .schema({
    EventType: a.enum([
      "WEDDING",
      "CORPORATE",
      "BIRTHDAY",
      "CONFERENCE",
      "OTHER",
    ]),
    EventStatus: a.enum(["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"]),
    MemberRole: a.enum(["ADMIN", "EDITOR", "VIEWER"]),
    GroupRole: a.enum(["ADMIN", "MEMBER"]),
    TaskStatus: a.enum(["OPEN", "IN_PROGRESS", "COMPLETED"]),
    PaymentMethod: a.enum(["CASH", "CARD", "TRANSFER", "CHECK", "OTHER"]),
    CurrencyCode: a.enum(["USD", "LKR"]),
    SplitType: a.enum(["EQUAL", "EXACT", "PERCENTAGE", "SHARES"]),
    NotificationType: a.enum([
      "BUDGET_WARNING",
      "OVER_BUDGET",
      "MEMBER_ADDED",
    ]),
    ActivityActionType: a.enum([
      "GROUP_CREATED",
      "MEMBER_ADDED",
      "MEMBER_UPDATED",
      "MEMBER_REMOVED",
      "EXPENSE_ADDED",
      "EXPENSE_EDITED",
      "EXPENSE_DELETED",
      "SETTLEMENT_RECORDED",
    ]),
    ActivityEntityType: a.enum([
      "GROUP",
      "MEMBER",
      "EXPENSE",
      "SETTLEMENT",
    ]),
    InviteMemberEmailResult: a.customType({
      delivered: a.boolean().required(),
      message: a.string().required(),
    }),
    ExpenseSplitInput: a.customType({
      email: a.email().required(),
      amountCents: a.integer(),
      percentageBasisPoints: a.integer(),
      shares: a.integer(),
    }),
    GroupMemberInput: a.customType({
      name: a.string().required(),
      email: a.email(),
    }),
    GroupPermissionSummary: a.customType({
      isMember: a.boolean().required(),
      isAdmin: a.boolean().required(),
      canManageMembers: a.boolean().required(),
      canEditAnyExpense: a.boolean().required(),
      canRecordExpenses: a.boolean().required(),
      canRecordSettlements: a.boolean().required(),
    }),
    GroupSummary: a.customType({
      id: a.id().required(),
      name: a.string().required(),
      currency: a.ref("CurrencyCode").required(),
      createdBy: a.email().required(),
      memberCount: a.integer().required(),
      createdAt: a.datetime(),
    }),
    GroupListResult: a.customType({
      success: a.boolean().required(),
      code: a.string().required(),
      message: a.string().required(),
      groups: a.ref("GroupSummary").array().required(),
    }),
    GroupMemberSummary: a.customType({
      email: a.email().required(),
      name: a.string().required(),
      isGuest: a.boolean().required(),
      role: a.ref("GroupRole").required(),
    }),
    ExpenseSplitSummary: a.customType({
      email: a.email().required(),
      amountCents: a.integer().required(),
      percentageBasisPoints: a.integer(),
      shares: a.integer(),
    }),
    GroupExpenseSummary: a.customType({
      id: a.id().required(),
      description: a.string().required(),
      totalAmount: a.integer().required(),
      paidBy: a.email().required(),
      splitType: a.ref("SplitType").required(),
      splits: a.ref("ExpenseSplitSummary").array().required(),
      participantEmails: a.email().array().required(),
      createdBy: a.email().required(),
      updatedBy: a.email(),
      isDeleted: a.boolean().required(),
      recordedAt: a.datetime().required(),
      updatedAt: a.datetime(),
      deletedAt: a.datetime(),
    }),
    SettlementSummary: a.customType({
      id: a.id().required(),
      fromEmail: a.email().required(),
      toEmail: a.email().required(),
      amount: a.integer().required(),
      note: a.string(),
      settledAt: a.datetime().required(),
      createdBy: a.email().required(),
    }),
    MemberBalanceSummary: a.customType({
      email: a.email().required(),
      name: a.string().required(),
      balance: a.integer().required(),
    }),
    SimplifiedDebtSummary: a.customType({
      fromEmail: a.email().required(),
      toEmail: a.email().required(),
      amount: a.integer().required(),
    }),
    ActivityFeedItem: a.customType({
      id: a.id().required(),
      actorEmail: a.email().required(),
      actorName: a.string().required(),
      actionType: a.ref("ActivityActionType").required(),
      entityType: a.ref("ActivityEntityType").required(),
      entityId: a.string(),
      message: a.string().required(),
      details: a.json(),
      beforeState: a.json(),
      afterState: a.json(),
      diff: a.json(),
      loggedAt: a.datetime().required(),
    }),
    GroupViewResult: a.customType({
      success: a.boolean().required(),
      code: a.string().required(),
      message: a.string().required(),
      group: a.ref("GroupSummary"),
      permissions: a.ref("GroupPermissionSummary"),
      members: a.ref("GroupMemberSummary").array().required(),
      expenses: a.ref("GroupExpenseSummary").array().required(),
      settlements: a.ref("SettlementSummary").array().required(),
      balances: a.ref("MemberBalanceSummary").array().required(),
      simplifiedDebts: a.ref("SimplifiedDebtSummary").array().required(),
    }),
    GroupActivityPage: a.customType({
      success: a.boolean().required(),
      code: a.string().required(),
      message: a.string().required(),
      items: a.ref("ActivityFeedItem").array().required(),
      nextToken: a.string(),
    }),
    GroupMutationResult: a.customType({
      success: a.boolean().required(),
      code: a.string().required(),
      message: a.string().required(),
      groupId: a.id(),
    }),
    ExpenseMutationResult: a.customType({
      success: a.boolean().required(),
      code: a.string().required(),
      message: a.string().required(),
      groupId: a.id(),
      expenseId: a.id(),
    }),
    SettlementMutationResult: a.customType({
      success: a.boolean().required(),
      code: a.string().required(),
      message: a.string().required(),
      groupId: a.id(),
      settlementId: a.id(),
    }),
    sendEventMemberInviteEmail: a
      .mutation()
      .arguments({
        eventId: a.id().required(),
        email: a.email().required(),
        role: a.ref("MemberRole").required(),
      })
      .returns(a.ref("InviteMemberEmailResult"))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(memberInviteFunction)),
    listSplitwiseGroups: a
      .query()
      .returns(a.ref("GroupListResult"))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(splitwiseFunction)),
    getSplitwiseGroup: a
      .query()
      .arguments({
        groupId: a.id().required(),
      })
      .returns(a.ref("GroupViewResult"))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(splitwiseFunction)),
    listSplitwiseGroupActivity: a
      .query()
      .arguments({
        groupId: a.id().required(),
        limit: a.integer(),
        nextToken: a.string(),
      })
      .returns(a.ref("GroupActivityPage"))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(splitwiseFunction)),
    createSplitwiseGroup: a
      .mutation()
      .arguments({
        name: a.string().required(),
        currency: a.ref("CurrencyCode").required(),
        members: a.ref("GroupMemberInput").array(),
      })
      .returns(a.ref("GroupMutationResult"))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(splitwiseFunction)),
    addSplitwiseGroupMember: a
      .mutation()
      .arguments({
        groupId: a.id().required(),
        name: a.string().required(),
        email: a.email(),
      })
      .returns(a.ref("GroupMutationResult"))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(splitwiseFunction)),
    updateSplitwiseGroupMember: a
      .mutation()
      .arguments({
        groupId: a.id().required(),
        email: a.email().required(),
        name: a.string().required(),
      })
      .returns(a.ref("GroupMutationResult"))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(splitwiseFunction)),
    removeSplitwiseGroupMember: a
      .mutation()
      .arguments({
        groupId: a.id().required(),
        email: a.email().required(),
      })
      .returns(a.ref("GroupMutationResult"))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(splitwiseFunction)),
    createSplitwiseExpense: a
      .mutation()
      .arguments({
        groupId: a.id().required(),
        description: a.string().required(),
        totalAmount: a.integer().required(),
        paidBy: a.email().required(),
        splitType: a.ref("SplitType").required(),
        splits: a.ref("ExpenseSplitInput").array().required(),
      })
      .returns(a.ref("ExpenseMutationResult"))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(splitwiseFunction)),
    updateSplitwiseExpense: a
      .mutation()
      .arguments({
        groupId: a.id().required(),
        expenseId: a.id().required(),
        description: a.string().required(),
        totalAmount: a.integer().required(),
        paidBy: a.email().required(),
        splitType: a.ref("SplitType").required(),
        splits: a.ref("ExpenseSplitInput").array().required(),
      })
      .returns(a.ref("ExpenseMutationResult"))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(splitwiseFunction)),
    deleteSplitwiseExpense: a
      .mutation()
      .arguments({
        groupId: a.id().required(),
        expenseId: a.id().required(),
      })
      .returns(a.ref("ExpenseMutationResult"))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(splitwiseFunction)),
    recordSplitwiseSettlement: a
      .mutation()
      .arguments({
        groupId: a.id().required(),
        fromEmail: a.email().required(),
        toEmail: a.email().required(),
        amount: a.integer().required(),
        note: a.string(),
      })
      .returns(a.ref("SettlementMutationResult"))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(splitwiseFunction)),
    UserDirectoryProfile: a
      .model({
        email: a.email().required(),
        name: a.string().required(),
        userId: a.string(),
        searchName: a.string(),
        lastSeenAt: a.string().required(),
      })
      .identifier(["email"])
      .authorization((allow) => [allow.authenticated().to(["create", "read", "update"])]),

    Event: a
      .model({
        name: a.string().required(),
        description: a.string(),
        date: a.date().required(),
        venue: a.string(),
        eventType: a.ref("EventType").required(),
        status: a.ref("EventStatus").required(),
        owner: a.email().required(),
        admins: a.email().array(),
        editors: a.email().array(),
        viewers: a.email().array(),
        members: a.hasMany("EventMember", "eventId"),
        budget: a.hasOne("Budget", "eventId"),
        expenses: a.hasMany("Expense", "eventId"),
        tasks: a.hasMany("EventTask", "eventId"),
        notifications: a.hasMany("Notification", "eventId"),
      })
      .secondaryIndexes((index) => [
        index("owner").sortKeys(["date"]),
        index("status").sortKeys(["date"]),
      ])
      .authorization((allow) => [
        allow.ownerDefinedIn("owner").identityClaim("email").to(["create", "read", "update", "delete"]),
        allow.ownersDefinedIn("admins").identityClaim("email").to(["read", "update", "delete"]),
        allow.ownersDefinedIn("editors").identityClaim("email").to(["read"]),
        allow.ownersDefinedIn("viewers").identityClaim("email").to(["read"]),
      ]),

    EventMember: a
      .model({
        eventId: a.id().required(),
        userId: a.string(),
        email: a.email().required(),
        role: a.ref("MemberRole").required(),
        owner: a.email().required(),
        admins: a.email().array(),
        editors: a.email().array(),
        viewers: a.email().array(),
        event: a.belongsTo("Event", "eventId"),
      })
      .identifier(["eventId", "email"])
      .secondaryIndexes((index) => [index("email")])
      .authorization((allow) => [
        allow.ownerDefinedIn("owner").identityClaim("email").to(["create", "read", "update", "delete"]),
        allow.ownersDefinedIn("admins").identityClaim("email").to(["create", "read", "update", "delete"]),
        allow.ownersDefinedIn("editors").identityClaim("email").to(["read"]),
        allow.ownersDefinedIn("viewers").identityClaim("email").to(["read"]),
      ]),

    Budget: a
      .model({
        eventId: a.id().required(),
        totalAmount: a.integer().required(),
        currency: a.string().required(),
        totalPlanned: a.integer().required(),
        totalActual: a.integer().required(),
        variance: a.integer().required(),
        owner: a.email().required(),
        admins: a.email().array(),
        editors: a.email().array(),
        viewers: a.email().array(),
        event: a.belongsTo("Event", "eventId"),
        categories: a.hasMany("BudgetCategory", "budgetId"),
      })
      .secondaryIndexes((index) => [index("eventId")])
      .authorization((allow) => [
        allow.ownerDefinedIn("owner").identityClaim("email").to(["create", "read", "update", "delete"]),
        allow.ownersDefinedIn("admins").identityClaim("email").to(["read", "update", "delete"]),
        allow.ownersDefinedIn("editors").identityClaim("email").to(["read"]),
        allow.ownersDefinedIn("viewers").identityClaim("email").to(["read"]),
      ]),

    BudgetCategory: a
      .model({
        budgetId: a.id().required(),
        name: a.string().required(),
        plannedAmount: a.integer().required(),
        actualAmount: a.integer().required(),
        order: a.integer().required(),
        color: a.string().required(),
        owner: a.email().required(),
        admins: a.email().array(),
        editors: a.email().array(),
        viewers: a.email().array(),
        budget: a.belongsTo("Budget", "budgetId"),
        lineItems: a.hasMany("LineItem", "categoryId"),
        expenses: a.hasMany("Expense", "categoryId"),
      })
      .secondaryIndexes((index) => [
        index("budgetId").sortKeys(["order"]),
        index("name"),
      ])
      .authorization((allow) => [
        allow.ownerDefinedIn("owner").identityClaim("email").to(["create", "read", "update", "delete"]),
        allow.ownersDefinedIn("admins").identityClaim("email").to(["create", "read", "update", "delete"]),
        allow.ownersDefinedIn("editors").identityClaim("email").to(["read"]),
        allow.ownersDefinedIn("viewers").identityClaim("email").to(["read"]),
      ]),

    LineItem: a
      .model({
        categoryId: a.id().required(),
        description: a.string().required(),
        plannedAmount: a.integer().required(),
        notes: a.string(),
        attachmentKey: a.string(),
        owner: a.email().required(),
        admins: a.email().array(),
        editors: a.email().array(),
        viewers: a.email().array(),
        category: a.belongsTo("BudgetCategory", "categoryId"),
        expenses: a.hasMany("Expense", "lineItemId"),
      })
      .secondaryIndexes((index) => [
        index("categoryId"),
        index("description"),
      ])
      .authorization((allow) => [
        allow.ownerDefinedIn("owner").identityClaim("email").to(["create", "read", "update", "delete"]),
        allow.ownersDefinedIn("admins").identityClaim("email").to(["create", "read", "update", "delete"]),
        allow.ownersDefinedIn("editors").identityClaim("email").to(["read"]),
        allow.ownersDefinedIn("viewers").identityClaim("email").to(["read"]),
      ]),

    Expense: a
      .model({
        lineItemId: a.id().required(),
        categoryId: a.id().required(),
        eventId: a.id().required(),
        amount: a.integer().required(),
        vendor: a.string().required(),
        expenseDate: a.date().required(),
        paymentMethod: a.ref("PaymentMethod").required(),
        receiptKey: a.string(),
        notes: a.string(),
        loggedBy: a.email().required(),
        owner: a.email().required(),
        admins: a.email().array(),
        editors: a.email().array(),
        viewers: a.email().array(),
        lineItem: a.belongsTo("LineItem", "lineItemId"),
        category: a.belongsTo("BudgetCategory", "categoryId"),
        event: a.belongsTo("Event", "eventId"),
      })
      .secondaryIndexes((index) => [
        index("eventId").sortKeys(["expenseDate"]),
        index("categoryId").sortKeys(["expenseDate"]),
        index("lineItemId").sortKeys(["expenseDate"]),
      ])
      .authorization((allow) => [
        allow.ownerDefinedIn("owner").identityClaim("email").to(["create", "read", "update", "delete"]),
        allow.ownersDefinedIn("admins").identityClaim("email").to(["create", "read", "update", "delete"]),
        allow.ownersDefinedIn("editors").identityClaim("email").to(["create", "read", "update", "delete"]),
        allow.ownersDefinedIn("viewers").identityClaim("email").to(["read"]),
      ]),

    EventTask: a
      .model({
        eventId: a.id().required(),
        title: a.string().required(),
        memo: a.string(),
        notes: a.string(),
        assigneeEmail: a.email(),
        status: a.ref("TaskStatus").required(),
        completedAt: a.string(),
        createdBy: a.email().required(),
        completedBy: a.email(),
        owner: a.email().required(),
        admins: a.email().array(),
        editors: a.email().array(),
        viewers: a.email().array(),
        event: a.belongsTo("Event", "eventId"),
      })
      .secondaryIndexes((index) => [index("eventId"), index("assigneeEmail")])
      .authorization((allow) => [
        allow.ownerDefinedIn("owner").identityClaim("email").to(["create", "read", "update", "delete"]),
        allow.ownersDefinedIn("admins").identityClaim("email").to(["create", "read", "update", "delete"]),
        allow.ownersDefinedIn("editors").identityClaim("email").to(["create", "read", "update", "delete"]),
        allow.ownersDefinedIn("viewers").identityClaim("email").to(["read"]),
      ]),

    Notification: a
      .model({
        userId: a.email().required(),
        eventId: a.id().required(),
        type: a.ref("NotificationType").required(),
        message: a.string().required(),
        isRead: a.boolean().required(),
        owner: a.email().required(),
        admins: a.email().array(),
        event: a.belongsTo("Event", "eventId"),
      })
      .secondaryIndexes((index) => [index("userId"), index("eventId")])
      .authorization((allow) => [
        allow.ownerDefinedIn("owner").identityClaim("email").to(["create", "read", "update", "delete"]),
        allow.ownersDefinedIn("admins").identityClaim("email").to(["create", "read", "update", "delete"]),
        allow.ownerDefinedIn("userId").identityClaim("email").to(["read", "update"]),
      ]),

    Group: a
      .model({
        name: a.string().required(),
        currency: a.ref("CurrencyCode").required(),
        createdBy: a.email().required(),
        owner: a.email().required(),
        admins: a.email().array(),
        memberEmails: a.email().array().required(),
        members: a.hasMany("GroupMember", "groupId"),
        expenses: a.hasMany("GroupExpense", "groupId"),
        settlements: a.hasMany("Settlement", "groupId"),
        activityLogs: a.hasMany("ActivityLog", "groupId"),
      })
      .secondaryIndexes((index) => [index("createdBy")])
      .authorization((allow) => [
        allow.ownerDefinedIn("owner").identityClaim("email").to(["create", "read", "update", "delete"]),
        allow.ownersDefinedIn("admins").identityClaim("email").to(["read", "update", "delete"]),
        allow.ownersDefinedIn("memberEmails").identityClaim("email").to(["read"]),
      ]),

    GroupMember: a
      .model({
        groupId: a.id().required(),
        email: a.email().required(),
        name: a.string(),
        isGuest: a.boolean(),
        role: a.ref("GroupRole").required(),
        joinedBy: a.email().required(),
        userId: a.string(),
        owner: a.email().required(),
        admins: a.email().array(),
        memberEmails: a.email().array().required(),
        group: a.belongsTo("Group", "groupId"),
      })
      .identifier(["groupId", "email"])
      .secondaryIndexes((index) => [index("email")])
      .authorization((allow) => [
        allow.ownerDefinedIn("owner").identityClaim("email").to(["create", "read", "update", "delete"]),
        allow.ownersDefinedIn("admins").identityClaim("email").to(["read", "update", "delete"]),
        allow.ownersDefinedIn("memberEmails").identityClaim("email").to(["read"]),
      ]),

    GroupExpense: a
      .model({
        groupId: a.id().required(),
        description: a.string().required(),
        totalAmount: a.integer().required(),
        paidBy: a.email().required(),
        splitType: a.ref("SplitType").required(),
        splits: a.json().required(),
        participantEmails: a.email().array().required(),
        createdBy: a.email().required(),
        updatedBy: a.email(),
        isDeleted: a.boolean().required(),
        recordedAt: a.datetime().required(),
        deletedAt: a.datetime(),
        deletedBy: a.email(),
        owner: a.email().required(),
        admins: a.email().array(),
        memberEmails: a.email().array().required(),
        group: a.belongsTo("Group", "groupId"),
      })
      .secondaryIndexes((index) => [
        index("groupId").sortKeys(["recordedAt"]),
        index("createdBy"),
      ])
      .authorization((allow) => [
        allow.ownerDefinedIn("owner").identityClaim("email").to(["create", "read", "update", "delete"]),
        allow.ownersDefinedIn("admins").identityClaim("email").to(["read", "update", "delete"]),
        allow.ownersDefinedIn("memberEmails").identityClaim("email").to(["read"]),
      ]),

    Settlement: a
      .model({
        groupId: a.id().required(),
        fromEmail: a.email().required(),
        toEmail: a.email().required(),
        amount: a.integer().required(),
        note: a.string(),
        settledAt: a.datetime().required(),
        createdBy: a.email().required(),
        owner: a.email().required(),
        admins: a.email().array(),
        memberEmails: a.email().array().required(),
        group: a.belongsTo("Group", "groupId"),
      })
      .secondaryIndexes((index) => [index("groupId").sortKeys(["settledAt"])])
      .authorization((allow) => [
        allow.ownerDefinedIn("owner").identityClaim("email").to(["create", "read", "update", "delete"]),
        allow.ownersDefinedIn("admins").identityClaim("email").to(["read", "update", "delete"]),
        allow.ownersDefinedIn("memberEmails").identityClaim("email").to(["read"]),
      ]),

    ActivityLog: a
      .model({
        groupId: a.id().required(),
        actorEmail: a.email().required(),
        actionType: a.ref("ActivityActionType").required(),
        entityType: a.ref("ActivityEntityType").required(),
        entityId: a.string(),
        message: a.string().required(),
        details: a.json(),
        beforeState: a.json(),
        afterState: a.json(),
        diff: a.json(),
        loggedAt: a.datetime().required(),
        owner: a.email().required(),
        admins: a.email().array(),
        memberEmails: a.email().array().required(),
        group: a.belongsTo("Group", "groupId"),
      })
      .secondaryIndexes((index) => [index("groupId").sortKeys(["loggedAt"])])
      .authorization((allow) => [
        allow.ownerDefinedIn("owner").identityClaim("email").to(["create", "read", "update", "delete"]),
        allow.ownersDefinedIn("admins").identityClaim("email").to(["read", "update", "delete"]),
        allow.ownersDefinedIn("memberEmails").identityClaim("email").to(["read"]),
      ]),
  })
  .authorization((allow) => [
    allow.resource(splitwiseFunction).to(["query", "mutate"]),
  ]);

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});
