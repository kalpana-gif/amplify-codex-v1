import { Amplify } from "aws-amplify";
import { fetchAuthSession } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";
import type { ResourcesConfig } from "aws-amplify";
import outputs from "@/amplify_outputs.json";
import type { Schema } from "@/amplify/data/schema";

let isConfigured = false;

export const amplifyConfig = outputs as ResourcesConfig;

const getRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const rawOutputs = getRecord(outputs);
const rawAuth = getRecord(rawOutputs?.auth) ?? getRecord(rawOutputs?.Auth);
const rawOauth = getRecord(rawAuth?.oauth);
const nestedOauthProviders = isStringArray(rawOauth?.identity_providers)
  ? rawOauth.identity_providers
  : [];
const flatOauthProviders = isStringArray(rawOutputs?.aws_cognito_social_providers)
  ? rawOutputs.aws_cognito_social_providers
  : [];

export const isGoogleAuthConfigured =
  typeof rawOauth?.domain === "string" &&
  rawOauth.domain.length > 0 &&
  [...nestedOauthProviders, ...flatOauthProviders].some(
    (provider) => provider.toUpperCase() === "GOOGLE",
  );

export const configureAmplifyClient = () => {
  if (isConfigured) {
    return;
  }

  // This app uses Amplify from client components, so avoid cookie-based SSR auth
  // storage that can overflow localhost request headers during development.
  Amplify.configure(amplifyConfig);
  isConfigured = true;
};

configureAmplifyClient();

export const client = generateClient<Schema>();

export const getUserPoolAuthOptions = async <
  T extends Record<string, unknown> | undefined = undefined,
>(
  options?: T,
) => {
  const baseOptions = {
    ...(options ?? {}),
    authMode: "userPool" as const,
  };

  try {
    const session = await fetchAuthSession();
    const authToken = session.tokens?.idToken?.toString();

    if (!authToken) {
      return baseOptions;
    }

    return {
      ...baseOptions,
      authToken,
    };
  } catch {
    return baseOptions;
  }
};
