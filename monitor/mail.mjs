export function configuration(env) {
  const recipients = JSON.parse(env.OPS_ALERT_RECIPIENTS ?? 'null');
  if (!Array.isArray(recipients) || !recipients.length || recipients.length > 5
    || !recipients.every(value => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) {
    throw new Error('Missing authorized operations recipients');
  }
  for (const key of ['CRON_SECRET', 'RESEND_API_KEY', 'GITHUB_TOKEN', 'EMAIL_FROM_NOREPLY']) {
    if (typeof env[key] !== 'string' || !env[key].trim()) throw new Error(`Missing ${key}`);
  }
  return { recipients, key: env.RESEND_API_KEY, from: env.EMAIL_FROM_NOREPLY };
}

export async function notify(config, event, incident, now, drill = false, request = fetch) {
  const label = drill ? '[TEST] ' : '';
  const title = `${label}NexAuto external monitoring: ${event === 'failure' ? 'incident' : 'recovered'}`;
  const text = [title, `UTC: ${now}`, `Checks: ${incident.issues.join(', ')}`,
    drill ? 'Commissioning exercise only. No production outage was created.'
      : 'Independent website and inventory health probe. Inspect the protected service logs.',
    'https://github.com/windalike5114/nexauto-uptime/actions'].join('\n');
  const response = await request('https://api.resend.com/emails', {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000),
    headers: { authorization: `Bearer ${config.key}`, 'content-type': 'application/json',
      'idempotency-key': `nexauto-external-${drill ? 'test-' : ''}${incident.id}-${event}` },
    body: JSON.stringify({ from: config.from, to: config.recipients, subject: title, text }),
  });
  if (!response.ok) throw new Error(`Independent notification failed (${response.status})`);
  const result = await response.json();
  if (typeof result.id !== 'string') throw new Error('Notification acceptance not confirmed');
  return { accepted: true };
}
