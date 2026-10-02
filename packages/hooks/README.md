# @yue-ui/hooks

Yue 组件共用的 Vue composables 与公共契约。

**状态：已有公开 API（`useNamespace`、`useConfig` 等）。**

## 导出

```ts
import {
  DEFAULT_YUE_CONFIG,
  YUE_NAMESPACE,
  installYueConfig,
  provideYueConfig,
  useConfig,
  useNamespace,
  yueConfigKey,
} from '@yue-ui/hooks'
import type { ComponentSize, Namespace, YueConfig } from '@yue-ui/hooks'
```

| 导出 | 作用 |
| --- | --- |
| `useNamespace(block)` | 生成 BEM 类名工厂：`b()` / `e()` / `m()` / `em()` / `is()` |
| `useConfig()` | 读取当前生效的 `YueConfig`；在组件外调用返回默认值而不是 `undefined` |
| `provideYueConfig(config)` | 给组件子树提供配置 |
| `installYueConfig(app, config)` | 给整个应用提供配置（插件入口使用） |
| `yueConfigKey` | `Symbol` 类型的 `InjectionKey<YueConfig>`，不使用字符串注入 key |
| `YUE_NAMESPACE` | 类名命名空间常量，固定为 `'yue'` |
| `DEFAULT_YUE_CONFIG` | `{ size: 'md' }` |

```ts
const ns = useNamespace('button')
ns.b()          // yue-button
ns.e('icon')    // yue-button__icon
ns.m('primary') // yue-button--primary
ns.is('loading')// is-loading
```

块名传的是 `'button'`，不带命名空间 —— `useNamespace('button')`，而不是
`useNamespace('yue-button')` —— 所以命名空间只有 `YUE_NAMESPACE` 一处定义。
`is-*` 状态标记有意不带命名空间：它是所有组件共享的状态语义。

### 为什么命名空间不是配置项

`YueConfig` 里**没有** `prefix` / `namespace`：

- CSS 选择器无法在运行时由变量拼出来。改命名空间意味着类名变成 `.app-button`，
  而随包发布的样式表只写了 `.yue-button` —— 每条规则都会静默失效，按钮变成裸样式。
- 类名本身就是公开 API：文档让人覆写 `.yue-button--primary`，`verify:dist`
  也断言这些类名。可配置的命名空间会让文档对改了它的人变成错的。

真要改命名空间，正确做法是在**生成样式表时**改写选择器（构建期），不是运行时配置。

传了 `prefix` / `namespace`（或拼错的键）时会立刻收到一条解释性警告，
不会被静默忽略。

## 构建

```bash
corepack pnpm -C packages/hooks build   # → dist/index.js + dist/index.d.ts
```

本包的 JavaScript 由 `vue-tsc` 直接产出（不经过打包器），所以**相对导入必须带 `.js`
扩展名**：`import { X } from './types.js'`。TypeScript 会把它映射回 `./types.ts`，
而 tsc 会原样输出 —— 若省略扩展名，仓库内的测试全都会通过（它们都走打包器或
workspace 链接），但消费者一 `import '@yue-ui/hooks'` 就是
`ERR_MODULE_NOT_FOUND`。

这条约定有两道检查守着：

- `tests/esm-specifiers.test.mjs` —— 静态检查源码里每个相对说明符都带 `.js`（快，构建前就能失败）；
- `corepack pnpm verify:tarball` —— 把本包单独打包、装进临时项目，用**原生 Node ESM**
  `import` 并实际调用一遍导出。

两者都是必要的：`@yue-ui/vue` 在构建时把本包编译进去，所以只测 vue 的 tarball
永远看不见这个问题。

产出的 ESM 因此既可以被 Node 直接解析，也可以被打包器消费。

`@yue-ui/vue` 在构建时把本包编译进去，所以它对本包是 `devDependency`：
发布出去的 Vue 包除了 `vue` 之外没有运行时依赖。本包仍然可以单独安装，
供直接使用这些 composable 的项目使用。
