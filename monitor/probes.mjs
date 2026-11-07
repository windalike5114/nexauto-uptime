const origin = 'https://www.nexautoparts.co.nz';
const routes = [
  ['home', '/', false], ['cart', '/cart', false], ['checkout', '/checkout', false],
  ['inventory', '/api/internal/inventory/health', true],
];

export async function probe(name, path, authenticated, secret, request = fetch) {
  try {
    const response = await request(origin + path, {
      redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000),
      headers: authenticated ? { authorization: `Bearer ${secret}` } : {},
    });
    if (response.status !== 200) {
      await response.body?.cancel();
      return { name, healthy: false, status: response.status };
    }
    if (!authenticated) {
      const html = await response.text();
      return { name, healthy: /text\/html/i.test(response.headers.get('content-type') ?? '')
        && /NexAuto/i.test(html), status: 200 };
    }
    const health = await response.json();
    return { name, healthy: health.healthy === true && health.overdueHolds === 0
      && health.unresolvedReviews === 0 && Array.isArray(health.issues) && health.issues.length === 0,
    status: 200 };
  } catch {
    return { name, healthy: false, status: 0 };
  }
}

export async function checkSite(secret, request = fetch, delay = milliseconds =>
  new Promise(resolve => setTimeout(resolve, milliseconds))) {
  const results = await Promise.all(routes.map(async ([name, path, authenticated]) => {
    const first = await probe(name, path, authenticated, secret, request);
    if (first.healthy) return first;
    await delay(3000);
    return probe(name, path, authenticated, secret, request);
  }));
  return { results, issues: results.filter(row => !row.healthy).map(row => row.name) };
}
