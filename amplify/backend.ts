import { defineBackend } from "@aws-amplify/backend";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { StreamViewType } from "aws-cdk-lib/aws-dynamodb";
import { StartingPosition } from "aws-cdk-lib/aws-lambda";
import { DynamoEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { storage } from "./storage/resource";
import { alertFunction } from "./functions/alertFunction/resource";

const backend = defineBackend({
  auth,
  data,
  storage,
  alertFunction,
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

backend.alertFunction.resources.lambda.addEventSource(
  new DynamoEventSource(expenseTable, {
    startingPosition: StartingPosition.LATEST,
    batchSize: 10,
    retryAttempts: 2,
  }),
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
