import { defineBackend } from "@aws-amplify/backend";
import { Names, Tags } from "aws-cdk-lib";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { StreamViewType } from "aws-cdk-lib/aws-dynamodb";
import { StartingPosition } from "aws-cdk-lib/aws-lambda";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { storage } from "./storage/resource";
import { alertFunction } from "./functions/alertFunction/resource";
import { memberInviteFunction } from "./functions/memberInviteFunction/resource";

const backend = defineBackend({
  auth,
  data,
  storage,
  alertFunction,
  memberInviteFunction,
});

const branchName = process.env.AWS_BRANCH?.trim();
const environmentName = branchName || "sandbox";
const deploymentType = branchName ? "branch" : "sandbox";

[
  ["Project", "EBMS"],
  ["Environment", environmentName],
  ["Branch", environmentName],
  ["DeploymentType", deploymentType],
].forEach(([key, value]) => {
  Tags.of(backend.stack).add(key, value);
});

const getModelTable = (modelName: string) => {
  const tableEntry = Object.entries(backend.data.resources.tables).find(([key]) =>
    key.includes(modelName),
  );

  if (!tableEntry) {
    throw new Error(`Unable to find data table for model ${modelName}`);
  }

  return tableEntry[1];
};

const getModelTableName = (modelName: string) => {
  return getModelTable(modelName).tableName;
};

backend.data.resources.cfnResources.amplifyDynamoDbTables.Expense.streamSpecification =
  {
    streamViewType: StreamViewType.NEW_IMAGE,
  };

const expenseTable = getModelTable("Expense");
const expenseTableRefreshResource =
  backend.data.resources.cfnResources.amplifyDynamoDbTables.Expense as {
    resource: {
      addPropertyOverride: (propertyPath: string, value: unknown) => void;
    };
  };
const legacyExpenseStreamMappingId = `DynamoDBEventSource:${Names.nodeUniqueId(
  expenseTable.node,
)}`;

// Force the custom table resource to refresh its outputs so the stream ARN
// stays in sync when an existing branch stack has a stale TableStreamArn.
expenseTableRefreshResource.resource.addPropertyOverride("tags", [
  {
    key: "stream-refresh-token",
    value: "expense-stream-v2",
  },
]);

const expenseStreamMapping =
  backend.alertFunction.resources.lambda.addEventSourceMapping(
    legacyExpenseStreamMappingId,
    {
      eventSourceArn: expenseTable.tableStreamArn,
      startingPosition: StartingPosition.LATEST,
      batchSize: 10,
      retryAttempts: 2,
    },
  );

expenseStreamMapping.node.addDependency(
  backend.data.resources.nestedStacks.Expense,
);

expenseTable.grantStreamRead(backend.alertFunction.resources.lambda);
getModelTable("Event").grantReadData(backend.alertFunction.resources.lambda);
getModelTable("Budget").grantReadData(backend.alertFunction.resources.lambda);
getModelTable("Expense").grantReadData(backend.alertFunction.resources.lambda);
getModelTable("Notification").grantWriteData(
  backend.alertFunction.resources.lambda,
);

backend.storage.resources.bucket.grantReadWrite(
  backend.alertFunction.resources.lambda,
);

backend.alertFunction.addEnvironment(
  "EVENT_TABLE_NAME",
  getModelTableName("Event"),
);
backend.alertFunction.addEnvironment(
  "BUDGET_TABLE_NAME",
  getModelTableName("Budget"),
);
backend.alertFunction.addEnvironment(
  "EXPENSE_TABLE_NAME",
  getModelTableName("Expense"),
);
backend.alertFunction.addEnvironment(
  "NOTIFICATION_TABLE_NAME",
  getModelTableName("Notification"),
);

backend.alertFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ["ses:SendEmail", "ses:SendRawEmail"],
    resources: ["*"],
  }),
);

getModelTable("Event").grantReadData(backend.memberInviteFunction.resources.lambda);

backend.memberInviteFunction.addEnvironment(
  "EVENT_TABLE_NAME",
  getModelTableName("Event"),
);

backend.memberInviteFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ["ses:SendEmail", "ses:SendRawEmail"],
    resources: ["*"],
  }),
);
