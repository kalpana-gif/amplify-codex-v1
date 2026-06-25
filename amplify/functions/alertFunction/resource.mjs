import { defineFunction, secret } from "@aws-amplify/backend";

export const alertFunction = defineFunction({
  name: "embs-alert-function",
  entry: "./handler.ts",
  resourceGroupName: "data",
  timeoutSeconds: 30,
  memoryMB: 512,
  runtime: 20,
  environment: {
    SES_FROM_EMAIL: secret("SES_FROM_EMAIL"),
  },
});
