import fs from 'node:fs';
import { checkSite, initialState, transition, validateState, configuration, notify,
  readState, saveState } from './index.mjs';

async function commission(config) {
  const now = new Date().toISOString();
  const first = transition(initialState(now), ['inventory'], now);
  await notify(config, first.event, first.state.incident, now, true);
  if (transition(first.state, ['inventory'], now).event !== null) throw new Error('Deduplication failed');
  const recovered = transition(first.state, [], now);
  await notify(config, recovered.event, first.state.incident, now, true);
  console.log(JSON.stringify({ commissioning: true, failureAccepted: true,
    duplicateSuppressed: true, recoveryAccepted: true, productionOutageCreated: false }));
}

async function main() {
  const env = process.env;
  const config = configuration(env);
  const previous = await readState(env.GITHUB_TOKEN);
  validateState(previous.state);
  const snapshot = await checkSite(env.CRON_SECRET);
  const now = new Date().toISOString();
  const next = transition(previous.state, snapshot.issues, now);
  if (next.event) {
    await notify(config, next.event, next.state.incident ?? previous.state.incident, now);
  }
  if (JSON.stringify(next.state) !== JSON.stringify(previous.state)) {
    await saveState(env.GITHUB_TOKEN, previous.sha, next.state);
  }
  const summary = { checkedAt: now, ...snapshot, event: next.event, healthy: !snapshot.issues.length };
  console.log(JSON.stringify(summary));
  if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY,
    `External health: ${summary.healthy ? 'healthy' : 'incident'} at ${now}\n`);
  if (env.MONITOR_MODE === 'drill') await commission(config);
  if (!summary.healthy) process.exitCode = 1;
}

main().catch(() => {
  console.error('External monitor failed. Check runner configuration or notification transport.');
  process.exitCode = 1;
});
