// Cloudflare Pages Function to proxy /adam requests to adam Pages deployment
export async function onRequest(context) {
  const url = new URL(context.request.url);
  
  // Get the path after /adam
  const adamPath = context.params.path ? context.params.path.join('/') : '';
  
  // Build target URL
  const targetUrl = `https://adam-8lo.pages.dev/${adamPath}${url.search}`;
  
  // Fetch from adam deployment
  const response = await fetch(targetUrl, {
    method: context.request.method,
    headers: context.request.headers,
    body: context.request.body
  });
  
  // Return the response
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}
