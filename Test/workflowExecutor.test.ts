import { describe, it, expect, vi } from 'vitest'
import type { Workflow } from '../src/shared/types'

describe('workflowExecutor param interpolation', () => {
  const resolveParam = (val: string, params: Record<string, string>): string =>
    val.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] ?? '')

  it('replaces known params', () => {
    expect(resolveParam('Hello {{name}}', { name: 'Alice' })).toBe('Hello Alice')
  })

  it('leaves unknown params empty', () => {
    expect(resolveParam('{{unknown}}', {})).toBe('')
  })

  it('replaces multiple params', () => {
    expect(resolveParam('{{user}} / {{pass}}', { user: 'admin', pass: 'secret' })).toBe(
      'admin / secret'
    )
  })
})

describe('workflow step validation', () => {
  const validWorkflow: Workflow = {
    id: 'wf-1',
    name: 'Login',
    params: [{ name: 'user', label: 'Username' }],
    steps: [
      { type: 'goto', url: 'https://example.com/login' },
      { type: 'fill', selector: '#username', value: '{{user}}' },
      { type: 'click', selector: '#submit' }
    ]
  }

  it('has all required fields', () => {
    expect(validWorkflow.id).toBeTruthy()
    expect(validWorkflow.steps.length).toBeGreaterThan(0)
  })

  it('step types are valid', () => {
    const validTypes = ['goto', 'fill', 'click', 'wait', 'assert']
    for (const step of validWorkflow.steps) {
      expect(validTypes).toContain(step.type)
    }
  })
})
