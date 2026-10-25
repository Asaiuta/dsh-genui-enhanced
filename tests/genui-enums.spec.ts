import { describe, expect, it } from 'vitest'
import { processGenuiSpec } from '../src/client/guard.ts'
import { GENUI_LIMITS } from '../src/client/genui-runtime/index.ts'
import type { GenuiNode } from '../src/client/spec.ts'

/** Pull item i out of a repaired root spec as a loose record for assertions. */
function item(value: unknown, i = 0): Record<string, unknown> {
  const spec = value as { items?: GenuiNode[] } | null
  const node = spec?.items?.[i]
  expect(node, `item ${i} should have repaired`).toBeDefined()
  return node as Record<string, unknown>
}

describe('chart kinds (fork.2: area)', () => {
  it('repairs and keeps kind=area', () => {
    const result = processGenuiSpec({
      items: [{ type: 'chart', kind: 'area', data: [{ label: 'A', value: 1 }, { label: 'B', value: 2 }] }],
    })
    expect(result.errors).toEqual([])
    expect(item(result.spec).kind).toBe('area')
  })

  it('accepts a series-only area chart', () => {
    const result = processGenuiSpec({
      items: [{ type: 'chart', kind: 'area', series: [{ label: 's', data: [{ label: 'A', value: 1 }] }] }],
    })
    expect(result.errors).toEqual([])
    expect(item(result.spec).kind).toBe('area')
  })

  it('reports unknown kinds with the updated domain list', () => {
    const result = processGenuiSpec({
      items: [{ type: 'chart', kind: 'bubble', data: [{ label: 'A', value: 1 }] }],
    })
    expect(result.errors.some(error => error.includes('kind must be bars, line, area, or donut'))).toBe(true)
    // The repair path silently degrades an unknown kind to bars.
    expect(item(result.spec).kind).toBeUndefined()
  })

  it('still rejects series on donut, with the updated message', () => {
    const result = processGenuiSpec({
      items: [{
        type: 'chart', kind: 'donut',
        data: [{ label: 'A', value: 1 }],
        series: [{ label: 's', data: [{ label: 'B', value: 2 }] }],
      }],
    })
    expect(result.errors.some(error => error.includes('series is only supported for bars, line, and area'))).toBe(true)
  })
})

describe('input types (fork.2: date/number)', () => {
  it('keeps the native date types and their string constraints', () => {
    const result = processGenuiSpec({
      items: [
        { type: 'input', inputType: 'date', min: '2026-01-01', max: '2026-12-31' },
        { type: 'input', inputType: 'datetime-local', min: '2026-01-01T00:00' },
        { type: 'input', inputType: 'time', min: '09:00', max: '18:00' },
      ],
    })
    expect(result.errors).toEqual([])
    expect(item(result.spec, 0)).toMatchObject({ inputType: 'date', min: '2026-01-01', max: '2026-12-31' })
    expect(item(result.spec, 1)).toMatchObject({ inputType: 'datetime-local', min: '2026-01-01T00:00' })
    expect(item(result.spec, 2)).toMatchObject({ inputType: 'time', min: '09:00', max: '18:00' })
  })

  it('keeps numeric constraints on inputType=number and clamps step', () => {
    const result = processGenuiSpec({
      items: [
        { type: 'input', inputType: 'number', min: 0, max: 10, step: 0.5 },
        { type: 'input', inputType: 'number', step: 1e9 },
      ],
    })
    expect(result.errors).toEqual([])
    expect(item(result.spec, 0)).toMatchObject({ inputType: 'number', min: 0, max: 10, step: 0.5 })
    expect(item(result.spec, 1).step).toBe(1e6)
  })

  it('drops an unknown inputType (repair falls back to text)', () => {
    const result = processGenuiSpec({ items: [{ type: 'input', inputType: 'tel' }] })
    expect(item(result.spec).inputType).toBeUndefined()
  })
})

describe('table pageSize (fork.2)', () => {
  it('passes a sane pageSize through repair', () => {
    const result = processGenuiSpec({
      items: [{ type: 'table', columns: ['A'], rows: [['1'], ['2']], pageSize: 5 }],
    })
    expect(result.errors).toEqual([])
    expect(item(result.spec).pageSize).toBe(5)
  })

  it('clamps pageSize into [1, maxTableRows]', () => {
    const result = processGenuiSpec({
      items: [
        { type: 'table', columns: ['A'], rows: [['1']], pageSize: 0 },
        { type: 'table', columns: ['A'], rows: [['1']], pageSize: 99_999 },
      ],
    })
    expect(result.errors).toEqual([])
    expect(item(result.spec, 0).pageSize).toBe(1)
    expect(item(result.spec, 1).pageSize).toBe(GENUI_LIMITS.maxTableRows)
  })
})
