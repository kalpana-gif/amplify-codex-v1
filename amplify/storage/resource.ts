import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "embs-receipts",
  access: (allow) => ({
    "receipts/{entity_id}/*": [allow.entity("identity").to(["read", "write", "delete"])],
  }),
});
