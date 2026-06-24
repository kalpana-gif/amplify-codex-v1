import { defineFunction } from "@aws-amplify/backend";

export const teamDirectoryFunction = defineFunction({
  name: "embs-team-directory-function",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  memoryMB: 512,
  runtime: 20,
  resourceGroupName: "auth",
});
