// Cloudflare Pages Worker (Advanced Mode)
// Injects shared HTML partials into every HTML page.
//
// Why this approach:
// - Nav/footer HTML is server-side (edge) rendered for best LCP/SEO
// - Pages stay clean: only placeholders exist in page HTML
//
// How it works:
// - Fetch the requested asset normally from Pages
// - If it's HTML, fetch components (nav/footer)
// - Replace placeholders:
//   <div data-partial="nav"></div>
//   <div data-partial="footer"></div>

const NAV_PARTIAL_PATH = '/components/nav.html';
const ADAM_NAV_PARTIAL_PATH = '/components/adam-nav.html';
const FOOTER_PARTIAL_PATH = '/components/footer.html';

let cachedNavHtml = null;
let cachedAdamNavHtml = null;
let cachedFooterHtml = null;

function fetchAsset(input, env) {
  // In Cloudflare Pages (Advanced Mode), static assets must be fetched via env.ASSETS.
  // Using global fetch(request) can recurse back into this Worker (especially in local dev).
  if (env && env.ASSETS && typeof env.ASSETS.fetch === 'function') {
    return env.ASSETS.fetch(input);
  }
  return fetch(input);
}

async function getNavHtml(request, env, disableCache) {
  if (!disableCache && cachedNavHtml !== null) {
    return cachedNavHtml;
  }

  const navUrl = new URL(NAV_PARTIAL_PATH, request.url);
  const res = await fetchAsset(new Request(navUrl.toString(), { method: 'GET' }), env);

  if (!res.ok) {
    cachedNavHtml = '';
    return cachedNavHtml;
  }

  const html = await res.text();
  if (!disableCache) {
    cachedNavHtml = html;
  }
  return html;
}

async function getAdamNavHtml(request, env, disableCache) {
  if (!disableCache && cachedAdamNavHtml !== null) {
    return cachedAdamNavHtml;
  }

  const adamNavUrl = new URL(ADAM_NAV_PARTIAL_PATH, request.url);
  const res = await fetchAsset(new Request(adamNavUrl.toString(), { method: 'GET' }), env);

  if (!res.ok) {
    cachedAdamNavHtml = '';
    return cachedAdamNavHtml;
  }

  const html = await res.text();
  if (!disableCache) {
    cachedAdamNavHtml = html;
  }
  return html;
}

async function getFooterHtml(request, env, disableCache) {
  if (!disableCache && cachedFooterHtml !== null) {
    return cachedFooterHtml;
  }

  const footerUrl = new URL(FOOTER_PARTIAL_PATH, request.url);
  const res = await fetchAsset(new Request(footerUrl.toString(), { method: 'GET' }), env);

  if (!res.ok) {
    cachedFooterHtml = '';
    return cachedFooterHtml;
  }

  const html = await res.text();
  if (!disableCache) {
    cachedFooterHtml = html;
  }
  return html;
}

export default {
  async fetch(request, env, ctx) {
    // Never rewrite the partial itself.
    const url = new URL(request.url);
    
    // Explicitly pass through live reload and other cdn-cgi requests
    if (url.pathname.startsWith('/cdn-cgi/')) {
      return env.ASSETS.fetch(request);
    }

    // Block WebSocket upgrade attempts for /ws paths to prevent crashes
    // These come from third-party libraries or browser extensions trying to 
    // establish connections that don't exist
    if (url.pathname.includes('/ws/') || url.pathname.includes('/ws')) {
      return new Response('Not Found', {
        status: 404,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }

    const isLocalDev = url.hostname === '127.0.0.1' || url.hostname === 'localhost';

    if (url.pathname.startsWith('/components/')) {
      const partialRes = await fetchAsset(request, env);

      if (!isLocalDev) {
        return partialRes;
      }

      // Prevent browser caching during local dev so edits show immediately.
      const headers = new Headers(partialRes.headers);
      headers.set('Cache-Control', 'no-store');
      headers.set('Pragma', 'no-cache');
      headers.set('Expires', '0');
      return new Response(partialRes.body, {
        status: partialRes.status,
        statusText: partialRes.statusText,
        headers
      });
    }

    // Only rewrite GET/HEAD.
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return fetchAsset(request, env);
    }

    // For HEAD, don't attempt to rewrite bodies.
    if (request.method === 'HEAD') {
      return fetchAsset(request, env);
    }

    const res = await fetchAsset(request, env);

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return res;
    }

    const isAdamPage = url.pathname.startsWith('/adam/');
    
    const [navHtml, adamNavHtml, footerHtml] = await Promise.all([
      getNavHtml(request, env, isLocalDev),
      getAdamNavHtml(request, env, isLocalDev),
      getFooterHtml(request, env, isLocalDev)
    ]);

    let rewritten = new HTMLRewriter()
      .on('[data-partial="nav"]', {
        element(el) {
          const navToUse = isAdamPage ? adamNavHtml : navHtml;
          if (navToUse) {
            el.replace(navToUse, { html: true });
          }
        }
      })
      .on('[data-partial="footer"]', {
        element(el) {
          if (footerHtml) {
            el.replace(footerHtml, { html: true });
          }
        }
      });

    // For Adam pages, inject nav into global-nav-container instead
    if (isAdamPage) {
      rewritten = rewritten.on('#global-nav-container', {
        element(el) {
          if (adamNavHtml) {
            el.replace(adamNavHtml, { html: true });
          }
        }
      });
    }

    rewritten = rewritten.transform(res);

    if (!isLocalDev) {
      return rewritten;
    }

    // Prevent browser caching during local dev so edits show immediately.
    const headers = new Headers(rewritten.headers);
    headers.set('Cache-Control', 'no-store');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');
    return new Response(rewritten.body, {
      status: rewritten.status,
      statusText: rewritten.statusText,
      headers
    });
  }
};
