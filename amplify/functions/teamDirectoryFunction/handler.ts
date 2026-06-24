import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  type AttributeType,
} from "@aws-sdk/client-cognito-identity-provider";
import type { Schema } from "../../data/schema";

const getAttributeValue = (
  attributes: AttributeType[] | undefined,
  name: string,
) => attributes?.find((attribute) => attribute.Name === name)?.Value;

const getDisplayName = (
  attributes: AttributeType[] | undefined,
  fallbackEmail: string,
) =>
  getAttributeValue(attributes, "name") ??
  getAttributeValue(attributes, "custom:fullname") ??
  getAttributeValue(attributes, "preferred_username") ??
  fallbackEmail.split("@")[0];

const cognito = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

export const handler: Schema["listUserPoolUsers"]["functionHandler"] = async (
  event,
) => {
  const userPoolId = event.arguments.userPoolId;

  if (!userPoolId?.trim()) {
    throw new Error("Cognito user pool is not configured for team lookup.");
  }

  const users = new Map<
    string,
    {
      email: string;
      name: string;
      status: string;
      enabled: boolean;
    }
  >();
  let paginationToken: string | undefined;

  do {
    const response = await cognito.send(
      new ListUsersCommand({
        UserPoolId: userPoolId.trim(),
        Limit: 60,
        PaginationToken: paginationToken,
      }),
    );

    for (const user of response.Users ?? []) {
      const email = getAttributeValue(user.Attributes, "email")?.toLowerCase();

      if (!email) {
        continue;
      }

      users.set(email, {
        email,
        name: getDisplayName(user.Attributes, email),
        status: user.UserStatus ?? "UNKNOWN",
        enabled: user.Enabled ?? false,
      });
    }

    paginationToken = response.PaginationToken;
  } while (paginationToken);

  return Array.from(users.values()).sort(
    (first, second) =>
      first.name.localeCompare(second.name) ||
      first.email.localeCompare(second.email),
  );
};
