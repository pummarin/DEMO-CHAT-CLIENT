export default async (request: Request) => {
  const url = new URL(request.url);

  // Extract path suffix
  // e.g. /api/softnix/chat-messages -> /chat-messages
  const pathSuffix = url.pathname.replace(/^\/api\/softnix/, "");

  const targetUrl = `https://genai.softnix.ai/external/api${pathSuffix}${url.search}`;

  // Build clean headers to avoid forwarding browser/proxy specific headers
  const headers = new Headers();
  headers.set("host", "genai.softnix.ai");

  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    headers.set("authorization", authHeader);
  }

  const contentTypeHeader = request.headers.get("content-type");
  if (contentTypeHeader) {
    headers.set("content-type", contentTypeHeader);
  }

  const fetchOptions: RequestInit = {
    method: request.method,
    headers: headers,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    // Read body as text instead of passing the stream directly to avoid Deno stream-forwarding bugs
    fetchOptions.body = await request.text();
  }

  try {
    const response = await fetch(targetUrl, fetchOptions);
    return response;
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config = {
  path: "/api/softnix/*",
};
