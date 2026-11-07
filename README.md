# NexAuto external uptime

Independent, read-only probes of the public homepage, cart, checkout and protected inventory health endpoint. The runner and alert delivery do not connect to Supabase directly. There are no checkout creations, inventory writes, payment requests or customer records in this repository.

GitHub Actions runs the standard Ubuntu runner approximately every five minutes, with one retry per failed probe. Scheduling is best effort and can be delayed by GitHub. The existing Supabase minute jobs remain responsible for timely reservation expiry.

State contains only an incident identifier, failed check names and a heartbeat timestamp. Notifications go directly through Resend to the preconfigured operations recipients. The state changes only after the provider accepts the message; incident identifiers provide retry idempotency. Repeated failures are suppressed and recovery sends one notification. A weekly state heartbeat keeps this public repository active so GitHub does not disable its scheduled workflow after prolonged inactivity. Workflow failures also remain visible in Actions and the owner's GitHub notification settings.

Repository secrets: `CRON_SECRET`, `RESEND_API_KEY`, `OPS_ALERT_RECIPIENTS` (JSON email array), and `EMAIL_FROM_NOREPLY`. Keep these out of repository files and logs. Actions' built-in token can update only this repository; no personal access token is stored in Actions.

Dispatch `External uptime` with mode `drill` to run real health probes followed by clearly labelled synthetic incident, deduplication and recovery notifications. The drill does not change production availability or persistent incident state. Mode `check` performs only the normal probes. Neither mode changes payment or inventory data.

The standard public-repository Linux runner is free. This workflow uses no larger runners, caches or artifacts. [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions). [Scheduling limitations](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).
