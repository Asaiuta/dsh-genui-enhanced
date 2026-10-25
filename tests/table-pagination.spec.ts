import { describe, expect, it } from 'vitest'
import { tablePageWindow } from '../src/client/table-pagination.ts'

describe('tablePageWindow', () => {
  it('slices a middle page', () => {
    expect(tablePageWindow(50, 15, 2)).toEqual({ start: 30, end: 45, pages: 4, current: 2 })
  })

  it('clamps an out-of-range page onto the last page', () => {
    const win = tablePageWindow(20, 15, 9)
    expect(win.current).toBe(1)
    expect(win.start).toBe(15)
    expect(win.end).toBe(30)
  })

  it('clamps a negative page onto the first page', () => {
    const win = tablePageWindow(20, 15, -3)
    expect(win.current).toBe(0)
    expect(win.start).toBe(0)
  })

  it('yields a single page for small tables', () => {
    expect(tablePageWindow(5, 15, 0)).toEqual({ start: 0, end: 15, pages: 1, current: 0 })
  })

  it('yields a single page for an empty table', () => {
    expect(tablePageWindow(0, 15, 0)).toEqual({ start: 0, end: 15, pages: 1, current: 0 })
  })

  it('clamps pageSize into [1, maxTableRows]', () => {
    expect(tablePageWindow(10, 0, 0).end).toBe(1)
    expect(tablePageWindow(10, -5, 0).pages).toBe(10)
    expect(tablePageWindow(9, 999_999, 0).pages).toBe(1)
  })
})
