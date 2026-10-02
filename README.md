# SnapClip Design System

把设计系统拆成三个可独立构建、独立发布的包，每个包配一套可执行的门禁。

```
Design-System/
├─ packages/
│  ├─ tokens/     @snapclip/design-tokens   纯 CSS Token，零依赖、无构建步骤
│  ├─ hooks/      @snapclip/hooks           Vue composables（当前为扩展位，无公开 API）
│  └─ vue/        @snapclip/vue             Vue 3 组件包
├─ apps/
│  └─ docs/       @snapclip/docs            VitePress 文档站（不加载任何外部 CDN）
├─ tools/         Token 审计器与构建产物检查器（零依赖 Node）
├─ tests/         Token 解析、色彩数学、审计门禁测试
├─ design-tokens-generic-v4/  迁移前的 HTML 原型，逐字节保持不变，作为视觉基准
├─ package.json
├─ pnpm-workspace.yaml
└─ tsconfig.base.json
```

## 环境要求

| 组件 | 版本 |
| --- | --- |
| Node.js | ≥ 20.19 |
| pnpm | 10.30.1（由 corepack 提供，见 `packageManager`） |

`pnpm` 未安装在 PATH 上，命令统一通过 corepack 调用，使用缓存中的固定版本：

```bash
corepack enable              # 可选：把 shim 装进 Node 目录
corepack pnpm --version      # 10.30.1
```

## 命令

```bash
corepack pnpm install        # 安装 workspace 依赖
corepack pnpm typecheck      # 每个包独立类型检查
corepack pnpm build          # 拓扑顺序：tokens → hooks → vue → docs
corepack pnpm test           # 门禁测试
corepack pnpm audit:tokens   # Token 对比度审计
corepack pnpm verify:dist    # 构建产物检查（外部 CDN / 资源存在性 / 层顺序）
corepack pnpm verify         # 以上全部串起来跑一遍
corepack pnpm dev            # 文档站开发服务器
```

## 当前状态

已验证通过（`corepack pnpm verify`，退出码 0）：

| 门禁 | 结果 |
| --- | --- |
| `install` | 5 个 workspace 项目，191 个包 |
| `typecheck` | hooks / vue / docs 全部通过 |
| `build` | `packages/vue/dist`（`index.js` + `index.d.ts` + `style.css`）与 `apps/docs/.vitepress/dist`（8 页）产出完整 |
| `test` | 64 项测试通过 |
| `audit:tokens` | 每个目标 64/64；原型 ↔ 包 1804 项解析零差异 |
| `verify:dist` | 0 处外部资源加载；19 个字体资产本地化（1 个内联为 data URI）；层顺序声明先于层块 |

另外核对过：

- `design-tokens-generic-v4/**` 共 24 个文件 **SHA256 逐字节未变**（原型只被复制，从未被改动）
- 复制进包的 13 个 CSS 与 6 个字体文件与原型源文件 **逐字节一致**
- Tabler 图标字体**未**复制进 Token 包（`components/*.css` 从未引用它）

尚未完成（下一步）：

- `DsButton` 垂直切片（BEM + Component Token，不使用 `scoped`，图标走插槽）
- 文档站的组件页、颜色规范、Token 浏览器、对比度审计页、Accent 切换
- `pnpm pack` → 临时项目安装 tarball 的消费验证

## 设计约束

- **Token 与组件分开打包。** Token 包能被任何技术栈消费；组件样式发布在
  `@snapclip/vue/style.css`，不打包 Token，避免字体等资源被复制多份。
- **加载顺序是契约。** `@snapclip/design-tokens/index.css` 声明
  `@layer primitives, semantics, components, implementations, demo`，
  必须最先加载。组件样式表自身不声明层顺序。
- **样式不使用 `scoped`。** 组件 CSS 全局生效，外部才能覆写与主题化。
- **图标不进 Token 包。** 组件通过插槽接收图标，不绑定 Tabler 或 Material Icons。
- **审计器严格失败。** 遇到无法建模的 CSS 构造、悬空引用或 `!important` 时直接报错，
  而不是跳过——否则门禁形同虚设。

## 已知取舍

- **字体体积**：`packages/tokens/assets` 约 17MB（HarmonyOS Sans SC ×4 等）。
  当前优先保证视觉基准不失真；做 tarball 发布验证时会重新评估是否拆成可选子路径。
- **`packages/hooks` 是空的**：在有真实消费者之前不发明 composable API。
- **`.npmrc` 固定了镜像源**：本机无法直连 `registry.npmjs.org`，仓库内固定为
  `mirrors.tencent.com/npm` 并开启 `prefer-offline`（依赖版本均已锁定在 pnpm store 中）。
