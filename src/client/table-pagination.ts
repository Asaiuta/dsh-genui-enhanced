import { GENUI_LIMITS } from './genui-runtime/index.ts'

/** fork.2: pagination math for `table`, extracted so the renderer keeps the
 *  slicing declarative and the arithmetic stays unit-testable. */
export interface TablePageWindow {
  /** First row index (into the filtered entry list) shown on the page. */
  start: number
  /** One past the last row index shown on the page. */
  end: number
  /** Total page count (≥ 1, even for an empty table). */
  pages: number
  /** The clamped current page (0-based) — `page` may have been out of range. */
  current: number
}

/** Resolve the window of rows a table page shows. `page` is clamped into
 *  range so a shrunken data set (e.g. the reader typed into the bound filter)
 *  never yields a blank page; `pageSize` is clamped to
 *  `[1, GENUI_LIMITS.maxTableRows]`. */
export function tablePageWindow(totalRows: number, pageSize: number, page: number): TablePageWindow {
  const size = Math.min(Math.max(Math.floor(pageSize), 1), GENUI_LIMITS.maxTableRows)
  const pages = Math.max(1, Math.ceil(totalRows / size))
  const current = Math.min(Math.max(Math.floor(page), 0), pages - 1)
  const start = current * size
  return { start, end: start + size, pages, current }
}
