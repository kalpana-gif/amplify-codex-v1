import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import type { Schema } from "../../data/schema";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ses = new SESv2Client({});

type EventRecord = {
  id: string;
  name: string;
  owner: string;
  admins?: string[] | null;
};

const getRequiredEnv = () => {
  const { EVENT_TABLE_NAME, SES_FROM_EMAIL } = process.env;

  if (!EVENT_TABLE_NAME) {
    throw new Error("Missing required environment variable: EVENT_TABLE_NAME");
  }

  if (!SES_FROM_EMAIL) {
    throw new Error("Missing required environment variable: SES_FROM_EMAIL");
  }

  return {
    EVENT_TABLE_NAME,
    SES_FROM_EMAIL,
  };
};

const normalizeEmailList = (emails?: (string | null)[] | null) =>
  (emails ?? [])
    .filter((email): email is string => Boolean(email))
    .map((email) => email.toLowerCase());

const getRequesterEmail = (identity: unknown) => {
  if (!identity || typeof identity !== "object") {
    return null;
  }

  const claims = "claims" in identity ? identity.claims : undefined;
  const email =
    claims && typeof claims === "object" && claims !== null && "email" in claims
      ? claims.email
      : undefined;

  return typeof email === "string" ? email.toLowerCase() : null;
};

const getEvent = async (eventId: string) => {
  const { EVENT_TABLE_NAME } = getRequiredEnv();
  const response = await dynamo.send(
    new GetCommand({
      TableName: EVENT_TABLE_NAME,
      Key: {
        id: eventId,
      },
    }),
  );

  return (response.Item as EventRecord | undefined) ?? null;
};

const getRoleLabel = (role: "ADMIN" | "EDITOR" | "VIEWER") => {
  if (role === "ADMIN") {
    return "Admin";
  }

  if (role === "EDITOR") {
    return "Editor";
  }

  return "Viewer";
};

const getRoleSummary = (role: "ADMIN" | "EDITOR" | "VIEWER") => {
  if (role === "ADMIN") {
    return "Full event management, budget control, and team access.";
  }

  if (role === "EDITOR") {
    return "Can work with expenses, but not manage budgets or access.";
  }

  return "Read-only access across the event.";
};

const getAppBaseUrl = (headers: Record<string, string | undefined>) => {
  const origin = headers.origin ?? headers.Origin;

  if (origin) {
    return origin;
  }

  const referer = headers.referer ?? headers.Referer;

  if (!referer) {
    return null;
  }

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
};

export const handler: Schema["sendEventMemberInviteEmail"]["functionHandler"] = async (
  event,
) => {
  const { eventId, email, role } = event.arguments;
  const normalizedInviteeEmail = email.toLowerCase();
  const requesterEmail = getRequesterEmail(event.identity);

  if (!requesterEmail) {
    throw new Error("You must be signed in to send invite emails.");
  }

  const eventRecord = await getEvent(eventId);

  if (!eventRecord) {
    throw new Error("Event not found.");
  }

  const normalizedOwnerEmail = eventRecord.owner.toLowerCase();
  const normalizedAdminEmails = normalizeEmailList(eventRecord.admins);
  const canManageEvent =
    requesterEmail === normalizedOwnerEmail ||
    normalizedAdminEmails.includes(requesterEmail);

  if (!canManageEvent) {
    throw new Error("You do not have permission to send invite emails for this event.");
  }

  const { SES_FROM_EMAIL } = getRequiredEnv();
  const appBaseUrl = getAppBaseUrl(event.request.headers);
  const roleLabel = getRoleLabel(role);
  const roleSummary = getRoleSummary(role);
  const subject = `You have been invited to ${eventRecord.name} on EBMS`;
  const signInMarkup = appBaseUrl
    ? `
      <p style="margin: 24px 0 0;">
        <a
          href="${appBaseUrl}"
          style="display: inline-block; border-radius: 999px; background: #1e3a5f; color: #ffffff; padding: 12px 18px; text-decoration: none; font-weight: 600;"
        >
          Open EBMS
        </a>
      </p>
    `
    : "";
  const signInText = appBaseUrl ? `Open EBMS: ${appBaseUrl}` : "Open EBMS and sign in with this email address.";

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
      <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: #64748b;">
        EBMS Team Invite
      </p>
      <h1 style="margin: 0 0 12px; font-size: 24px; line-height: 1.2;">
        You have been invited to <span style="color: #1e3a5f;">${eventRecord.name}</span>
      </h1>
      <p style="margin: 0 0 18px;">
        ${requesterEmail} added you to this event as <strong>${roleLabel}</strong>.
      </p>
      <div style="border: 1px solid #dbe3ef; border-radius: 18px; padding: 18px; max-width: 520px; background: #f8fafc;">
        <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: #64748b;">
          Access Level
        </p>
        <p style="margin: 0; font-size: 18px; font-weight: 700; color: #0f172a;">
          ${roleLabel}
        </p>
        <p style="margin: 10px 0 0; color: #475569;">
          ${roleSummary}
        </p>
      </div>
      <p style="margin: 20px 0 0;">
        Sign in with <strong>${normalizedInviteeEmail}</strong> to access the event.
      </p>
      ${signInMarkup}
    </div>
  `;

  await ses.send(
    new SendEmailCommand({
      FromEmailAddress: SES_FROM_EMAIL,
      Destination: {
        ToAddresses: [normalizedInviteeEmail],
      },
      Content: {
        Simple: {
          Subject: {
            Data: subject,
          },
          Body: {
            Html: {
              Data: html,
            },
            Text: {
              Data:
                `${subject}\n\n` +
                `${requesterEmail} added you to this event as ${roleLabel}.\n` +
                `Event: ${eventRecord.name}\n` +
                `Role: ${roleLabel}\n` +
                `${roleSummary}\n\n` +
                `Sign in with ${normalizedInviteeEmail} to access the event.\n` +
                `${signInText}`,
            },
          },
        },
      },
    }),
  );

  return {
    delivered: true,
    message: `Invite email sent to ${normalizedInviteeEmail}.`,
  };
};
