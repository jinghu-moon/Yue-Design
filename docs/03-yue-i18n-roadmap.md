# Yue I18N 国际化实现路线图

状态：**核心 I18N、双语文档、质量门禁与 `vue-i18n` 参考 adapter 已完成**（阶段 0–4、6，以及
阶段 5 的参考实现与阶段 7 的候选版本审计）。**明确待后续的两项**：RTL 语言包（运行时、逻辑属性与
浏览器门禁都在，但没有 RTL 语言包，因此不声称 RTL 已完成）、独立发布的 adapter 包（目前只有
`vue-i18n` 参考实现，位于文档站内，不随 `@yue-ui/vue` 发布；其它引擎按真实消费场景决定）。

实现位置：`packages/hooks/src/locale/`、`packages/vue/src/locale/`、`apps/docs/` 与
`tools/audit-i18n.mjs` / `tools/check-docs-i18n.mjs`。本文是后续维护与验收依据。

## 0. 目标与边界

Yue 是被应用消费的组件库，不是应用级翻译平台。因此：

- `@yue-ui/vue` 不直接依赖 `vue-i18n`、Intlayer、Paraglide、Tolgee 或其他翻译引擎；
- 组件只依赖 Yue 自己的 locale contract；应用可以通过 adapter 接入任意翻译方案；
- Yue 自带少量组件内部文案和默认语言包，语言包必须可按需导入；
- 用户传入的标签、帮助文案、业务错误和页面内容仍由应用或 `YueField` 等消费层负责；
- 文案、日期、数字、复数和方向不是 CSS Token，也不进入组件 CSS；
- 任何用户可见字符串、placeholder、tooltip、toast、错误提示和 `aria-label` 都必须
  有可追踪的 message key 或明确由消费者提供。

性能表中的 gzip 和页面泄漏数字不能直接作为库选型结论：不同构建插件、runtime-only
模式、语言包拆分方式和测试页面会改变结果。我们采用稳定的包边界和可测量的按需加载，
而不是把某个 Benchmark 的数字写成架构约束。

## 1. 目标架构

### 调研吸收

- **Vuetify**：采用 locale instance、`useLocale`、嵌套 `provideLocale` 和可替换 adapter；
  Yue 借鉴其边界，不复制其完整 RTL/数字 API。
- **TDesign Vue**：组件包提供独立 locale 文件，文档站根据当前语言加载对应全局配置；
  Yue 借鉴“语言包独立入口”，避免所有语言进入根包。
- **Ant Design**：通过 ConfigProvider 注入 locale，并要求语言包结构完整；Yue 借鉴其
  “组件内部文案统一归 locale”原则，不引入 React 形态或全量语言包。
- **VitePress**：使用 locale 目录、每 locale 独立 `themeConfig` 和语言路由；文档站按
  官方能力实现 `/` 中文与 `/en/` 英文，而不是只替换导航文字。

```text
packages/hooks/src/locale/  locale instance、provide/inject、Intl 格式化、adapter contract
packages/vue/src/locale/    类型安全的 key 目录、en-US/zh-CN 默认语言包
packages/vue/               YueLocaleProvider、组件调用 useLocale()、公开语言包子路径
apps/docs/                  VitePress 根中文与 /en 英文内容、语言切换、示例消费
```

核心运行时建议采用 Vuetify 式 instance，而不是让每个组件直接认识第三方引擎：

```ts
interface YueLocaleInstance {
  current: Ref<string>
  fallback: Ref<string>
  messages: Ref<YueLocaleMessages>
  t: (key: YueMessageKey, params?: YueMessageParams) => string
  n: (value: number, options?: Intl.NumberFormatOptions) => string
  d: (value: Date | number, options?: Intl.DateTimeFormatOptions) => string
  provide: (options: YueLocaleOptions) => YueLocaleInstance
}
```

`provideLocale()` 的嵌套范围继承父级：子树只覆盖 `locale` 或一个 message key 时，不能
  抹掉应用级的其他配置。跨包注入 key 使用 `Symbol.for('yue:locale')`，保证 hooks 与
`@yue-ui/vue` 被分别安装时仍然共享同一上下文。

## 2. 分阶段任务

### 阶段 0：契约、盘点和决策记录（已完成）

**目标**：在移除旧的 `YueConfig.messages` 前锁定公共模型。

任务：

1. 盘点 Button/Input 及未来组件中所有 Yue 自己渲染的字符串、ARIA 名称、错误和状态文案；
2. 采用 BCP 47 locale 标识（`en-US`、`zh-CN`，不使用 `en_US`）；
3. 默认组件语言定为 `en-US`，fallback 也为 `en-US`；文档站根路径显式为 `zh-CN`；
4. 设计命名空间：`input.clear`、`pagination.next`、`datePicker.selectDate`，不使用
   组件私有短键或拼接翻译片段；
5. 定义插值、复数、fallback、缺失 key、RTL 和 locale 切换行为；
6. 记录哪些文字不属于 Yue locale，而属于消费者 slot/prop/表单层。

交付物：locale RFC、message key 清单、迁移表、默认语言决策、风险清单。此阶段不添加
第三方依赖，也不先实现语言选择器。

### 阶段 1：底层 Locale Instance（已完成）

**目标**：在 `packages/hooks` 建立无第三方依赖的响应式 locale 核心。

任务：

- 新增 `YueLocaleInstance`、`YueLocaleOptions`、`YueLocaleMessages`、`YueMessageKey`；
- 新增 `createLocale()`、`useLocale()`、`provideLocale()` 和 `installYueLocale()`；
- 从 `YueConfig` 移除 `messages`，保留 `size`；迁移期不长期保留双 API；
- 使用 `Symbol.for('yue:locale')`，处理应用级、子树级和跨包注入；
- 实现 locale 规范化和 fallback 链（例如 `zh-Hans-CN -> zh-CN -> en-US`）；
- 实现安全的 key 查找和插值；缺失 key 发出可测试的诊断并返回 fallback 或可识别的 key，
  不返回空字符串；诊断不能依赖 tsc 产物里不存在的 `import.meta.env`；
- 使用原生 `Intl.NumberFormat`、`Intl.DateTimeFormat`，不手写千分位、日期格式和复数；
- 让 `current`、`fallback`、messages 和 adapter 都支持 SSR，不在 setup 中读取 `window`；
- 与现有 `size` 配置分离。不要把一个可变 locale instance 塞进 CSS 或组件 prop。

验证：先记录现有包体积和入口依赖基线。hooks 单测覆盖继承、fallback、缺失 key、插值、
Intl、SSR 无浏览器对象、重新导入后的 Symbol 一致性；原生 Node ESM 可加载构建产物。

### 阶段 2：语言包与类型安全（已完成）

**目标**：把组件内部文案变成可按需消费的公共资源。

任务：

- 在 `packages/vue/src/locale/` 放 Yue 组件专属 catalog；通用 runtime 和格式化仍在
  `packages/hooks/src/locale/`；不新增 workspace package；
- 提供 `en-US` 和 `zh-CN`，每个语言包具有相同的叶子 key 集合；
- 用 TypeScript `satisfies` 或生成类型固定 key，组件调用只能使用 `YueMessageKey`；
- 语言包按 locale 子路径导出，不把所有语言合并进根入口；
- 语言包只放 Yue 自己的内部文案，不放业务页面文本；
- 明确复数、插值变量和富文本边界。翻译字符串不得包含 Vue 模板、HTML 或组件对象；
- 为每个 key 记录用途、参数和可访问性要求。

验证：key parity、参数 parity、无孤儿 key、无空字符串、无未声明 key、每个 locale 入口
可单独导入；Tree Shaking 和 tarball 验证确认只导入一个语言包不会携带其他语言。

### 阶段 3：组件消费层迁移（已完成）

**目标**：现有和新组件只通过 `useLocale()` 消费内部文案。

任务：

1. 迁移 `YueInput` 的清空按钮、Button 未来新增的内部文案，以及后续组件；
2. 删除逐组件 `clearLabel` 等重复翻译 Props；
3. 移除 `YueConfig.messages` / `DEFAULT_YUE_MESSAGES`，更新 hooks、plugin、所有现有 docs
   和消费者示例；保留且回归 `YueConfig.size` 继承行为；
4. 用户提供的 label、placeholder、错误内容、业务按钮文字继续走 slot/prop；
5. 组件不得直接 import `vue-i18n` 或读取应用全局 `$t`；
6. 组件内部 key 统一使用类型层约定的 namespaced key，不能拼接翻译片段；
7. 需要计数时使用 locale contract 的复数能力，不写 `count === 1` 分支；
8. 需要数字/日期时调用 `n()` / `d()`，不缓存跨 locale 的格式化字符串；
9. locale 切换后，已挂载组件的可见文案、ARIA 文案和文档示例必须响应式更新。

验证：组件单测、真实浏览器切换语言、ARIA 名称、fallback、RTL、长文案溢出和无障碍扫描。

### 阶段 4：文档站双语基础设施（已完成，21 组页面全部镜像）

**目标**：阶段 1–3 的底层、catalog 和组件消费通过回归后，让 VitePress 文档站真正支持
中文和英文。此阶段是核心 locale 完成后的第一个消费层，不等外部 adapter。

任务：

1. 采用 VitePress 官方 `locales` 配置和目录结构：中文保留根路径，英文放 `/en/`，或
   在迁移 RFC 中选择完整 `/zh/`、`/en/` 双目录；不能只改导航而没有英文内容；
2. 为每个 locale 提供独立 `lang`、title、description、nav、sidebar 和搜索文案；
3. 添加稳定的语言切换链接，路由切换保留当前页面的相对路径和 hash；
4. 将组件示例、API、Guide 三份文档逐页建立中英文对应关系；
5. 文档中的 UI 文案、PreviewFrame 工具条、主题工具、复制按钮和自定义组件文案全部
   进入 docs locale，不在 Vue 模板中硬编码；
6. 文档示例同时验证“页面语言”和“组件 locale”：切换 docs 页面语言时，示例里的 Yue
   组件也切换 `en-US` / `zh-CN`；
7. 设置 `html lang`，为未来 RTL 页面使用逻辑属性；
8. 本地搜索为每种语言提供独立索引或 locale 配置，不把中文标题误当英文搜索结果；
9. 明确 SEO、canonical、sitemap、404、根路径默认语言和部署重定向策略。

验收：`/` 和 `/en/` 的所有公开页面都有对应内容；语言切换、刷新、深链接、返回前进、
暗色模式、组件示例、搜索、SSR/静态构建均通过；不存在中文页面标题出现在英文页面的情况。

### 阶段 5：外部 i18n Adapter（`vue-i18n` 参考实现已完成；独立 adapter 包未实现）

**目标**：让应用可以复用自己的翻译系统，而无需 Yue 依赖它。

首个适配器优先写文档示例，不急于新增包：

- `vue-i18n`：成熟、生态强，使用 Composition API、runtime-only 和 lazy loading；
- Intlayer：适合应用级组件作用域和构建期类型安全，但需要应用侧插件；
- Paraglide：适合编译生成和极致体积，但要求应用拥有生成流程；
- Tolgee：适合在线翻译协作，不属于 Yue 运行时核心。

先验证 `vue-i18n` 的 adapter contract；其他 adapter 只有出现真实消费场景才做。适配器必须
把 `locale`、`fallback`、`t`、`n`、`d` 映射到 Yue contract；不得把第三方类型泄漏进
`@yue-ui/vue` 的基础导出。每个 adapter 单独入口、单独 peer dependency、单独 tarball 测试；
未实现的 adapter 不得在文档中伪装成已支持。

### 阶段 6：质量门禁与持续维护（审计与测试门禁已完成，后续持续执行）

**目标**：让新增文字和语言不会再次漂移。

已落地并持续维护：

- `audit:i18n`：扫描 key parity、参数 parity、空值、孤儿 key 和未翻译标记；
- `audit:docs:i18n`：检查中英文页面镜像、locale-specific config、链接和标题；
- 组件 API/文档门禁中禁止新增硬编码用户文案；
- 真实浏览器门禁测试切换语言、`document.documentElement.lang`、fallback、长文案、
  RTL 和 locale provider 子树继承；
- tarball 门禁测试只安装一个语言包、外部 adapter 可选安装、SSR 导入不触碰浏览器；
- 为新增 message key 建立变更说明；删除/重命名 key 必须同步所有语言包和文档；
- 记录包体积预算，比较“根入口 + 单语言入口”，不把所有 locale 预加载进根入口
  （预算写在 `tests/tree-shaking/verify.mjs` 的 `BUDGET`：单语言包 500 B、button 10 KB、
  input 15 KB、plugin 26 KB；超限即失败，涨预算必须在同一次改动里说明理由）。

### 阶段 7：发布前审计（本次候选版本门禁已通过；正式发布前重跑）

只有在前面阶段完成后才做：

- `typecheck`、`build`、`test`、`audit:tokens`、`audit:docs`、`audit:i18n`、`audit:docs:i18n`；
- `verify:dist`、`verify:treeshaking`、`verify:visual`、`verify:tarball`；
- 英文/中文文档完整性、语言包体积、SSR hydration、无障碍文案和 RTL 审计；
- 发布策略另由 release workflow 负责，I18N Skill 不替代发布 Skill。

审计结论（逐项对应上面的验收点）：

| 验收点 | 证据 |
| --- | --- |
| 中英文文档完整 | `audit:docs:i18n`：21 组页面镜像、78 条链接、18 个锚点对着构建产物校验；英文散文里 0 个汉字（8 个汉字只作为被引用的中文数据出现在代码里） |
| 语言切换 / 刷新 / 深链接 / hash | `verify:visual`：走 VitePress locale 菜单切换、断言路径与 `hash` 一起过去、刷新与返回都保持语言 |
| `lang` / canonical / hreflang | `verify:dist`：42 个页面各自带 `lang` + canonical + `zh-CN`/`en-US`/`x-default`，并指向另一棵树的同一页 |
| 组件示例跟着页面语言走 | `verify:visual`：中文页默认字段读「清空」、子树读「Clear」、地区标签（无对应语言包）经 fallback 链也读「Clear」；英文页反之 |
| 搜索 / 导航 / 侧栏本地化 | `verify:visual`：英文页的 nav、sidebar 与搜索按钮不含中文（语言菜单除外——它按约定用各自语言书写自己） |
| 语言包体积与边界 | `verify:treeshaking`：单包入口 90 B、无组件、无 CSS；组件入口不带 `zh-CN`；四个入口的 js/css 都在 `BUDGET` 里记录并断言。`verify:dist`：只有默认包能从根入口到达 |
| 硬编码文案 | `audit:i18n`：按结构检查（模板文本节点、用户可见属性、字面量绑定、脚本里的文本），英文负向夹具覆盖 `aria-label="Clear"`、`title="Close"`、模板文本、字面量绑定与脚本变量；开发者警告与选择器不误报 |
| 外部 adapter 可选 | `tests/i18n/vue-i18n-adapter.test.ts`（8 项，真实 composer 驱动真实 `YueInput`）与 `verify:tarball`（装好的 `vue-i18n` 切换语言后已挂载组件跟着换字） |
| SSR / hydration | `tests/i18n/ssr-hydration.test.ts`（12 项）：`renderToString` 按 locale 与 fallback 链输出、`createSSRApp` 在服务端 HTML 上水合且**节点对象不变**、0 条 hydration mismatch、水合后切语言仍是同一元素；`verify:dist` 断言构建产物里每个 locale 的页面已经带着自己的文案（水合前） |
| RTL | 运行时与逻辑属性就绪，浏览器门禁在真实 RTL 子树里断言镜像（前缀到右侧、方向透传），但**没有 RTL 语言包**，因此不声称 RTL 已完成 |

### 未完成项（不计入已完成）

| 未完成项 | 现状 | 什么条件下才算完成 |
| --- | --- | --- |
| RTL 语言包 | 无 `ar` / `he` / `fa` 等语言包；运行时、逻辑属性、方向透传与浏览器镜像断言都在 | 第一个 RTL 语言包发布，并且它的语言包审计、浏览器门禁与文档镜像一起通过 |
| 独立发布的 adapter 包 | 只有 `vue-i18n` 参考实现，位于 `apps/docs/.vitepress/theme/adapters/vue-i18n.ts`，不随 `@yue-ui/vue` 发布，`vue-i18n` 也不在包的依赖里 | 出现真实消费场景后，为该引擎建独立入口 + 独立 peer dependency + 独立 tarball 测试；在此之前文档不把它写成「已支持」 |
| canonical 域名 | 当前为 Cloudflare Pages 地址 `https://yue-design.pages.dev`（canonical / hreflang / sitemap 都指向它） | 绑定自定义域名后同步更新 `SITE_HOSTNAME`，再重新构建并运行发布前审计 |

## 3. 明确不做

- 不把 Intlayer、Paraglide、vue-i18n 或 Tolgee 硬编码为 Yue 的唯一方案；
- 不为每个字符串添加一个组件 Prop；
- 不用字符串拼接表达跨语言句子；
- 不把 HTML/Vue 模板塞进翻译值；
- 不把缺失翻译静默当成完成；
- 不在底层 locale 完成前复制大量英文文档，避免两套内容同时漂移。

## 4. 参考资料

- [VitePress Internationalization](https://vitepress.dev/guide/i18n)
- [Vue I18n Lazy Loading](https://vue-i18n.intlify.dev/guide/advanced/lazy)
- [Vue I18n Composition API](https://vue-i18n.intlify.dev/guide/advanced/composition)
- [MDN Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)
- [MDN Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)
