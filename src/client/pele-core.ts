/**
 * pele render engine — the HEAVY half, replacing mermaid-core as the lazy
 * diagram engine bundled into `lib/assets/mermaid.js` (file name kept for
 * asset-loader compatibility). Same contract as mermaid-core.renderMermaid:
 * kind whitelist, headerless-flowchart leniency, one repair retry, and the
 * assertSafeSvg gate; failures throw so the caller shows its fallback.
 *
 * Why pele: the mermaid asset bundle is 3.4 MB against pele's ≈0.7 MB, pele
 * themes through CSS variables — mapped here onto the host's `--dsw-alias-*`
 * tokens as live var() references on the SVG root, so host theme switches
 * re-flow diagrams without a re-render (mermaid-core froze its palette at
 * initialize time) — and pele renders synchronously, which keeps the
 * fence-feedback error path free of async render races.
 *
 * The kind whitelist is unchanged from mermaid-core; pele covers every kind
 * on it, including gitGraph. mindmap/timeline stay excluded exactly as
 * mermaid-core left them.
 * @module @changfenhuang/dsh-genui/client/pele-core
 */
import { register, render as peleRender } from 'pele'
import flowchartDiagram from 'pele/diagrams/flowchart'
import sequenceDiagram from 'pele/diagrams/sequence'
import classDiagram from 'pele/diagrams/class'
import stateDiagram from 'pele/diagrams/state'
import ganttDiagram from 'pele/diagrams/gantt'
import pieDiagram from 'pele/diagrams/pie'
import erDiagram from 'pele/diagrams/er'
import journeyDiagram from 'pele/diagrams/journey'
import gitGraphDiagram from 'pele/diagrams/gitGraph'
import mindmapDiagram from 'pele/diagrams/mindmap'
import timelineDiagram from 'pele/diagrams/timeline'
import { assertSafeSvg, ensureFlowchartKind, repairMermaidSource } from './mermaid-safe.ts'

type PeleDiagram = Parameters<typeof register>[0]

/** Diagram kinds allowed through to the renderer. mermaid-core's list plus
 * `mindmap` and `timeline`: pele renders both (mermaid-core excluded them
 * under its whitelist), so the fork widens the gate rather than inherit the
 * exclusion. */
const ALLOWED_KINDS = [
  'flowchart', 'graph', 'sequenceDiagram', 'classDiagram', 'stateDiagram',
  'gantt', 'pie', 'erDiagram', 'journey', 'gitGraph',
  'mindmap', 'timeline',
]

const DIAGRAM_MODULES: readonly PeleDiagram[] = [
  flowchartDiagram, sequenceDiagram, classDiagram, stateDiagram, ganttDiagram,
  pieDiagram, erDiagram, journeyDiagram, gitGraphDiagram,
  mindmapDiagram, timelineDiagram,
]

let registered = false

/** Register once per page; `register` is idempotent per module but the flag
 * keeps the loop off the hot path. */
function ensureRegistered(): void {
  if (registered) return
  for (const module of DIAGRAM_MODULES) register(module)
  registered = true
}

/** Frozen font family for the style attribute: pele measures text from these
 * vars, so the value must match what the diagram inherits when displayed
 * (same rationale as mermaid-core's frozen fontFamily). Double quotes in
 * family names become single quotes to stay valid inside style="…". */
function frozenFont(target?: HTMLElement): string {
  let family = ''
  try {
    family = (typeof document !== 'undefined' && document.body !== null)
      ? getComputedStyle(target ?? document.body).fontFamily
      : ''
  } catch {
    family = ''
  }
  if (family === '') family = 'ui-sans-serif, system-ui, sans-serif'
  return family.replace(/"/g, "'")
}

/** Inline `--pele-*` → host token mapping placed on the SVG root. Colours
 * stay live var() references against inherited `--dsw-alias-*` properties;
 * only radius and fonts are frozen. Fallbacks mirror mermaid-core's. */
function themeStyle(target?: HTMLElement): string {
  return [
    '--pele-bg:transparent',
    '--pele-fg:var(--dsw-alias-label-primary,#e6e6e6)',
    '--pele-muted:var(--dsw-alias-label-tertiary,#8a8a92)',
    '--pele-line:var(--dsw-alias-label-tertiary,#8a8a92)',
    '--pele-surface:var(--dsw-alias-bg-layer-2,#2c2c2e)',
    '--pele-surface-alt:var(--dsw-alias-bg-layer-3,#2c2c2e)',
    '--pele-border:var(--dsw-alias-border-l2,rgba(255,255,255,0.12))',
    '--pele-accent:var(--dsw-alias-state-business-primary,#5b7bd5)',
    '--pele-error:var(--dsw-alias-state-error-primary,#ef4444)',
    '--pele-critical:var(--dsw-alias-state-error-primary,#ef4444)',
    '--pele-radius:8px',
    `--pele-font:${frozenFont(target)}`,
    '--pele-font-mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
  ].join(';')
}

/**
 * Render mermaid source to an SVG string via pele.
 * @param code - the mermaid diagram source.
 * @param target - final diagram element whose inherited font is used for layout.
 * @returns the rendered SVG markup (verified free of script/event handlers).
 * @throws when the kind is not whitelisted, rendering fails, or the output
 *   fails the sanitization check.
 */
export async function renderMermaid(code: string, target?: HTMLElement): Promise<string> {
  let trimmed = code.trim()
  const firstLine = trimmed.split('\n', 1)[0] ?? ''
  let kind = /^([A-Za-z]+)/.exec(firstLine)?.[1] ?? ''
  if (!ALLOWED_KINDS.includes(kind)) {
    // Lenient: model-generated sources frequently omit the mandatory
    // diagram-type declaration line; detect a flowchart body by its edge
    // arrows and prepend the declaration (mermaid-core's behavior).
    const lenient = ensureFlowchartKind(trimmed)
    if (lenient !== trimmed) {
      trimmed = lenient
      kind = 'graph'
    }
  }
  if (!ALLOWED_KINDS.includes(kind)) {
    throw new Error(`mermaid kind '${kind}' is not allowed`)
  }
  ensureRegistered()
  const attempt = (source: string): string => {
    const result = peleRender(source)
    const svg = typeof result.svg === 'string' ? result.svg : ''
    if (!svg.startsWith('<svg')) {
      throw new Error(`pele returned no SVG for kind '${kind}'`)
    }
    return svg
  }
  let svg: string
  try {
    svg = attempt(trimmed)
  } catch (error) {
    // Retry once with the label-repair pass; a repaired source rendering
    // successfully beats a syntax-error fallback for the same content.
    const repaired = repairMermaidSource(trimmed)
    if (repaired !== trimmed) {
      svg = attempt(repaired)
    } else {
      throw error
    }
  }
  assertSafeSvg(svg)
  // Merge the --pele-* bridge INTO pele's own root style attribute — pele's
  // output already carries one (it defines the internal --_fg/--_s/… chain
  // over --pele-* plus sizing). Inserting a second style attribute would be
  // discarded by the HTML parser (duplicate attribute), silently dropping
  // the --_* definitions and blacking out every fill.
  const bridge = themeStyle(target)
  if (/(^<svg[^>]*?style=")/.test(svg)) {
    return svg.replace(/(^<svg[^>]*?style=")/, `$1${bridge};`)
  }
  return svg.replace(/^<svg/i, `<svg style="${bridge}"`)
}
