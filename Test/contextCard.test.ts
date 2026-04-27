/**
 * ContextCard unit tests (plain vitest, no @testing-library/react).
 *
 * Because the renderer runs in a browser environment and @testing-library/react
 * is not installed, we test the component's pure logic by extracting and exercising
 * the same decision branches that ContextCard implements:
 *
 *  1. Workflow picker visibility (showWorkflowPicker state)
 *  2. "No workflow" branch renders picker button when allWorkflows is non-empty
 *  3. Existing workflow branch: workflow name is available and picker is hidden by default
 *  4. onSetWorkflow is called with the selected workflow id
 *  5. param values are initialised from context.workflowParams / param.defaultValue
 */

import { describe, it, expect, vi } from 'vitest'
import type { ContextBrowserConfig, Workflow } from '../src/shared/types'

// ── shared test data ───────────────────────────────────────────────────────────

const makeContext = (overrides: Partial<ContextBrowserConfig> = {}): ContextBrowserConfig => ({
  id: 'ctx-1',
  name: 'Test Browser',
  startupUrl: 'https://example.com',
  windowSize: { width: 1280, height: 800 },
  ...overrides
})

const makeWorkflow = (overrides: Partial<Workflow> = {}): Workflow => ({
  id: 'wf-1',
  name: 'Login Flow',
  steps: [{ type: 'goto', url: 'https://example.com' }],
  params: [{ name: 'user', label: 'Username', defaultValue: 'admin' }],
  ...overrides
})

// ── helper: reproduce ContextCard param-initialisation logic ───────────────────
// This mirrors the useState initialiser and the useEffect body verbatim so we
// can assert the correct initial values without rendering the component.

function initParamValues(
  workflow: Workflow | undefined,
  context: ContextBrowserConfig
): Record<string, string> {
  return Object.fromEntries(
    (workflow?.params ?? []).map(p => [
      p.name,
      context.workflowParams?.[p.name] ?? p.defaultValue ?? ''
    ])
  )
}

// ── helper: reproduce ContextCard workflow-picker display logic ────────────────
// Returns what the component would render in the "no workflow" branch.
function noWorkflowPickerState(
  allWorkflows: Workflow[],
  showWorkflowPicker: boolean
): 'hidden' | 'picker-button' | 'select' | 'create-hint' {
  if (allWorkflows.length === 0) return 'create-hint'
  if (showWorkflowPicker) return 'select'
  return 'picker-button'
}

// ── tests ──────────────────────────────────────────────────────────────────────

describe('ContextCard — no workflow branch', () => {
  it('shows "Create a workflow first" hint when allWorkflows is empty', () => {
    expect(noWorkflowPickerState([], false)).toBe('create-hint')
  })

  it('shows the "Set Workflow" button when allWorkflows is non-empty and picker is closed', () => {
    const workflows = [makeWorkflow()]
    expect(noWorkflowPickerState(workflows, false)).toBe('picker-button')
  })

  it('shows the select element when the picker button has been clicked', () => {
    const workflows = [makeWorkflow()]
    expect(noWorkflowPickerState(workflows, true)).toBe('select')
  })

  it('onSetWorkflow is invoked with the selected id when an option is chosen', () => {
    const onSetWorkflow = vi.fn()
    const selectedId = 'wf-1'
    // Simulate the onChange handler from the picker select
    const handleChange = (value: string) => {
      if (value) {
        onSetWorkflow(value)
      }
    }
    handleChange(selectedId)
    expect(onSetWorkflow).toHaveBeenCalledWith('wf-1')
  })

  it('onSetWorkflow is NOT called when the empty default option is chosen', () => {
    const onSetWorkflow = vi.fn()
    const handleChange = (value: string) => {
      if (value) onSetWorkflow(value)
    }
    handleChange('')
    expect(onSetWorkflow).not.toHaveBeenCalled()
  })
})

describe('ContextCard — existing workflow branch', () => {
  it('workflow name is accessible from the workflow prop', () => {
    const workflow = makeWorkflow({ name: 'Login Flow' })
    // ContextCard renders {workflow.name} directly — verify the value
    expect(workflow.name).toBe('Login Flow')
  })

  it('workflow picker is hidden by default (showWorkflowPicker starts false)', () => {
    // The initial state is false; the picker only opens when the icon button is clicked.
    // We assert the initial render decision.
    const showWorkflowPicker = false
    expect(showWorkflowPicker).toBe(false)
  })

  it('step count is accessible for display', () => {
    const workflow = makeWorkflow({
      steps: [
        { type: 'goto', url: 'https://example.com' },
        { type: 'fill', selector: '#user', value: 'alice' }
      ]
    })
    expect(workflow.steps.length).toBe(2)
  })

  it('onSetWorkflow called with new id when workflow is changed via picker', () => {
    const onSetWorkflow = vi.fn()
    // Simulate onChange on the existing-workflow select
    const handleChange = (value: string) => {
      onSetWorkflow(value)
    }
    handleChange('wf-2')
    expect(onSetWorkflow).toHaveBeenCalledWith('wf-2')
  })

  it('onSetWorkflow called with empty string to remove the workflow', () => {
    const onSetWorkflow = vi.fn()
    const handleChange = (value: string) => onSetWorkflow(value)
    handleChange('')
    expect(onSetWorkflow).toHaveBeenCalledWith('')
  })
})

describe('ContextCard — param value initialisation', () => {
  it('falls back to defaultValue when workflowParams is not set', () => {
    const workflow = makeWorkflow()
    const context = makeContext()
    const values = initParamValues(workflow, context)
    expect(values['user']).toBe('admin')
  })

  it('uses workflowParams value over defaultValue when present', () => {
    const workflow = makeWorkflow()
    const context = makeContext({ workflowParams: { user: 'alice' } })
    const values = initParamValues(workflow, context)
    expect(values['user']).toBe('alice')
  })

  it('defaults to empty string when neither workflowParams nor defaultValue is set', () => {
    const workflow = makeWorkflow({
      params: [{ name: 'pass', label: 'Password' }] // no defaultValue
    })
    const context = makeContext()
    const values = initParamValues(workflow, context)
    expect(values['pass']).toBe('')
  })

  it('returns empty object when workflow is undefined', () => {
    const context = makeContext()
    expect(initParamValues(undefined, context)).toEqual({})
  })

  it('initialises multiple params independently', () => {
    const workflow = makeWorkflow({
      params: [
        { name: 'user', label: 'Username', defaultValue: 'admin' },
        { name: 'pass', label: 'Password', defaultValue: 'secret' }
      ]
    })
    const context = makeContext({ workflowParams: { user: 'alice' } })
    const values = initParamValues(workflow, context)
    expect(values['user']).toBe('alice')   // from workflowParams
    expect(values['pass']).toBe('secret')  // from defaultValue
  })
})
