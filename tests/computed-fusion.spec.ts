import { describe, expect, it } from 'vitest'
import { processGenuiSpec } from '../src/client/guard.ts'
import { evaluateComputed, resolveComputedSpec } from '../src/client/computed.ts'
import { prepareTableRows } from '../src/client/table-details.ts'
import type { GenuiSpec } from '../src/client/spec.ts'

/** fork.3 fusion regression: Computed × the fork.2 surface (table pagination
 *  data path, area charts). React-level fusion (pager DOM, area wash gaps,
 *  submit filtering of invalid drafts) lands with the jsdom suite in fork.4;
 *  these cover the node-visible data pipeline. */
describe('computed × fork.2 integration', () => {
  it('keeps $computed refs and pageSize through the repair pipeline', () => {
    const result = processGenuiSpec({
      computed: [{ id: 'total', expr: 'a*b' }],
      items: [
        { type: 'input', id: 'a', inputType: 'number', value: '2' },
        { type: 'input', id: 'b', inputType: 'number', value: '3' },
        { type: 'table', columns: ['项', '值'], rows: [['合计', { $computed: 'total' }]], pageSize: 5 },
      ],
    })
    expect(result.errors).toEqual([])
    const table = result.spec?.items[2] as { pageSize?: number; rows: Array<Array<unknown>> }
    expect(table.pageSize).toBe(5)
    expect(table.rows[0]?.[1]).toEqual({ $computed: 'total' })
  })

  it('prepareTableRows passes computed refs through so pagination sees them', () => {
    const prepared = prepareTableRows({
      columns: ['项', '值'],
      rows: [['a', { $computed: 'x' }], ['b', 2]],
    })
    expect(prepared?.rows[0]?.[1]).toEqual({ $computed: 'x' })
    expect(prepared?.rows[1]?.[1]).toBe(2)
  })

  it('resolves computed cells into formatted values for the table renderer', () => {
    const spec: GenuiSpec = {
      computed: [{ id: 'total', expr: 'a*b', format: { style: 'percent' } }],
      items: [
        { type: 'input', id: 'a', inputType: 'number', value: '0.5' },
        { type: 'input', id: 'b', inputType: 'number', value: '4' },
        { type: 'table', columns: ['项', '值'], rows: [['率', { $computed: 'total' }]] },
      ],
    }
    const fields = { a: '0.5', b: '4' }
    const resolved = resolveComputedSpec(spec, evaluateComputed(spec, fields))
    const cell = (resolved.items[2] as { rows: Array<Array<unknown>> }).rows[0]?.[1] as { value: number; formatted: string }
    expect(cell.value).toBe(2)
    expect(cell.formatted).toContain('200')
  })

  it('feeds null gaps for invalid computed points that the area renderer must not fill', () => {
    // 1e13 overflows the chart's numeric domain upstream → null gap; the
    // fork's per-series area wash closes only when a series has no nulls.
    const spec: GenuiSpec = {
      computed: [{ id: 'big', expr: '1e13' }],
      items: [{ type: 'chart', kind: 'area', data: [], series: [
        { label: 'A', data: [{ label: 'X', value: { $computed: 'big' } }, { label: 'Y', value: 2 }] },
        { label: 'B', data: [{ label: 'X', value: 3 }, { label: 'Y', value: 4 }] },
      ] }],
    }
    const chart = resolveComputedSpec(spec, evaluateComputed(spec, {})).items[0] as {
      series: Array<{ data: Array<{ label: string; value: number | null }> }>
    }
    expect(chart.series[0]?.data.map(point => point.value)).toEqual([null, 2])
    expect(chart.series[1]?.data.map(point => point.value)).toEqual([3, 4])
  })
})
