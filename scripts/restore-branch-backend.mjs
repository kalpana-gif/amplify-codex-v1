import {
  BatchWriteItemCommand,
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  ResourceNotFoundException,
  ScanCommand,
  waitUntilTableExists,
} from "@aws-sdk/client-dynamodb";

const tableBases = [
  "Event",
  "EventMember",
  "Budget",
  "BudgetCategory",
  "LineItem",
  "Expense",
  "Notification",
  "UserDirectoryProfile",
];

const parseArgs = (argv) => {
  const options = {
    region: "ap-southeast-2",
    sourceSuffix: null,
    targetSuffix: null,
    write: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--region") {
      options.region = argv[index + 1] ?? options.region;
      index += 1;
      continue;
    }

    if (arg === "--source-suffix") {
      options.sourceSuffix = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg === "--target-suffix") {
      options.targetSuffix = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg === "--write") {
      options.write = true;
    }
  }

  if (!options.sourceSuffix || !options.targetSuffix) {
    throw new Error(
      "Usage: node scripts/restore-branch-backend.mjs --source-suffix <suffix> --target-suffix <suffix> [--region <region>] [--write]",
    );
  }

  return options;
};

const chunk = (items, size) => {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

const buildTableName = (base, suffix) => `${base}-${suffix}-NONE`;

const describeTable = async (client, tableName) => {
  try {
    const result = await client.send(
      new DescribeTableCommand({ TableName: tableName }),
    );

    return result.Table ?? null;
  } catch (error) {
    if (error instanceof ResourceNotFoundException) {
      return null;
    }

    throw error;
  }
};

const getCreateTableInput = (sourceTable, targetName) => ({
  TableName: targetName,
  AttributeDefinitions: sourceTable.AttributeDefinitions,
  KeySchema: sourceTable.KeySchema,
  BillingMode: sourceTable.BillingModeSummary?.BillingMode ?? "PAY_PER_REQUEST",
  GlobalSecondaryIndexes: sourceTable.GlobalSecondaryIndexes?.map((index) => ({
    IndexName: index.IndexName,
    KeySchema: index.KeySchema,
    Projection: index.Projection,
  })),
  StreamSpecification: sourceTable.StreamSpecification?.StreamEnabled
    ? {
        StreamEnabled: true,
        StreamViewType: sourceTable.StreamSpecification.StreamViewType,
      }
    : undefined,
});

const ensureTable = async (client, sourceTable, targetName, write) => {
  const existing = await describeTable(client, targetName);

  if (existing) {
    return { created: false, table: existing };
  }

  if (!write) {
    return { created: false, table: null };
  }

  await client.send(
    new CreateTableCommand(getCreateTableInput(sourceTable, targetName)),
  );

  await waitUntilTableExists(
    { client, maxWaitTime: 300 },
    { TableName: targetName },
  );

  const createdTable = await describeTable(client, targetName);
  return { created: true, table: createdTable };
};

const scanAllItems = async (client, tableName) => {
  const items = [];
  let exclusiveStartKey;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    items.push(...(result.Items ?? []));
    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return items;
};

const batchWriteAll = async (client, tableName, items) => {
  for (const batch of chunk(items, 25)) {
    let unprocessed = batch.map((item) => ({
      PutRequest: { Item: item },
    }));

    while (unprocessed.length > 0) {
      const result = await client.send(
        new BatchWriteItemCommand({
          RequestItems: {
            [tableName]: unprocessed,
          },
        }),
      );

      unprocessed = result.UnprocessedItems?.[tableName] ?? [];
    }
  }
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const client = new DynamoDBClient({ region: options.region });
  const summaries = [];

  for (const base of tableBases) {
    const sourceName = buildTableName(base, options.sourceSuffix);
    const targetName = buildTableName(base, options.targetSuffix);
    const sourceTable = await describeTable(client, sourceName);

    if (!sourceTable) {
      summaries.push({
        base,
        sourceName,
        targetName,
        status: "missing-source",
      });
      continue;
    }

    const { created, table: targetTable } = await ensureTable(
      client,
      sourceTable,
      targetName,
      options.write,
    );

    const sourceItems = await scanAllItems(client, sourceName);

    if (options.write && sourceItems.length > 0) {
      await batchWriteAll(client, targetName, sourceItems);
    }

    summaries.push({
      base,
      sourceName,
      targetName,
      created,
      copied: sourceItems.length,
      targetExists: Boolean(targetTable) || created,
      status: options.write ? "synced" : "dry-run",
    });
  }

  console.log(JSON.stringify({ options, summaries }, null, 2));
};

await main();
