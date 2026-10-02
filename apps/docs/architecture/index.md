# 仓库与包

## 包依赖图

```
@yue-ui/design-tokens   （纯 CSS，零依赖）
        │
        ├──────────────► @yue-ui/vue ──► @yue-ui/docs
        │                      │
@yue-ui/hooks ───────────────┘
```

- `@yue-ui/design-tokens` 不依赖 Vue，也不依赖任何构建工具。
- `@yue-ui/vue` 的样式**不打包** Token 包，两者保持独立发布与独立版本。
- `apps/docs` 同时依赖三者，并且只引用真实包——不复制一份 CSS 进文档站。

## 级联契约

Token 包的入口声明层顺序，组件样式因此有了确定的位置：

```css
/* packages/tokens/src/index.css */
@layer primitives, semantics, components, implementations, demo;

@import url('./primitives.css') layer(primitives);
@import url('./semantics.css') layer(semantics);
@import url('./components.css') layer(components);
```

**加载顺序是契约的一部分**：Token 入口必须先于 `@yue-ui/vue/style.css`。
组件样式表本身不再声明 `@layer`，否则可能在 `primitives` 之前创建
`implementations`，把层顺序悄悄反过来。

## 为什么 Token 与组件必须分家

- Token 包能被任何技术栈使用（Vue、React、原生 HTML），组件包只服务 Vue。
- 主题与品牌色属于 Token 层，改动不应该触发组件包发版。
- 两个包一起装进 tarball 会让字体等资源被复制多份。

## 门禁

| 门禁 | 命令 | 判定标准 |
| --- | --- | --- |
| 安装 | `corepack pnpm install` | 锁文件可复现，无网络失败 |
| 类型 | `corepack pnpm typecheck` | 每个包独立通过 |
| 构建 | `corepack pnpm build` | 拓扑顺序 tokens → hooks → vue → docs |
| 测试 | `corepack pnpm test` | Token 解析、色彩数学、审计全部通过 |
| Token 审计 | `corepack pnpm audit:tokens` | 每个目标 64/64，且多目标解析逐值一致 |

## 与归档项目的关系

`Design-System-archived/` 是同一目标的上一次尝试，本仓库刻意不复用它的目录结构：

- 它把 Token 拆分目录复制了三份（`packages/tokens/tokens/tokens/`）
- 它使用 `@yue-ui/*` 命名
- 它的路线图一次规划了 73 个组件，却在第一个组件之前就铺开了 i18n、SSR 与命令式 Message

本仓库只继承它做对的部分：`tsconfig.base.json` 的严格配置、`pnpm-workspace.yaml` 的
`packages/*` + `apps/*` 布局、以及 VitePress 主题的组织方式。
