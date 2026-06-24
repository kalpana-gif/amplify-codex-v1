import { a, defineData } from "@aws-amplify/backend";
import { teamDirectoryFunction } from "../functions/teamDirectoryFunction/resource.mjs";

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
    PaymentMethod: a.enum(["CASH", "CARD", "TRANSFER", "CHECK", "OTHER"]),
    NotificationType: a.enum([
      "BUDGET_WARNING",
      "OVER_BUDGET",
      "MEMBER_ADDED",
    ]),
    UserPoolUser: a.customType({
      email: a.email().required(),
      name: a.string().required(),
      status: a.string().required(),
      enabled: a.boolean().required(),
    }),
    listUserPoolUsers: a
      .query()
      .arguments({
        userPoolId: a.string().required(),
      })
      .returns(a.ref("UserPoolUser").array())
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(teamDirectoryFunction)),

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
        notifications: a.hasMany("Notification", "eventId"),
      })
      .secondaryIndexes((index) => [
        index("owner").sortKeys(["date"]),
        index("status").sortKeys(["date"]),
      ])
      .authorization((allow) => [allow.authenticated().to(["create", "read", "update", "delete"])]),

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
      .authorization((allow) => [allow.authenticated().to(["create", "read", "update", "delete"])]),

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
      .authorization((allow) => [allow.authenticated().to(["create", "read", "update", "delete"])]),

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
      .authorization((allow) => [allow.authenticated().to(["create", "read", "update", "delete"])]),

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
      .authorization((allow) => [allow.authenticated().to(["create", "read", "update", "delete"])]),

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
      .authorization((allow) => [allow.authenticated().to(["create", "read", "update", "delete"])]),

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
      .authorization((allow) => [allow.authenticated().to(["create", "read", "update", "delete"])]),
  });

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});
