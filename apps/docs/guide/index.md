# 指南

SnapClip Design System 是一个 monorepo，把设计系统拆成三个可以**独立构建、独立发布**的包，外加一套可执行的门禁。

## 仓库结构

```
Design-System/
├─ packages/
│  ├─ tokens/     @snapclip/design-tokens   纯 CSS，无构建步骤
│  ├─ hooks/      @snapclip/hooks           Vue composables（当前为空，见包内 README）
│  └─ vue/        @snapclip/vue             Vue 3 组件包
├─ apps/
│  └─ docs/       @snapclip/docs            VitePress 文档站
├─ tools/         Token 审计器等零依赖工具
└─ tests/         Token 解析、色彩数学与审计的门禁测试
```

`design-tokens-generic-v4/` 是迁移前的 HTML 原型，**保持逐字节不变**，作为视觉基准保留。

## 命令

所有 pnpm 命令都通过 corepack 调用固定版本（`pnpm@10.30.1`）：

```bash
corepack pnpm install       # 安装 workspace 依赖
corepack pnpm typecheck     # 每个包独立类型检查
corepack pnpm build         # 按依赖拓扑顺序构建 tokens → hooks → vue → docs
corepack pnpm test          # 55 项测试，含 Token 审计
corepack pnpm audit:tokens  # Token 对比度审计（独立 CLI）
corepack pnpm verify        # 上面四步串起来跑一遍
```

## 当前状态

| 部分 | 状态 |
| --- | --- |
| Monorepo 骨架 | ✅ 5 个 workspace 包，`install` / `typecheck` / `build` / `test` / `audit:tokens` 全绿 |
| Token 包 | ✅ 451 个 Token，浅色 + 深色 + Accent + forced-colors；审计 64/64 通过 |
| Token 审计器 | ✅ 零依赖 Node 实现，与原型内嵌审计逐值一致（1804 项解析零差异） |
| Vue 组件包 | ⏳ 构建管线与导出已就绪，`DsButton` 是第一个组件 |
| 文档站 | ⏳ 骨架与主题就绪，正文页面待填充 |

下一步是第一个垂直切片：`DsButton`。参见[组件总览](/components/)。
