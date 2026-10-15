import { expect, test } from 'claude-code/testing'
import { classify, bump, escalate, isHeavy, CACHE_SAFE_PERCENT } from '../hooks/route.js'

test('short lookups route to low effort', () => {
  expect(classify('what does this function return?').effort).toBe('low')
  expect(classify('rename foo to bar').route).toBe('quick')
})

test('ordinary build work routes to medium', () => {
  const r = classify('add a retry to the upload service and update the unit tests for it')
  expect(r.route).toBe('build')
  expect(r.effort).toBe('medium')
})

test('hard tasks route to high, risky ones to xhigh', () => {
  expect(classify('investigate the race condition in the dispatcher').effort).toBe('high')
  expect(classify('change how auth tokens are refreshed').effort).toBe('xhigh')
  expect(classify('write the postgres migration for the new table').route).toBe('risky')
})

test('very long prompts and many attachments count as hard', () => {
  expect(classify('x'.repeat(1600)).route).toBe('deep')
  expect(classify('look at these', 3).route).toBe('deep')
})

test('a leading ! forces the level', () => {
  expect(classify('!max review this').effort).toBe('max')
  expect(classify('!low what is auth?').effort).toBe('low')
})

test('bump climbs the ladder and stops at the top', () => {
  expect(bump('low', 1)).toBe('medium')
  expect(bump('high', 5)).toBe('max')
})

test('escalation raises effort first and swaps the model only while the context is small', () => {
  expect(escalate(0, 10)).toEqual({ bump: 0, model: undefined })
  expect(escalate(1, 10)).toEqual({ bump: 1, model: undefined })
  expect(escalate(2, 10).model).toBe('opus')
  expect(escalate(2, CACHE_SAFE_PERCENT + 1).model).toBeUndefined()
  expect(escalate(3, undefined).model).toBeUndefined()
})

test('heavy-task check keeps risky and long work off a small model', () => {
  expect(isHeavy('grep for usages of foo')).toBe(false)
  expect(isHeavy('find where we handle payment retries')).toBe(true)
})

test('/route reports status and can be switched off and on', async ($) => {
  const status = await $.command.run({ command: 'route', args: '' })
  expect(status.text).toContain('router on')
  const off = await $.command.run({ command: 'route', args: 'off' })
  expect(off.text).toContain('router off')
  const on = await $.command.run({ command: 'route', args: 'on' })
  expect(on.text).toContain('router on')
})
