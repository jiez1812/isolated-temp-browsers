import { describe, expect, it } from 'vitest'
import {
  buildStepTypePatch,
  buildWorkflowRetryTogglePatch,
  normalizeRetryDelayInput,
  normalizeRetryInput,
  stripStepRetryFields,
} from '../src/renderer/src/components/WorkflowPanel'

describe('WorkflowPanel retry controls', () => {
  it('normalizes retry counts for editor input', () => {
    expect(normalizeRetryInput('')).toBeUndefined()
    expect(normalizeRetryInput('0')).toBeUndefined()
    expect(normalizeRetryInput('-1')).toBeUndefined()
    expect(normalizeRetryInput('2.8')).toBe(2)
    expect(normalizeRetryInput('99')).toBe(10)
    expect(normalizeRetryInput('abc')).toBeUndefined()
  })

  it('normalizes retry delay seconds to milliseconds', () => {
    expect(normalizeRetryDelayInput('')).toBeUndefined()
    expect(normalizeRetryDelayInput('0')).toBeUndefined()
    expect(normalizeRetryDelayInput('-1')).toBeUndefined()
    expect(normalizeRetryDelayInput('0.5')).toBe(500)
    expect(normalizeRetryDelayInput('1.25')).toBe(1250)
    expect(normalizeRetryDelayInput('abc')).toBeUndefined()
  })

  it('clears retry metadata when changing step type', () => {
    expect(buildStepTypePatch('waitSeconds')).toEqual({
      type: 'waitSeconds',
      selector: undefined,
      url: undefined,
      value: undefined,
      timeout: undefined,
      retryCount: undefined,
      retryDelay: undefined,
    })
  })

  it('sets a default retry count when the workflow retry toggle is enabled', () => {
    expect(buildWorkflowRetryTogglePatch(true, {})).toEqual({
      retryCount: 1,
      retryDelay: undefined,
    })
  })

  it('preserves existing workflow retry values when the toggle is enabled', () => {
    expect(buildWorkflowRetryTogglePatch(true, { retryCount: 3, retryDelay: 750 })).toEqual({
      retryCount: 3,
      retryDelay: 750,
    })
  })

  it('clears workflow retry fields when the toggle is disabled', () => {
    expect(buildWorkflowRetryTogglePatch(false, { retryCount: 3, retryDelay: 750 })).toEqual({
      retryCount: undefined,
      retryDelay: undefined,
    })
  })

  it('strips legacy step-level retry metadata before saving', () => {
    expect(stripStepRetryFields([
      { type: 'click', selector: '#submit', retryCount: 2, retryDelay: 500 },
      { type: 'waitSeconds', timeout: 1000 },
    ])).toEqual([
      { type: 'click', selector: '#submit' },
      { type: 'waitSeconds', timeout: 1000 },
    ])
  })
})
