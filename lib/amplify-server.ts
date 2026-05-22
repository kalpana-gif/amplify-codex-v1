import { createServerRunner } from "@aws-amplify/adapter-nextjs";
import { generateServerClientUsingCookies } from "@aws-amplify/adapter-nextjs/data";
import { cookies } from "next/headers";
import outputs from "@/amplify_outputs.json";
import type { Schema } from "@/amplify/data/schema";

export const { runWithAmplifyServerContext } = createServerRunner({
  config: outputs,
});

export const getAmplifyServerClient = () =>
  generateServerClientUsingCookies<Schema>({
    config: outputs,
    cookies,
  });
