import { createHash } from 'node:crypto';

export function initialState(now) {
  return { version: 1, incident: null, heartbeatAt: now };
}

export function validateState(value) {
  if (value?.version !== 1 || !Number.isFinite(Date.parse(value.heartbeatAt))) {
    throw new Error('Invalid monitor state');
  }
  const incident = value.incident;
  if (incident !== null && (!incident || typeof incident.id !== 'string'
    || !Array.isArray(incident.issues) || !incident.issues.every(issue => typeof issue === 'string'))) {
    throw new Error('Invalid incident state');
  }
  return value;
}

export function transition(previous, issues, now) {
  validateState(previous);
  const failed = [...new Set(issues)].sort();
  if (failed.length && !previous.incident) {
    const id = createHash('sha256').update(previous.heartbeatAt + failed.join(',')).digest('hex').slice(0, 24);
    return { state: { ...previous, heartbeatAt: now, incident: { id, issues: failed } }, event: 'failure' };
  }
  if (!failed.length && previous.incident) {
    return { state: { ...previous, heartbeatAt: now, incident: null }, event: 'recovery' };
  }
  if (Date.parse(now) - Date.parse(previous.heartbeatAt) > 7 * 86400000) {
    return { state: { ...previous, heartbeatAt: now }, event: null };
  }
  return { state: previous, event: null };
}
