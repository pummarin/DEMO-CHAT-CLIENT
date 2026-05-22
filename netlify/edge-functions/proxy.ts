export default async (request: Request) => {
  const url = new URL(request.url);
  
  // Extract path suffix
  // e.g. /api/softnix/chat-messages -> /chat-messages
  const pathSuffix = url.pathname.replace(/^\/api\/softnix/, "");
  
  const targetUrl = `https://genai.softnix.ai/external/api${pathSuffix}${url.search}`;
  
  // Clone request headers and set host to target
  const headers = new Headers(request.headers);
  headers.set("host", "genai.softnix.ai");
  
  const fetchOptions: RequestInit = {
    method: request.method,
    headers: headers,
  };
  
  if (request.method !== "GET" && request.method !== "HEAD") {
    fetchOptions.body = request.body;
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
