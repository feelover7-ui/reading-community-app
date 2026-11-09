import { pathToFileURL } from 'node:url'

// Daily estimates only. No network, deployment, credentials or paid resources.
export function estimateFreeBudget(options = {}) {
  const cfg = {
    users: 80, hz: 2, hours: 2, objects: 1, connects: 80,
    alarmHz: 0, extraDo: 0, workerRequests: 80,
    rowsRead: 0, rowsWritten: 0, storedGb: 0, ...options
  }
  const allowed = new Set(['users','hz','hours','objects','connects','alarmHz','extraDo','workerRequests','rowsRead','rowsWritten','storedGb'])
  for (const [key, value] of Object.entries(cfg)) {
    if (!allowed.has(key)) throw new Error('Unknown option: ' + key)
    if (!Number.isFinite(value) || value < 0) throw new Error(key + ' must be a finite non-negative number')
  }
  if (cfg.hours > 24) throw new Error('hours is a daily value and must be <= 24')
  for (const key of ['users','objects','connects','extraDo','workerRequests','rowsRead','rowsWritten']) {
    if (!Number.isInteger(cfg[key])) throw new Error(key + ' must be an integer')
  }
  if (cfg.users > 0 && cfg.objects < 1) throw new Error('At least one object is required for connected users')
  const seconds = cfg.hours * 3600
  const incoming = cfg.users * cfg.hz * seconds
  const alarms = Math.ceil(cfg.objects * cfg.alarmHz * seconds)
  const used = {
    doRequests: Math.ceil(cfg.connects + incoming / 20 + alarms + cfg.extraDo),
    durationGbSeconds: cfg.objects * seconds * .128,
    workerRequests: cfg.workerRequests,
    sqliteRowsRead: cfg.rowsRead,
    // Assumes one setAlarm per alarm invocation. Retries/extra writes must be added.
    sqliteRowsWritten: cfg.rowsWritten + alarms,
    storedGb: cfg.storedGb
  }
  const limits = {
    doRequests: 100000, durationGbSeconds: 13000, workerRequests: 100000,
    sqliteRowsRead: 5000000, sqliteRowsWritten: 100000, storedGb: 5
  }
  const dimensions = Object.fromEntries(Object.entries(limits).map(([key, limit]) => [
    key, { used: used[key], limit, percent: +(used[key] / limit * 100).toFixed(2), exceeded: used[key] > limit }
  ]))
  return {
    assumptions: cfg, incomingWebSocketMessages: incoming, alarmInvocations: alarms,
    dimensions,
    quotaEstimate: Object.values(dimensions).some(d => d.exceeded) ? 'exceeds-checked-limits' : 'within-checked-limits',
    capacityVerified: false,
    notes: [
      'This is a quota estimate, not an 80-client performance test or a guarantee of zero cost.',
      'Add all other account usage, reconnects, heartbeats, retries, RPC calls and storage overhead.',
      'Workers CPU limits, actual object active duration, memory and network performance are not tested.',
      'Incoming WebSocket messages use a 20:1 compute-request accounting ratio; outgoing messages still consume CPU/network.',
      'Free daily quotas reset at 00:00 UTC (09:00 Asia/Seoul). Keep usage headroom.'
    ]
  }
}

const flags = {
  users: 'users', hz: 'hz', hours: 'hours', objects: 'objects', connects: 'connects',
  'alarm-hz': 'alarmHz', 'extra-do': 'extraDo', 'worker-requests': 'workerRequests',
  'rows-read': 'rowsRead', 'rows-written': 'rowsWritten', 'stored-gb': 'storedGb'
}
export function parseArgs(args) {
  const options = {}
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i]
    if (!flag.startsWith('--') || !Object.hasOwn(flags, flag.slice(2))) throw new Error('Unknown flag: ' + flag)
    const value = args[i + 1]
    if (value === undefined || value.trim() === '' || value.startsWith('--')) throw new Error('Missing value: ' + flag)
    options[flags[flag.slice(2)]] = Number(value)
  }
  return options
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.includes('--help')) {
      console.log('node scripts/realtime-free-budget.mjs --users 80 --hz 2 --hours 2 --objects 1 --connects 80 --alarm-hz 0 --extra-do 0 --worker-requests 80 --rows-read 0 --rows-written 0 --stored-gb 0')
    } else {
      const report = estimateFreeBudget(parseArgs(process.argv.slice(2)))
      console.log(JSON.stringify(report, null, 2))
      if (report.quotaEstimate === 'exceeds-checked-limits') process.exitCode = 2
    }
  } catch (error) {
    console.error(error.message); process.exitCode = 1
  }
}
