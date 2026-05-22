import type { ClientSchema } from "@aws-amplify/backend";
import { schema } from "./resource";

export type Schema = ClientSchema<typeof schema>;
