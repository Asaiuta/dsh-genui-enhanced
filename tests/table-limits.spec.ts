import { describe, expect, it } from 'vitest'
import { GENUI_LIMITS } from '../src/client/genui-runtime/index.ts'
import { prepareTableRows } from '../src/client/table-details.ts'

describe('prepareTableRows row cap (fork.2: 200)', () => {
  it('keeps up to the raised limit so pagination sees the data', () => {
    const rows = Array.from({ length: 250 }, (_v, i) => [String(i)])
    const prepared = prepareTableRows({ columns: ['n'], rows })
    expect(prepared).not.toBeNull()
    expect(prepared?.rows.length).toBe(GENUI_LIMITS.maxTableRows)
    expect(prepared?.rows[0]?.[0]).toBe('0')
    expect(prepared?.rows.at(-1)?.[0]).toBe('199')
  })

  it('still passes small tables through untouched', () => {
    const prepared = prepareTableRows({ columns: ['a', 'b'], rows: [['1', '2'], ['3', '4']] })
    expect(prepared?.rows).toEqual([['1', '2'], ['3', '4']])
  })
})
