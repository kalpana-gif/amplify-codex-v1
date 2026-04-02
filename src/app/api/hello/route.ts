import { readFile } from "node:fs/promises";
import path from "node:path";

type AmplifyOutputs = {
  custom?: {
    restApiEndpoint?: string;
  };
};

const loadRestEndpoint = async () => {
  const outputsPath = path.join(process.cwd(), "amplify_outputs.json");
  const raw = await readFile(outputsPath, "utf8");
  const outputs = JSON.parse(raw) as AmplifyOutputs;
  return outputs.custom?.restApiEndpoint ?? "";
};

export async function GET() {
  try {
    const endpoint = await loadRestEndpoint();
    if (!endpoint) {
      return Response.json(
        { message: "REST endpoint is missing in amplify_outputs.json" },
        { status: 500 },
      );
    }

    const response = await fetch(`${endpoint.replace(/\/$/, "")}/hello`);
    const data = (await response.json()) as unknown;

    return Response.json(data, { status: response.status });
  } catch (error) {
    return Response.json(
      {
        message: `REST proxy failed: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      },
      { status: 500 },
    );
  }
}
