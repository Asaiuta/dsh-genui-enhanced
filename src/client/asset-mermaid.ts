/**
 * Diagram asset-bundle entry: registers the diagram engine on
 * `window.__GenuiAssets__.mermaid`. Built as a standalone IIFE into
 * `lib/assets/mermaid.js` (file name kept for asset-loader compatibility)
 * and served by the plugin's node-half route; loaded on demand by
 * mermaid-lazy. The engine is pele — see pele-core.ts for the swap rationale.
 * @module @changfenhuang/dsh-genui/client/asset-mermaid
 */
import { renderMermaid } from './pele-core.ts'
import { assertSafeSvg, repairMermaidSource } from './mermaid-safe.ts'

const win = globalThis as unknown as { __GenuiAssets__?: Record<string, unknown> }
const assets = win.__GenuiAssets__ ?? (win.__GenuiAssets__ = {})
assets.mermaid = { assertSafeSvg, repairMermaidSource, renderMermaid }
