# 指南

Yue Design 是一个 monorepo，把设计系统拆成三个可以**独立构建、独立发布**的包，外加一套可执行的门禁。

## 仓库结构

```
Yue-Design/
├─ packages/
│  ├─ tokens/     @yue-ui/design-tokens   纯 CSS，无构建步骤
│  ├─ hooks/      @yue-ui/hooks           Vue composables（当前为空，见包内 README）
│  └─ vue/        @yue-ui/vue             Vue 3 组件包
├─ apps/
│  └─ docs/       @yue-ui/docs            VitePress 文档站
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
| Monorepo 骨架 | ✅ 5 个 workspace 项目，`install` / `typecheck` / `build` / `test` / `audit:tokens` 全绿 |
| Token 包 | ✅ 483 个 Token，浅色 + 深色 + Accent + forced-colors；审计 64/64 通过 |
| Token 审计器 | ✅ 零依赖 Node 实现，与原型内嵌审计共享 Token 逐值一致（1804 项解析零差异） |
| Hooks 包 | ✅ `useNamespace` / `useConfig` / `provideYueConfig` 等契约与 Symbol 注入 key |
| Vue 组件包 | ✅ `YueButton` 完成，三个 JS 入口 + 两个 CSS 入口 + 类型声明 |
| 文档站 | ✅ 9 页，含 Button 组件页与实时预览；浅色 / 深色 / Accent / 密度切换 |

第一个垂直切片 `YueButton` 已经走完整条链路。参见[组件总览](/components/)。
