/* eslint-disable @typescript-eslint/no-require-imports */
const { defineFunction } = require("@aws-amplify/backend");

const helloRest = defineFunction({
  name: "hello-rest",
});

exports.helloRest = helloRest;
