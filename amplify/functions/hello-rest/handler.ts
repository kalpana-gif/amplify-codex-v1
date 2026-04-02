export const handler = async () => {
  return {
    statusCode: 200,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,OPTIONS",
      "access-control-allow-headers": "content-type",
    },
    body: JSON.stringify({
      message: "Hello from Amplify REST!",
      timestamp: new Date().toISOString(),
    }),
  };
};
