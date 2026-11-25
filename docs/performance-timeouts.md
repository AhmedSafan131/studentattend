# API timeout investigation and rollout

Deploy both backend and frontend changes together and run `php artisan migrate --force`
to add the hot read-path indexes. Build the frontend using the project's normal
pipeline and refresh Laravel's config cache (`php artisan config:cache`).
Reload PHP workers through the existing deployment process so OPcache uses the
new code. Do not increase worker counts or Axios timeouts to compensate for CPU saturation.

The patch removes attendance synchronization and session-merge locks from GET
requests. Scans, manual attendance and migration still persist attendance on
their write paths. Old inconsistent data is no longer repaired by opening a list.

Periodic roster refreshes run at 15 seconds, flexible session lists at 30 seconds,
and staff profile refreshes at 60 seconds. Socket roster bursts are coalesced with
a 3-second minimum gap; hidden tabs pause, and failed roster requests back off.
The dashboard requests session summaries and loads the selected session's roster
separately, instead of fetching up to 300 rosters on every navigation.

## Check the live bottleneck

During an incident, run these read-only commands on the Linux application host:

```sh
uptime
ps -eo pid,comm,%cpu,%mem --sort=-%cpu | head -20
free -m
```

The Laravel log now records `slow_api_request` for requests taking at least 2 seconds:

```sh
tail -n 300 storage/logs/laravel.log
```

For daily log channels, inspect the current dated log instead. Each event contains
the route template, HTTP method/status, application duration, default database
connection duration and peak PHP memory. It contains no request parameters or SQL
bindings. `SLOW_API_THRESHOLD_MS` changes the threshold;
`SLOW_API_LOG_ENABLED=false` disables it (refresh config cache afterwards).

High `database_ms` points to database work or lock waits. High application duration
with low `database_ms` points to PHP work or other I/O. Time spent waiting for a PHP
worker or reverse proxy is outside this measurement; compare the proxy access log
request/upstream time. If MySQL dominates CPU, inspect its process list and slow
query log using an authorized database account. Redact identifiers before sharing.

Verify login, a recorded scan, live roster updates, a hidden/visible tab transition,
report pagination and export after deployment. Measure CPU and request p95 under
the same traffic before and after. Local functional tests cannot guarantee that no
request will ever time out on an unmeasured live server.
