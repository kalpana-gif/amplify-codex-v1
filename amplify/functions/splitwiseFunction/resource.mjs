import { defineFunction } from "@aws-amplify/backend";

export const splitwiseFunction = defineFunction({
  name: "ebms-splitwise-function",
  entry: "./handler.ts",
  resourceGroupName: "data",
  timeoutSeconds: 30,
  memoryMB: 1024,
  runtime: 20,
});
