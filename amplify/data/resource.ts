import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a
  .schema({
    Todo: a
      .model({
        content: a.string().required(),
        isDone: a.boolean().default(false),
      })
      .authorization((allow) => [allow.publicApiKey()]),
  })
  .authorization((allow) => [allow.publicApiKey()]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
