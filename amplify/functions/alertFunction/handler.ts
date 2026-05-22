import {
  type AttributeValue,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import {
  SESv2Client,
  SendEmailCommand,
} from "@aws-sdk/client-sesv2";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ses = new SESv2Client({});

type EventRecord = {
  id: string;
  name: string;
  owner: string;
  admins?: string[] | null;
};

type BudgetRecord = {
  id: string;
  eventId: string;
  totalAmount: number;
  totalActual: number;
  variance: number;
  currency: string;
};

type ExpenseRecord = {
  id: string;
  eventId: string;
  categoryId: string;
  amount: number;
};

type DynamoDBStreamRecord = {
  eventName?: string;
  dynamodb?: {
    NewImage?: Record<string, AttributeValue>;
  };
};

type DynamoDBStreamEvent = {
  Records: DynamoDBStreamRecord[];
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const getRequiredEnv = () => {
  const {
    EVENT_TABLE_NAME,
    BUDGET_TABLE_NAME,
    EXPENSE_TABLE_NAME,
    NOTIFICATION_TABLE_NAME,
    SES_FROM_EMAIL,
  } = process.env;

  const requiredEnv = {
    EVENT_TABLE_NAME,
    BUDGET_TABLE_NAME,
    EXPENSE_TABLE_NAME,
    NOTIFICATION_TABLE_NAME,
    SES_FROM_EMAIL,
  };

  for (const [key, value] of Object.entries(requiredEnv)) {
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return requiredEnv as {
    EVENT_TABLE_NAME: string;
    BUDGET_TABLE_NAME: string;
    EXPENSE_TABLE_NAME: string;
    NOTIFICATION_TABLE_NAME: string;
    SES_FROM_EMAIL: string;
  };
};

const formatCurrency = (amountInCents: number, currency: string) => {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  });

  return formatter.format(amountInCents / 100);
};

const calculateSpendForEvent = async (eventId: string) => {
  const { EXPENSE_TABLE_NAME } = getRequiredEnv();
  const response = await dynamo.send(
    new ScanCommand({
      TableName: EXPENSE_TABLE_NAME,
      FilterExpression: "eventId = :eventId",
      ExpressionAttributeValues: {
        ":eventId": eventId,
      },
    }),
  );

  const items = (response.Items ?? []) as ExpenseRecord[];

  return items.reduce((sum, expense) => sum + expense.amount, 0);
};

const getEvent = async (eventId: string) => {
  const { EVENT_TABLE_NAME } = getRequiredEnv();
  const response = await dynamo.send(
    new GetCommand({
      TableName: EVENT_TABLE_NAME,
      Key: {
        id: eventId,
      },
    }),
  );

  return (response.Item as EventRecord | undefined) ?? null;
};

const getBudget = async (eventId: string) => {
  const { BUDGET_TABLE_NAME } = getRequiredEnv();
  const response = await dynamo.send(
    new ScanCommand({
      TableName: BUDGET_TABLE_NAME,
      FilterExpression: "eventId = :eventId",
      ExpressionAttributeValues: {
        ":eventId": eventId,
      },
      Limit: 1,
    }),
  );

  const item = response.Items?.[0];
  return (item as BudgetRecord | undefined) ?? null;
};

const createNotification = async (
  event: EventRecord,
  type: "BUDGET_WARNING" | "OVER_BUDGET",
  percentageUsed: number,
) => {
  const { NOTIFICATION_TABLE_NAME } = getRequiredEnv();
  const timestamp = new Date().toISOString();

  await dynamo.send(
    new PutCommand({
      TableName: NOTIFICATION_TABLE_NAME,
      Item: {
        id: crypto.randomUUID(),
        userId: event.owner,
        owner: event.owner,
        admins: event.admins ?? [],
        eventId: event.id,
        type,
        message:
          type === "OVER_BUDGET"
            ? `${event.name} has exceeded its budget.`
            : `${event.name} has used ${Math.round(percentageUsed)}% of its budget.`,
        isRead: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    }),
  );
};

const sendBudgetEmail = async (
  event: EventRecord,
  budget: BudgetRecord,
  actualSpend: number,
  type: "BUDGET_WARNING" | "OVER_BUDGET",
) => {
  const { SES_FROM_EMAIL } = getRequiredEnv();
  const recipients = Array.from(
    new Set([event.owner, ...(event.admins ?? [])].filter(Boolean)),
  );

  if (!recipients.length) {
    return;
  }

  const percentageUsed =
    budget.totalAmount > 0 ? (actualSpend / budget.totalAmount) * 100 : 0;
  const title =
    type === "OVER_BUDGET"
      ? `Over budget alert: ${event.name}`
      : `Budget warning: ${event.name}`;

  const actual = formatCurrency(actualSpend, budget.currency);
  const total = formatCurrency(budget.totalAmount, budget.currency);
  const percentage = `${percentageUsed.toFixed(1)}%`;

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
      <h1 style="font-size: 22px; margin-bottom: 8px;">${title}</h1>
      <p style="margin: 0 0 16px;">Event: <strong>${event.name}</strong></p>
      <table style="border-collapse: collapse; width: 100%; max-width: 420px;">
        <tr>
          <td style="padding: 8px 0;">Budget</td>
          <td style="padding: 8px 0; text-align: right;"><strong>${total}</strong></td>
        </tr>
        <tr>
          <td style="padding: 8px 0;">Actual Spend</td>
          <td style="padding: 8px 0; text-align: right;"><strong>${actual}</strong></td>
        </tr>
        <tr>
          <td style="padding: 8px 0;">Budget Used</td>
          <td style="padding: 8px 0; text-align: right;"><strong>${percentage}</strong></td>
        </tr>
      </table>
      <p style="margin-top: 20px;">
        ${
          type === "OVER_BUDGET"
            ? "This event is over budget and needs immediate attention."
            : "This event has crossed the 80% budget threshold."
        }
      </p>
    </div>
  `;

  await ses.send(
    new SendEmailCommand({
      FromEmailAddress: SES_FROM_EMAIL,
      Destination: {
        ToAddresses: recipients,
      },
      Content: {
        Simple: {
          Subject: {
            Data: title,
          },
          Body: {
            Html: {
              Data: html,
            },
            Text: {
              Data: `${title}\nBudget: ${total}\nActual Spend: ${actual}\nBudget Used: ${percentage}`,
            },
          },
        },
      },
    }),
  );
};

export const handler = async (event: DynamoDBStreamEvent) => {
  for (const record of event.Records) {
    if (record.eventName !== "INSERT" || !record.dynamodb?.NewImage) {
      continue;
    }

    const insertedExpense = unmarshall(record.dynamodb.NewImage) as ExpenseRecord;
    const [eventRecord, budgetRecord] = await Promise.all([
      getEvent(insertedExpense.eventId),
      getBudget(insertedExpense.eventId),
    ]);

    if (!eventRecord || !budgetRecord) {
      continue;
    }

    const actualSpend = await calculateSpendForEvent(insertedExpense.eventId);
    const percentageUsed =
      budgetRecord.totalAmount > 0
        ? (actualSpend / budgetRecord.totalAmount) * 100
        : 0;

    if (percentageUsed >= 80 && percentageUsed <= 100) {
      await Promise.all([
        sendBudgetEmail(
          eventRecord,
          budgetRecord,
          actualSpend,
          "BUDGET_WARNING",
        ),
        createNotification(
          eventRecord,
          "BUDGET_WARNING",
          percentageUsed,
        ),
      ]);
    }

    if (actualSpend > budgetRecord.totalAmount) {
      await Promise.all([
        sendBudgetEmail(
          eventRecord,
          budgetRecord,
          actualSpend,
          "OVER_BUDGET",
        ),
        createNotification(
          eventRecord,
          "OVER_BUDGET",
          percentageUsed,
        ),
      ]);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Alert stream processed.",
      time: currencyFormatter.format(0),
    }),
  };
};
