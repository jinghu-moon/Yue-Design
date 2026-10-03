## 0. 固定架构决策

项目品牌和包名统一为：

```
项目：Yue Design
仓库：Yue-Design
Scope：@yue-ui
```

包：

```
@yue-ui/design-tokens
@yue-ui/hooks
@yue-ui/vue
@yue-ui/docs
```

CSS Token 保持当前无前缀命名，不改成 `--yue-*`。

组件命名：

```
YueButton
.yue-button
.yue-button__icon
.yue-button--primary
```

架构：

```
tokens → hooks → vue components → docs
```

`YueButton` 先纯手写，不引入 Reka UI。Reka 只用于后续 Dialog、Popover、Select 等复杂交互组件。

## 1. 建立基线

在项目根目录执行：

```
corepack pnpm install
corepack pnpm verify
```

记录：

- typecheck
- build
- test
- Token audit
- dist verification

保留：

```
design-tokens-generic-v4/
```

作为视觉和 Token 回归基准，不删除、不直接改造成 Vue 页面。

## 2. 固定项目命名

项目与仓库名称统一为：

```
项目：Yue Design
仓库：Yue-Design
```

包作用域保持为 `@yue-ui`，因为它是发布包的导入契约：

```
@yue-ui/design-tokens
@yue-ui/hooks
@yue-ui/vue
@yue-ui/docs
```

同步修改：

```
package.json
packages/*/package.json
apps/docs/package.json
README.md
tsconfig paths
Vite alias
tools/audit-tokens.mjs
tools/verify-dist.mjs
packages/vue/README.md
```

不要修改现有 Token 变量名。

验证：

```
rg -n -i "snapclip|yue design system|yue-design-system|@snapclip" --glob '!pnpm-lock.yaml' --glob '!docs/01-yue-button-checklist.md'
corepack pnpm install
```

## 3. 固定 Monorepo 目录

最终结构：

```
Yue-Design/
├─ packages/
│  ├─ tokens/
│  ├─ hooks/
│  └─ vue/
├─ apps/
│  └─ docs/
├─ tools/
├─ tests/
├─ design-tokens-generic-v4/
├─ package.json
├─ pnpm-workspace.yaml
└─ tsconfig.base.json
```

职责：

- `tokens`：纯 CSS，不依赖 Vue
- `hooks`：Vue composables 和公共类型
- `vue`：Vue 组件及组件样式
- `docs`：VitePress 文档和实时预览
- `tools`：审计、构建、包消费验证

## 4. 完成 Token 包

迁移当前已验证资源：

```
design-tokens-generic-v4/tokens/
design-tokens-generic-v4/assets/
```

放入：

```
packages/tokens/src/
packages/tokens/assets/
```

确保：

```
@layer primitives, semantics, components, implementations, demo;
```

保持以下入口：

```
@yue-ui/design-tokens
@yue-ui/design-tokens/index.css
@yue-ui/design-tokens/component-tokens/*.css  # Component Token 声明（index.css 已包含）
@yue-ui/design-tokens/implementations.css   # 可选：原型期选择器归档，不被 index.css 引用
```

包配置要求：

```
{
  "exports": {
    ".": "./src/index.css",
    "./index.css": "./src/index.css",
    "./component-tokens/*.css": "./src/component-tokens/*.css",
    "./implementations.css": "./src/implementations.css"
  },
  "sideEffects": ["**/*.css"]
}
```

验证：

```
corepack pnpm -C packages/tokens audit
corepack pnpm audit:tokens
```

## 5. 建立最小 Hooks 层

实现：

```
packages/hooks/src/
├─ config/
│  ├─ types.ts
│  ├─ injection.ts
│  └─ useConfig.ts
├─ namespace/
│  └─ useNamespace.ts
└─ index.ts
```

最小配置：

```
type ComponentSize = 'sm' | 'md' | 'lg'

interface YueConfig {
  size: ComponentSize
  prefix: string
}
```

`useNamespace('button')` 应生成：

```
yue-button
yue-button__icon
yue-button--primary
is-disabled
is-loading
```

使用 Symbol `InjectionKey`，不使用字符串注入 key。

## 6. 建立 Vue 包构建边界

Vue 包提供三个入口：

```
@yue-ui/vue
@yue-ui/vue/plugin
@yue-ui/vue/button
```

规则：

```
// 根入口：只做命名导出
export { default as YueButton } from './components/button/YueButton.vue'

// plugin：明确选择全量注册
export { default } from './plugin'

// button：单组件入口
export { default } from './components/button/YueButton.vue'
```

不要在根入口自动注册所有组件。

样式入口：

```
@yue-ui/vue/style.css
@yue-ui/vue/button.css
```

构建要求：

- ESM
- `vue` external
- 保留组件模块边界
- 输出 TypeScript 声明
- CSS 独立产物
- CSS 标记为 `sideEffects`
- 不使用 `import * as`

## 7. 设计 Button API

第一版 API：

```
type YueButtonTheme =
  | 'default'
  | 'primary'
  | 'danger'
  | 'success'

type YueButtonVariant =
  | 'solid'
  | 'outline'
  | 'ghost'
  | 'link'

type YueButtonSize = 'sm' | 'md' | 'lg'
type YueButtonShape = 'square' | 'round' | 'circle'
```

Props：

```
theme
variant
size
shape
disabled
loading
block
nativeType
tag
```

Slots：

```
default
leading
trailing
```

行为要求：

- `loading` 自动阻止点击
- `loading` 设置 `aria-busy="true"`
- `disabled` 设置原生 disabled
- 非 button 元素使用 `aria-disabled`
- `circle` 形态要求可访问名称
- 支持 `button`、`a` 和自定义组件
- 不把 Reka 类型暴露到公共 API

## 8. 实现 Button 文件

创建：

```
packages/vue/src/components/button/
├─ YueButton.vue
├─ types.ts
├─ index.ts
└─ style.css
```

`YueButton.vue` 负责：

- Props 类型
- 动态标签
- Slots
- click 事件
- disabled/loading 行为
- ARIA 属性
- namespace class

样式要求：

```
不使用 <style scoped>
使用 BEM
不写 raw hex
不直接使用 primitive token
只使用 Button Component Token
```

如现有 Token 不足，在：

```
packages/tokens/src/prototype/button.css
```

补充：

```
--button-height-sm
--button-primary-background
--button-primary-background-hover
--button-primary-background-pressed
--button-primary-color
--button-disabled-background
--button-disabled-color
```

## 9. 接入 Button 样式发布

将 Button 样式纳入：

```
packages/vue/src/style.css
```

同时生成：

```
dist/style.css
dist/components/button/style.css
```

确保：

```
Token CSS 先加载
Vue 组件 CSS 后加载
```

文档和消费者使用：

```
import '@yue-ui/design-tokens/index.css'
import '@yue-ui/vue/button.css'
```

或便利入口：

```
import '@yue-ui/vue/style.css'
```

## 10. 建立 VitePress 预览站

`apps/docs` 使用真实包入口：

```
import '@yue-ui/design-tokens/index.css'
import '@yue-ui/vue/style.css'
import { YueButton } from '@yue-ui/vue'
```

创建：

```
apps/docs/.vitepress/theme/components/
├─ PreviewFrame.vue
├─ ThemeSwitch.vue
├─ AccentSwitch.vue
└─ DensitySwitch.vue
```

`PreviewFrame` 提供：

- 实时预览
- 浅色/深色切换
- Accent 切换
- Density 切换
- 预览背景
- 代码展示
- 重置操作

创建页面：

```
apps/docs/components/button.md
```

页面必须展示真实 `YueButton`，不能复制一套静态 HTML。

## 11. 编写 Button 文档

Button 页面至少包含：

```
基础示例
主题变体
Solid / Outline / Ghost / Link
尺寸
形状
禁用状态
加载状态
Block 状态
Leading / Trailing 插槽
深色主题
Accent 主题
Props / Slots / Events
Token 映射
无障碍说明
按需引入示例
```

## 12. 编写单元测试

安装：

```
corepack pnpm add -Dw @vue/test-utils
```

创建：

```
packages/vue/src/components/button/YueButton.test.ts
```

至少覆盖：

- 默认渲染
- theme class
- variant class
- size class
- shape class
- disabled 不触发 click
- loading 不触发 click
- `aria-busy`
- `nativeType`
- `leading` slot
- `trailing` slot
- `block`
- `tag="a"`
- 非 button 的 `aria-disabled`

执行：

```
corepack pnpm test
corepack pnpm typecheck
```

## 13. 建立树摇验证

建立临时消费者：

```
tests/tree-shaking/
├─ button-entry.ts
├─ vite.config.ts
└─ verify.mjs
```

入口只导入：

```
import YueButton from '@yue-ui/vue/button'
import '@yue-ui/vue/button.css'
```

构建后验证：

```
不得出现 YueDialog
不得出现 Dialog 的 Reka primitive
不得出现 .yue-dialog
必须出现 YueButton
必须出现 Button CSS
```

再验证全量入口：

```
import YueUI from '@yue-ui/vue/plugin'
import '@yue-ui/vue/style.css'
```

两种入口都必须通过。

## 14. 建立文档视觉验证

使用 Playwright 验证：

```
Button 页面能打开
浅色主题正常
深色主题正常
Accent 切换正常
390px 无横向溢出
无外部 CDN 请求
无控制台错误
loading/disabled 状态正确
```

保存截图：

```
tests/visual/button-light.png
tests/visual/button-dark.png
tests/visual/button-mobile.png
```

## 15. 做 tarball 消费验证

执行：

```
corepack pnpm -C packages/tokens pack
corepack pnpm -C packages/vue pack
```

在临时消费者项目中验证：

```
import '@yue-ui/design-tokens/index.css'
import YueButton from '@yue-ui/vue/button'
import '@yue-ui/vue/button.css'
```

同时验证：

- 包 exports 正确
- 类型声明存在
- CSS 文件存在
- 不依赖 workspace 源码
- 不依赖外部 CDN
- 组件可以真实渲染

## 16. 第一阶段完成标准

只有全部通过才算 `YueButton` 完成：

```
corepack pnpm typecheck
corepack pnpm build
corepack pnpm test
corepack pnpm audit:tokens
corepack pnpm verify:dist
```

并且满足：

- Token 包可独立使用
- Vue 包可按需导入
- 全量插件单独导入
- Button 有完整 API
- Button 有文档预览
- Light/Dark 正常
- 移动端无溢出
- 树摇验证通过
- tarball 可被外部项目消费
- 没有旧项目名或旧包作用域残留

后续再按同一模板实现 `YueInput`、`YueTag`、`YuePopover` 和 `YueDialog`。其中 `YuePopover`、`YueDialog` 才开始引入 Reka UI。
