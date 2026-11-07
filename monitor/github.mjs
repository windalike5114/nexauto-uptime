const repository = 'windalike5114/nexauto-uptime';

export async function github(path, token, method = 'GET', body) {
  const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, {
    method, redirect: 'error', signal: AbortSignal.timeout(20000),
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json',
      'content-type': 'application/json', 'user-agent': 'NexAuto-external-monitor',
      'X-GitHub-Api-Version': '2026-03-10' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error(`Monitor state service failed (${response.status})`);
  return response.json();
}

export async function readState(token) {
  const file = await github('contents/state.json', token);
  return { sha: file.sha, state: JSON.parse(Buffer.from(file.content, 'base64').toString('utf8')) };
}

export async function saveState(token, sha, state) {
  await github('contents/state.json', token, 'PUT', {
    message: 'Record monitor transition or weekly heartbeat', sha, branch: 'main',
    content: Buffer.from(JSON.stringify(state, null, 2) + '\n').toString('base64'),
  });
}
