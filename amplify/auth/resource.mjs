import { defineAuth } from "@aws-amplify/backend";

export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailStyle: "CODE",
      verificationEmailSubject: "Verify your EMBS account",
      verificationEmailBody: (createCode) =>
        `Use this verification code to finish creating your Event Management Budgeting System account: ${createCode()}`,
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
