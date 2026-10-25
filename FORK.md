# dsh-genui fork（pele 引擎版）

基于市场版 `@changfenhuang/dsh-genui` 0.14.0 的本地 fork。**包名保持不变**（零字符串手术：client 的注册 id、资产路由、boot-graph rev 查找全部原样工作），版本号 `0.14.0-fork.1` 标记 fork 身份。profile 以 `link:` 指向本目录，市场更新不再进入。

## 相对上游的 delta

1. **图示引擎 mermaid → pele 1.10.0**（MIT，Obsidian 出品）
   - 新增 `src/client/pele-core.ts`：引擎适配层。复用 `mermaid-safe.ts` 的三个纯函数（assertSafeSvg / repairMermaidSource / ensureFlowchartKind），只实现引擎差异。
   - `src/client/asset-mermaid.ts`：导入从 mermaid-core 换成 pele-core（一行）。**资产文件名保持 `mermaid.js`**——asset-loader 的 URL 与 rev 失效逻辑不动。
   - 资产体积 3.44 MB → 1.02 MB（-70%）；同步渲染，fence-feedback 错误路径无异步竞态。
2. **主题桥接**：pele 读 CSS 变量，SVG 根元素内联 `--pele-*` → `--dsw-alias-*` 的活 `var()` 映射（颜色随宿主换主题实时重排，mermaid-core 是 initialize 时冻结调色板）；字体/圆角按 mermaid-core 同样理由冻结（测量一致性）。fallback 值与 mermaid-core 相同。
3. **白名单扩容**：`mindmap`、`timeline` 进入白名单（mermaid-core 曾排除，pele 支持良好）。白名单共 12 种：flowchart/graph/sequenceDiagram/classDiagram/stateDiagram/gantt/pie/erDiagram/journey/gitGraph/mindmap/timeline。
4. **fork.2 能力增强**（0.14.0-fork.2，条目见 CHANGELOG）：`chart` 加 `area` kind（多序列常驻填充的面积趋势）；`input` 加 `date`/`datetime-local`/`time`/`number` 原生类型与 `min`/`max`/`step` 约束；`table` 加自动分页（>15 行本地翻页，`pageSize` 可覆盖，分组表豁免）并把 `maxTableRows` 提到 200；文档漂移修正（pele-core 注释、SKILL mermaid/diagram 条目）；新增 `tests/` 回归测试（vitest，`pnpm exec vitest run`）。

## 已知限制（pele 本体，与上游无关）

- pie 无引号标签（`A : 42`）pele 解析报 Lexical error——与裸 pele 一致（兼容探针 49/50 的唯一失败项）；此类围栏走客户端 fallback 显示源码。
- pele 的图型覆盖与 mermaid 11 长尾语法可能存在分歧；验收标准 = 真实使用中的图，不接受合成探针代替。

## 构建

```
pnpm install          # devDeps；esbuild 的 build 脚本需放行（pnpm-workspace.yaml 或 approve-builds）
pnpm exec tsc -p tsconfig.json   # 零错误门禁
pnpm exec tsdown      # 产出 lib/（client.js、index.js、assets/*）
```

TypeScript 钉 5.9.3、@types/react-dom 钉 18.3.7（`^5.6.0` / `^18.0.0` 在本机 pnpm 下会解析到范围下限，编译不过）。`pnpm run build` 因 pnpm 11 的 deps 自检会连环触发内层 install 而失败，直接跑上面三条。

## Tier 1 本机纪律

SKILL.md 末尾三条（禁翻文件系统 / 紧凑 chart 组件优先 / 修改只重发变化围栏）已收编进本 fork，随包分发，不再怕重装冲掉。

## 未做（Tier 2 剩余，按需立项）

- echart 地图 preset（choropleth）：需打包 GeoJSON 按需资产 + full 包暴露 registerMap；数据源（世界地图 GeoJSON 选型、区域名中英匹配）已评估，按需立项
- chart_export（echarts SSR 出 SVG）≈250 tok
- 治理移植（闭合列表校验等）
- 上游 PR：pele 可选替换若被作者收编，可放弃 fork 回市场版
