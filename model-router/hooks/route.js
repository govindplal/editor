// Pure routing rules. Nothing here touches Claude Code, so tests import it directly.

export const LEVELS = ['low', 'medium', 'high', 'xhigh', 'max']

// Model aliases used only for escalation and for cheap subagents.
export const MODELS = { light: 'haiku', strong: 'opus' }

// A big context is expensive to re-read after a model switch (prompt-cache miss).
// Above this share of the window, escalation raises effort only and never swaps the model.
export const CACHE_SAFE_PERCENT = 25

const RISKY =
  /\b(auth\w*|oauth|payments?|billing|migrat\w*|security|vulnerab\w*|data loss|production|prod|incident|rollback|credentials?|rbac)\b/i

const DEEP =
  /\b(root cause|race condition|deadlock|memory leak|architect\w*|refactor\w*|rewrite|concurren\w*|performance|optimi[sz]\w*|debug\w*|investigate|design (a|the) (system|schema|api|service))\b/i

const QUICK_START =
  /^\s*(what|where|which|who|when|how (do|does|to)|explain|show|list|summari[sz]e|rename|format|typo|add (a )?comment|commit message)\b/i

const FORCED = { low: 'low', med: 'medium', medium: 'medium', high: 'high', deep: 'high', xhigh: 'xhigh', max: 'max' }

/** True when a task looks too heavy to hand to a small model. */
export function isHeavy(text) {
  const t = text ?? ''
  return RISKY.test(t) || DEEP.test(t) || t.length > 1500
}

/**
 * Pick a route and an effort level for one prompt, from plain rules.
 * A leading !low, !medium, !high, !xhigh or !max forces the level.
 */
export function classify(text, attachmentCount = 0) {
  const t = text ?? ''
  const forced = t.match(/^\s*!(low|med|medium|high|deep|xhigh|max)\b/i)
  if (forced) return { route: 'forced', effort: FORCED[forced[1].toLowerCase()], reason: 'prefix' }
  if (RISKY.test(t)) return { route: 'risky', effort: 'xhigh', reason: 'risk keyword' }
  if (DEEP.test(t) || t.length > 1500 || attachmentCount > 2) return { route: 'deep', effort: 'high', reason: 'hard task' }
  if (t.length <= 200 && QUICK_START.test(t)) return { route: 'quick', effort: 'low', reason: 'short lookup or edit' }
  return { route: 'build', effort: 'medium', reason: 'default' }
}

/** Move an effort level up by n steps, clamped to the top. */
export function bump(level, n) {
  const i = LEVELS.indexOf(level)
  if (i < 0) return level
  return LEVELS[Math.min(LEVELS.length - 1, i + n)]
}

/**
 * Escalate once, in the playbook's order: more effort first, then a bigger model.
 * The model only changes while the context is small enough to re-read cheaply.
 */
export function escalate(failStreak, ctxPercent) {
  if (failStreak <= 0) return { bump: 0, model: undefined }
  if (failStreak === 1) return { bump: 1, model: undefined }
  const isCheap = typeof ctxPercent === 'number' && ctxPercent < CACHE_SAFE_PERCENT
  return { bump: 2, model: isCheap ? MODELS.strong : undefined }
}
