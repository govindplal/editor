import { classify, bump, escalate, isHeavy, MODELS } from './route.js'

// Shared by the hooks below. A reload resets them; the stats are kept in $.store.
let enabled = true
let quiet = false
let plan = { route: 'build', effort: 'medium', reason: 'default' }
let failStreak = 0
let ctxPercent
let escalations = 0
let seen = {}

// Commands that count as a "cheap check": a failure here is evidence the cheap route fumbled.
const CHECK =
  /\b(npm (run )?test|pnpm (run )?test|yarn test|npx (jest|vitest|tsc|eslint)|pytest|go test|cargo test|dotnet test|mvn (-q )?test|gradle test|ng test|tsc|eslint|ruff|mypy)\b/
const FAILED = /\b(FAIL(ED)?|error TS\d+|\d+ failing|AssertionError)\b/

function record(route, usage) {
  const s = (seen[route] ??= { steps: 0, input: 0, cacheRead: 0, cacheWrite: 0 })
  s.steps += 1
  s.input += usage.input_tokens ?? 0
  s.cacheRead += usage.cache_read_input_tokens ?? 0
  s.cacheWrite += usage.cache_creation_input_tokens ?? 0
}

function report() {
  const rows = Object.keys(seen).map((route) => {
    const s = seen[route]
    const total = s.input + s.cacheRead + s.cacheWrite
    const hit = total > 0 ? Math.round((100 * s.cacheRead) / total) : 0
    return route + ': ' + s.steps + ' steps, cache hit ' + hit + '%'
  })
  return rows.length > 0 ? rows.join('\n') : 'no steps recorded yet'
}

export function register(on) {
  on('session.start', async ($, e, next) => {
    try {
      const saved = await $.store.get('stats')
      if (saved && typeof saved === 'object') {
        seen = saved.seen ?? {}
        escalations = saved.escalations ?? 0
      }
    } catch {
      // No saved stats yet
    }
    try {
      await $.command.register({
        name: 'route',
        description: 'Model router: status, on, off, quiet, verbose, stats, reset',
        argumentHint: '[on|off|quiet|verbose|stats|reset]',
      })
    } catch {
      // Name already taken: the router still works, it just has no command
    }
    return next(e)
  })

  // 1. Classify each prompt from plain rules. Free, instant, deterministic.
  on('prompt.submit', async ($, e, next) => {
    if (!enabled) return next(e)
    plan = classify(e.text, (e.attachments ?? []).length)
    failStreak = 0
    try {
      const usage = await $.session.usage()
      ctxPercent = usage.context.percent
    } catch {
      ctxPercent = undefined
    }
    if (!quiet) $.ui.log('route: ' + plan.route + ' -> effort ' + plan.effort)
    return next(e)
  })

  // 2. Apply the route to every request of the main conversation. Effort first.
  on('turn.step', async function* ($, e, next) {
    if (!enabled || e.agentId) return yield* next(e)
    const esc = escalate(failStreak, ctxPercent)
    const patch = {}
    // Leave a model without effort support, or a numeric budget, alone
    if (typeof e.effort === 'string') patch.effort = bump(plan.effort, esc.bump)
    if (esc.model) patch.model = esc.model
    const result = yield* next(Object.keys(patch).length > 0 ? { ...e, ...patch } : e)
    if (result.usage) record(plan.route, result.usage)
    return result
  })

  // 3. Watch the cheap checks. A failure bumps effort; a second one may bump the model.
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const result = await next(e)
    if (!enabled || result.deny || !CHECK.test(e.command ?? '')) return result
    const failed = result.isError === true || FAILED.test(result.text ?? '')
    if (failed) {
      failStreak += 1
      escalations += 1
    } else {
      failStreak = 0
    }
    return result
  })

  // 4. Small, self-contained subagent jobs go to a small model. A fresh context has no cache to lose.
  on('agent.spawn', async ($, e, next) => {
    if (!enabled || e.fork || e.model) return next(e)
    const isLight =
      e.subagentType === 'Explore' ||
      (/\b(search|find|list|locate|grep|summari[sz]e)\b/i.test(e.description) && !isHeavy(e.prompt))
    return isLight ? next({ ...e, model: MODELS.light }) : next(e)
  })

  // 5. Save the stats once per turn, so /route stats survives a restart.
  on('turn.complete', async ($, e, next) => {
    if (!e.agentId) {
      try {
        await $.store.set('stats', { seen, escalations })
      } catch {
        // Stats are best effort
      }
    }
    return next(e)
  })

  on('command.run', { command: 'route' }, async ($, e) => {
    const arg = (e.args ?? '').trim().toLowerCase()
    if (arg === 'off') enabled = false
    else if (arg === 'on') enabled = true
    else if (arg === 'quiet') quiet = true
    else if (arg === 'verbose') quiet = false
    else if (arg === 'reset') {
      seen = {}
      escalations = 0
      try {
        await $.store.set('stats', { seen, escalations })
      } catch {
        // Nothing saved to clear
      }
      return { text: 'router stats cleared' }
    } else if (arg === 'stats') {
      return { text: report() + '\nescalations: ' + escalations }
    }
    return {
      text:
        'router ' + (enabled ? 'on' : 'off') + ' · last route: ' + plan.route + ' (' + plan.effort + ') · failed checks this task: ' + failStreak,
    }
  })
}
