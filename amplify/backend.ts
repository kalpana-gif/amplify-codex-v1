import { defineBackend } from "@aws-amplify/backend";
import { Stack } from "aws-cdk-lib";
import {
  CorsHttpMethod,
  HttpApi,
  HttpMethod,
} from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { data } from "./data/resource.js";
import { helloRest } from "./functions/hello-rest/resource.js";

const backend = defineBackend({
  data,
  helloRest,
});

const apiStack = backend.createStack("hello-rest-api");

const httpApi = new HttpApi(apiStack, "HelloRestApi", {
  apiName: "hello-rest-api",
  corsPreflight: {
    allowOrigins: ["*"],
    allowMethods: [CorsHttpMethod.GET, CorsHttpMethod.OPTIONS],
    allowHeaders: ["content-type"],
  },
});

const helloIntegration = new HttpLambdaIntegration(
  "HelloRestIntegration",
  backend.helloRest.resources.lambda,
);

httpApi.addRoutes({
  path: "/hello",
  methods: [HttpMethod.GET],
  integration: helloIntegration,
});

backend.addOutput({
  custom: {
    restApiEndpoint: httpApi.url,
    restApiId: httpApi.httpApiId,
    restApiRegion: Stack.of(httpApi).region,
  },
});
