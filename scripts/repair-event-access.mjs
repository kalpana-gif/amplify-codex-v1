import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

const rootDir = process.cwd();
const outputsPath = join(rootDir, "amplify_outputs.json");
const cdkOutDir = join(rootDir, ".amplify", "artifacts", "cdk.out");

const defaultRegion = (() => {
  const outputs = JSON.parse(readFileSync(outputsPath, "utf8"));
  return outputs.data?.aws_region ?? outputs.auth?.aws_region ?? "ap-southeast-2";
})();

const detectedStackName = (() => {
  const assetFile = readdirSync(cdkOutDir).find((fileName) =>
    /^amplify-.*-sandbox-.*\.assets\.json$/.test(fileName),
  );

  return assetFile?.replace(/\.assets\.json$/, "");
})();

const printHelp = () => {
  console.log(`Usage:
  npm run repair:event-access -- --event-id <event-id> [--event-id <event-id>] [--write]
  npm run repair:event-access -- --all-events [--write]

Options:
  --event-id <id>    Repair one specific event. Repeat to repair multiple events.
  --all-events       Repair every event in the current sandbox tables.
  --write            Apply changes. Without this flag the script only prints a dry run.
  --stack-name <id>  Override the detected CloudFormation stack name.
  --region <name>    Override the detected AWS region.
  --help             Show this help text.
`);
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const eventIds = [];
  let stackName = detectedStackName;
  let region = defaultRegion;
  let write = false;
  let repairAll = false;

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];

    if (!current) {
      continue;
    }

    if (current === "--help" || current === "-h") {
      printHelp();
      process.exit(0);
    }

    if (current === "--write") {
      write = true;
      continue;
    }

    if (current === "--all-events") {
      repairAll = true;
      continue;
    }

    if (current === "--event-id") {
      const value = args[index + 1];

      if (!value) {
        throw new Error("Missing value for --event-id.");
      }

      eventIds.push(value);
      index += 1;
      continue;
    }

    if (current === "--stack-name") {
      const value = args[index + 1];

      if (!value) {
        throw new Error("Missing value for --stack-name.");
      }

      stackName = value;
      index += 1;
      continue;
    }

    if (current === "--region") {
      const value = args[index + 1];

      if (!value) {
        throw new Error("Missing value for --region.");
      }

      region = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${current}`);
  }

  if (!stackName) {
    throw new Error(
      "Unable to detect the Amplify sandbox stack name. Pass --stack-name explicitly.",
    );
  }

  if (repairAll && eventIds.length > 0) {
    throw new Error("Use either --all-events or one or more --event-id values, not both.");
  }

  if (!repairAll && eventIds.length === 0) {
    throw new Error("Pass --event-id <id> or --all-events.");
  }

  return {
    eventIds,
    repairAll,
    region,
    stackName,
    write,
  };
};

const awsJson = (args) =>
  JSON.parse(
    execFileSync("aws", [...args, "--output", "json"], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  );

const describeStackResources = (stackName, region) => {
  const response = awsJson([
    "cloudformation",
    "describe-stack-resources",
    "--stack-name",
    stackName,
    "--region",
    region,
  ]);

  return response.StackResources ?? [];
};

const getDataStackResources = (rootResources, region) => {
  const dataStack = rootResources.find(
    (entry) =>
      entry.ResourceType === "AWS::CloudFormation::Stack" &&
      entry.LogicalResourceId.startsWith("data"),
  );

  if (!dataStack?.PhysicalResourceId) {
    return rootResources;
  }

  return describeStackResources(dataStack.PhysicalResourceId, region);
};

const getNestedStackId = (dataResources, modelName) => {
  const expectedPrefix = `amplifyData${modelName}NestedStack`;
  const resource = dataResources.find(
    (entry) =>
      entry.ResourceType === "AWS::CloudFormation::Stack" &&
      entry.LogicalResourceId.startsWith(expectedPrefix),
  );

  if (!resource?.PhysicalResourceId) {
    throw new Error(`Unable to find nested stack for ${modelName}.`);
  }

  return resource.PhysicalResourceId;
};

const getTableNameForModel = (modelName, dataResources, region) => {
  const nestedStackId = getNestedStackId(dataResources, modelName);
  const nestedResources = describeStackResources(nestedStackId, region);
  const tableResource = nestedResources.find(
    (entry) => entry.LogicalResourceId.startsWith(`${modelName}Table`),
  );

  if (!tableResource?.PhysicalResourceId) {
    throw new Error(`Unable to find table resource for ${modelName}.`);
  }

  return tableResource.PhysicalResourceId;
};

const resolveTableNames = (stackName, region) => {
  const rootResources = describeStackResources(stackName, region);
  const dataResources = getDataStackResources(rootResources, region);

  return {
    Event: getTableNameForModel("Event", dataResources, region),
    EventMember: getTableNameForModel("EventMember", dataResources, region),
    Budget: getTableNameForModel("Budget", dataResources, region),
    BudgetCategory: getTableNameForModel("BudgetCategory", dataResources, region),
    LineItem: getTableNameForModel("LineItem", dataResources, region),
    Expense: getTableNameForModel("Expense", dataResources, region),
    Notification: getTableNameForModel("Notification", dataResources, region),
  };
};

const normalizeEmails = (emails) =>
  Array.from(
    new Set(
      (emails ?? [])
        .filter((email) => Boolean(email))
        .map((email) => email.toLowerCase())
        .sort(),
    ),
  );

const sameEmails = (left, right) => {
  const normalizedLeft = normalizeEmails(left);
  const normalizedRight = normalizeEmails(right);

  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  return normalizedLeft.every((value, index) => value === normalizedRight[index]);
};

const buildAccessGroups = (owner, members) => {
  const ownerEmail = owner.toLowerCase();
  const admins = new Set();
  const editors = new Set();
  const viewers = new Set();

  for (const member of members) {
    const email = member.email.toLowerCase();

    if (email === ownerEmail) {
      continue;
    }

    if (member.role === "ADMIN") {
      admins.add(email);
      continue;
    }

    if (member.role === "EDITOR") {
      editors.add(email);
      continue;
    }

    viewers.add(email);
  }

  return {
    admins: Array.from(admins).sort(),
    editors: Array.from(editors).sort(),
    viewers: Array.from(viewers).sort(),
  };
};

const scanAll = async (dynamo, input) => {
  const items = [];
  let exclusiveStartKey;

  do {
    const response = await dynamo.send(
      new ScanCommand({
        ...input,
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    items.push(...(response.Items ?? []));
    exclusiveStartKey = response.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return items;
};

const updateAccessLists = async (dynamo, tableName, target, access, write) => {
  const needsUpdate =
    !sameEmails(target.currentAdmins, access.admins) ||
    !sameEmails(target.currentEditors, access.editors) ||
    !sameEmails(target.currentViewers, access.viewers);

  if (!needsUpdate) {
    return false;
  }

  if (!write) {
    return true;
  }

  await dynamo.send(
    new UpdateCommand({
      TableName: tableName,
      Key: target.key,
      UpdateExpression:
        "SET admins = :admins, editors = :editors, viewers = :viewers, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":admins": access.admins,
        ":editors": access.editors,
        ":viewers": access.viewers,
        ":updatedAt": new Date().toISOString(),
      },
    }),
  );

  return true;
};

const updateNotificationAdmins = async (
  dynamo,
  tableName,
  notification,
  access,
  write,
) => {
  const needsUpdate = !sameEmails(notification.admins, access.admins);

  if (!needsUpdate) {
    return false;
  }

  if (!write) {
    return true;
  }

  await dynamo.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { id: notification.id },
      UpdateExpression: "SET admins = :admins, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":admins": access.admins,
        ":updatedAt": new Date().toISOString(),
      },
    }),
  );

  return true;
};

const repairEvent = async (dynamo, tables, eventId, write) => {
  const eventResponse = await dynamo.send(
    new GetCommand({
      TableName: tables.Event,
      Key: { id: eventId },
    }),
  );

  const event = eventResponse.Item ?? null;

  if (!event) {
    throw new Error(`Event not found: ${eventId}`);
  }

  const membersResponse = await dynamo.send(
    new QueryCommand({
      TableName: tables.EventMember,
      KeyConditionExpression: "eventId = :eventId",
      ExpressionAttributeValues: {
        ":eventId": eventId,
      },
    }),
  );

  const members = membersResponse.Items ?? [];
  const access = buildAccessGroups(event.owner, members);

  const budgetRows = await scanAll(dynamo, {
    TableName: tables.Budget,
    FilterExpression: "eventId = :eventId",
    ExpressionAttributeValues: {
      ":eventId": eventId,
    },
  });

  const budgetIds = new Set(budgetRows.map((row) => row.id));
  const categoryRows = budgetIds.size
    ? (await scanAll(dynamo, {
        TableName: tables.BudgetCategory,
      })).filter((row) => budgetIds.has(row.budgetId))
    : [];

  const categoryIds = new Set(categoryRows.map((row) => row.id));
  const lineItemRows = categoryIds.size
    ? (await scanAll(dynamo, {
        TableName: tables.LineItem,
      })).filter((row) => categoryIds.has(row.categoryId))
    : [];

  const expenseRows = await scanAll(dynamo, {
    TableName: tables.Expense,
    FilterExpression: "eventId = :eventId",
    ExpressionAttributeValues: {
      ":eventId": eventId,
    },
  });

  const notificationRows = await scanAll(dynamo, {
    TableName: tables.Notification,
    FilterExpression: "eventId = :eventId",
    ExpressionAttributeValues: {
      ":eventId": eventId,
    },
  });

  const counts = {
    Event: 0,
    EventMember: 0,
    Budget: 0,
    BudgetCategory: 0,
    LineItem: 0,
    Expense: 0,
    Notification: 0,
  };

  if (
    await updateAccessLists(
      dynamo,
      tables.Event,
      {
        key: { id: event.id },
        currentAdmins: event.admins,
        currentEditors: event.editors,
        currentViewers: event.viewers,
      },
      access,
      write,
    )
  ) {
    counts.Event += 1;
  }

  for (const member of members) {
    if (
      await updateAccessLists(
        dynamo,
        tables.EventMember,
        {
          key: { eventId: member.eventId, email: member.email },
          currentAdmins: member.admins,
          currentEditors: member.editors,
          currentViewers: member.viewers,
        },
        access,
        write,
      )
    ) {
      counts.EventMember += 1;
    }
  }

  for (const budget of budgetRows) {
    if (
      await updateAccessLists(
        dynamo,
        tables.Budget,
        {
          key: { id: budget.id },
          currentAdmins: budget.admins,
          currentEditors: budget.editors,
          currentViewers: budget.viewers,
        },
        access,
        write,
      )
    ) {
      counts.Budget += 1;
    }
  }

  for (const category of categoryRows) {
    if (
      await updateAccessLists(
        dynamo,
        tables.BudgetCategory,
        {
          key: { id: category.id },
          currentAdmins: category.admins,
          currentEditors: category.editors,
          currentViewers: category.viewers,
        },
        access,
        write,
      )
    ) {
      counts.BudgetCategory += 1;
    }
  }

  for (const lineItem of lineItemRows) {
    if (
      await updateAccessLists(
        dynamo,
        tables.LineItem,
        {
          key: { id: lineItem.id },
          currentAdmins: lineItem.admins,
          currentEditors: lineItem.editors,
          currentViewers: lineItem.viewers,
        },
        access,
        write,
      )
    ) {
      counts.LineItem += 1;
    }
  }

  for (const expense of expenseRows) {
    if (
      await updateAccessLists(
        dynamo,
        tables.Expense,
        {
          key: { id: expense.id },
          currentAdmins: expense.admins,
          currentEditors: expense.editors,
          currentViewers: expense.viewers,
        },
        access,
        write,
      )
    ) {
      counts.Expense += 1;
    }
  }

  for (const notification of notificationRows) {
    if (
      await updateNotificationAdmins(
        dynamo,
        tables.Notification,
        notification,
        access,
        write,
      )
    ) {
      counts.Notification += 1;
    }
  }

  return {
    eventId,
    owner: event.owner,
    access,
    counts,
    write,
  };
};

const listAllEventIds = async (dynamo, tableName) => {
  const items = await scanAll(dynamo, {
    TableName: tableName,
    ProjectionExpression: "id",
  });

  return items.map((item) => item.id);
};

const main = async () => {
  const args = parseArgs();
  const tables = resolveTableNames(args.stackName, args.region);
  const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: args.region }));
  const eventIds = args.repairAll
    ? await listAllEventIds(dynamo, tables.Event)
    : args.eventIds;

  console.log(
    `${args.write ? "Applying" : "Dry run for"} ${eventIds.length} event(s) in ${args.stackName} (${args.region})`,
  );
  console.log("Resolved tables:", tables);

  for (const eventId of eventIds) {
    const result = await repairEvent(dynamo, tables, eventId, args.write);
    console.log(JSON.stringify(result, null, 2));
  }
};

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
