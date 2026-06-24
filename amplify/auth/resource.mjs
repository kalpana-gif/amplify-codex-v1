import { defineAuth } from "@aws-amplify/backend";
import {
  getVerificationEmailBody,
  getVerificationEmailSubject,
} from "../../config/branding.mjs";
import { teamDirectoryFunction } from "../functions/teamDirectoryFunction/resource.mjs";

export const auth = defineAuth({
  access: (allow) => [allow.resource(teamDirectoryFunction).to(["listUsers"])],
  loginWith: {
    email: {
      verificationEmailStyle: "CODE",
      verificationEmailSubject: getVerificationEmailSubject(),
      verificationEmailBody: (createCode) =>
        getVerificationEmailBody(createCode()),
    },
  },
  userAttributes: {
    email: {
      required: true,
      mutable: true,
    },
    fullname: {
      required: true,
      mutable: true,
    },
    preferredUsername: {
      required: false,
      mutable: true,
    },
  },
  multifactor: {
    mode: "OPTIONAL",
    totp: true,
  },
});
