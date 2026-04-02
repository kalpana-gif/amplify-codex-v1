/* eslint-disable @typescript-eslint/no-require-imports */
const { a, defineData } = require("@aws-amplify/backend");

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

const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});

exports.data = data;
