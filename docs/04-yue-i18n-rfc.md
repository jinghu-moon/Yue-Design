# Yue Locale RFC（阶段 0）

状态：已实现。本文是 [`03-yue-i18n-roadmap.md`](./03-yue-i18n-roadmap.md) 阶段 0 的交付物：
公共模型、文案清单、message key 清单、迁移表、默认语言决策与风险清单。阶段 1–6 的实现
以本文为准；实现与本文不一致时，先改本文再改代码。

## 1. 所有权边界

Yue 只拥有**组件自己渲染或放进无障碍树的字符串**。其余一切属于消费者。

| 字符串 | 所有者 | 机制 |
| --- | --- | --- |
| `YueInput` 清空控件的可访问名称 | **Yue** | locale key `input.clear` |
| Button / ButtonGroup / ButtonToggle / ButtonToggleItem 的可见文案 | 消费者 | `default` 插槽 |
| loading 期间「提交中」这类状态文字 | 消费者 | 默认插槽（组件只输出 `aria-busy` / `is-loading`） |
| 表单标签、帮助文案、业务校验与错误 | 消费者 | 消费者自己的 DOM、`YueField` 或应用层 |
| `placeholder`、`aria-label`、`aria-labelledby`、`aria-describedby` | 消费者 | 属性透传（Button / Toggle 的 group 名称同理） |
| 图标与自定义加载指示器 | 消费者 | `leading` / `trailing` / `loader` 插槽 |

两条由此推出的硬性结论：

1. **Yue 的 catalog 里只有 `input.clear` 一个 key。** 不是因为 I18N 还没做完，而是因为
   现阶段的组件除了它没有别的自有文案。`YueButton` 的 loading 只输出 `aria-busy`，不含文字；
   这是刻意的所有权决定（见「风险与取舍」第 1 条），不是待补的缺口。
2. **绝不为了翻译新增组件 Prop。** `clearLabel` 这类 prop 只服务一个组件、要在每个调用点重复，
   还要把「翻译」变成「改标记」。语言是 locale 层的事，不是组件的 API。

## 2. Locale 模型

| 决策 | 值 | 理由 |
| --- | --- | --- |
| 标识格式 | BCP 47（`en-US`、`zh-CN`、`zh-Hans-CN`） | `Intl` 原生接受；`en_US` 一律不出现 |
| 组件默认 locale | `en-US` | 库的默认语言是中立语言；中文应用显式声明 `zh-CN` |
| 默认 fallback | `en-US` | fallback 与默认同源，避免「没有 fallback 的 fallback」 |
| 文档站根路径 | `zh-CN` | 现有内容就是中文，根路径不搬家；英文镜像在 `/en/` |
| 规范化 | `Intl.getCanonicalLocales()`；非法输入回退到去除空白后的原值并记录诊断 | 不自己写 BCP 47 词法分析 |
| fallback 链 | `zh-Hans-CN → zh-CN → zh → en-US` | 先丢 script/region，再丢 region，最后到默认语言 |

规范化与 fallback 链由 `normalizeLocale()` / `localeCandidates()` 提供，两者都是纯函数、
无副作用、可单独测试。**链只决定「用哪一套 pack」，不决定 key 是否存在**：key 在链上任何一套
pack 里都没有时，才是真正的缺失 key。

## 3. Message key 契约

- 命名空间按**功能**命名，不按源码位置或语言：`input.clear`，不是 `clearButtonText`。
- 一句话就是一条消息。禁止拼接翻译片段，禁止把 HTML / Vue 模板 / 组件名放进消息值。
- key 的类型由 catalog 推导（`LeafMessageKeys<TTree>`），组件只能传 `YueMessageKey`。
- 每条 key 在 `packages/vue/src/locale/catalog.ts` 的 `YUE_MESSAGE_META` 里登记用途、参数与是否进入
  无障碍树；`pnpm audit:i18n` 保证 key 与登记一一对应。

### Key 清单（v1）

| key | 默认值 (en-US) | 中文 (zh-CN) | 参数 | 无障碍 | 用途 |
| --- | --- | --- | --- | --- | --- |
| `input.clear` | `Clear` | `清空` | 无 | 是（`aria-label`） | `YueInput` 清空控件的可访问名称 |

### 复数与插值

- 插值语法统一为 `{name}`，参数类型 `string | number`；缺参数时保留占位符本身并记录诊断。
- 复数消息写成按 `Intl.PluralRules` 分类的对象（必须含 `other`）：
  `{ one: '{count} item', other: '{count} items' }`。`t(key, { count })` 自动选择分类。
- 组件不得写 `count === 1` 这类英文语法分支。
- v1 的 catalog 没有复数 key：运行时能力已实现并有单测覆盖，但**没有消费方就不添加 key**
  （空转的翻译是没人能验证的承诺）。第一个需要计数的组件落地时补 key 与语言包。

## 4. 运行时契约

```ts
// @yue-ui/hooks/locale —— 机制，不含任何具体文案
interface YueLocaleInstance<TTree, TKey> {
  current: Ref<string>                       // 规范化后的当前 locale
  fallback: Ref<string>
  messages: Ref<TTree>                       // 链上合并 + 覆盖之后的完整消息树
  t(key: TKey, params?: YueMessageParams): string
  n(value: number, options?: Intl.NumberFormatOptions): string
  d(value: Date | number, options?: Intl.DateTimeFormatOptions): string
  provide(options: YueLocaleOptions<TTree>): YueLocaleInstance<TTree, TKey>
}
```

- `createLocale(options)` 新建实例；`provideLocale(options)` 从最近的实例派生并 `provide`；
  `useLocale()` 读取最近的实例；`installYueLocale(app, options)` 装在应用级。
- **继承语义与 `YueConfig` 一致**：`provideLocale()` 是覆盖而不是重置，未点名的选项沿用父级；
  子树只改一个 key 时不会抹掉应用级的其他配置。
- 跨包注入 key 是 `Symbol.for('yue:locale')`：`@yue-ui/hooks` 与 `@yue-ui/vue` 可能被分别打包，
  私有 `Symbol` 会让两边永不匹配，而 `inject(key, fallback)` 分不清「key 不对」和「没提供」。
- **缺失 key 不返回空字符串**：返回 key 本身（可识别），并记录一条可消费的诊断
  （`{ key, locale, reason }`，`consumeLocaleDiagnostics()` 可取出）。诊断不依赖
  `import.meta.env`——hooks 由 `tsc` 编译，没有 bundler 的 define 步骤（与
  `warnAboutUnknownKeys` 同一条理由）。
- **SSR 安全**：不在 `setup` 中读取 `window` / `document` / `navigator`。locale 由消费者显式传入；
  `html[lang]` 只由文档站在客户端 effect 里设置。
- **数字与日期一律走 `Intl`**，不手写千分位、日期格式或时区偏移；格式化器按 `locale + options`
  缓存，**不缓存跨 locale 的结果字符串**。

## 5. 迁移表

| 迁移前 | 迁移后 | 破坏性 |
| --- | --- | --- |
| `YueConfig.messages.clear` | key `input.clear` + locale 实例 | 是：`messages` 从 `YueConfig` 移除 |
| `DEFAULT_YUE_MESSAGES`（hooks 导出） | 语言包 `packages/vue/src/locale/en-US.ts` | 是：默认值改由语言包提供 |
| `app.use(YueUI, { messages: { clear: 'Clear' } })` | `app.use(YueUI, { locale: 'en-US' })` + `YueLocaleProvider` / `provideLocale({ messages })` | 是 |
| `provideYueConfig({ messages })` | `provideLocale({ messages })` | 是 |
| `YueMessages` 类型（hooks 与 vue 各一份） | `YueLocaleMessages`（catalog 推导）+ `YueMessageKey` | 是 |
| `YueConfig.size` | 不变 | 否 |
| `packages/vue/src/shared/messages.ts` | 删除（由 catalog 取代） | 是 |

保留期：**不留双 API**。仓库处于开发期，未发布；同时支持两套只会让两套都缺测试。
`YueConfig.size` 的继承语义有专门的回归测试，迁移不得影响它。

## 6. 文档站决策

| 决策 | 值 |
| --- | --- |
| 结构 | 中文在根路径，英文镜像在 `/en/`，相对路径一一对应 |
| `lang` | 根 `zh-CN`，`/en/` `en-US`（由 VitePress locale 配置写进 `html[lang]`） |
| nav / sidebar / 搜索 | 每个 locale 一份完整配置，不共享中文数组 |
| 语言切换 | VitePress 内建 locale 菜单（配置 `langMenuLabel`）：保留相对路径与 `hash`，`verify:visual` 断言路径、hash 与 `lang` 都跟着变 |
| 文档 UI 文案 | `apps/docs/.vitepress/theme/docs-locale.ts`，按 `useData().lang` 取值，模板里不硬编码 |
| 组件示例 locale | 页面语言决定示例的 Yue locale（`zh-CN` ↔ `en-US`），由文档站统一 provide |
| 搜索 | VitePress 本地搜索，按 locale 独立索引与占位符文案 |
| canonical / hreflang | `transformHead` 按 `SITE_HOSTNAME` 生成；同一页面两种语言互为 alternate，`verify:dist` 逐页断言 |
| sitemap | `sitemap.hostname = SITE_HOSTNAME`，两种语言都收录 |
| 404 | 覆盖主题的 `not-found` 插槽：一个 `404.html` 同时列出两种语言与两个入口（VitePress 只生成一个 404 页，双语比「假装本地化」诚实） |
| 部署重定向 | 不做 `/zh/` 重定向：中文就在根路径。`/en/` 深链接由静态主机的 history fallback 处理 |

当前文档站部署在 Cloudflare Pages（`https://yue-design.pages.dev`）。绑定自定义域名后，
应同步更新 `SITE_HOSTNAME`，再重新构建并运行发布前审计——
一个写死的假域名比「没有 canonical」更容易被发现。

## 7. Adapter 契约

```ts
interface YueLocaleAdapter {
  current: Ref<string>                        // 或 () => string
  fallback?: Ref<string>
  t(key: string, params?: YueMessageParams): string
  n?(value: number, options?: Intl.NumberFormatOptions): string
  d?(value: Date | number, options?: Intl.DateTimeFormatOptions): string
}
```

- adapter 提供 `current` / `t`，`n` / `d` 可省略（省略时用 Yue 自己的 `Intl` 实现）。
- **核心类型不 import 任何第三方类型**；`@yue-ui/vue` 的基础导出里不出现 `vue-i18n` 等名字。
- 首个 adapter 是 `vue-i18n`，且**先作为文档示例与适配器测试落地，不新增发包**
  （`docs/03` 阶段 5：先验证 contract，出现真实消费场景再包）。它住在文档站
  （`apps/docs/.vitepress/theme/adapters/vue-i18n.ts`），由文档页逐字展示，并由
  `tests/i18n/vue-i18n-adapter.test.ts` 与 tarball 消费测试真正跑起来。
- 未实现的 adapter（Intlayer / Paraglide / Tolgee）不出现在文档的「已支持」列表里。

## 8. Key 变更政策

- 新增 key：改 catalog → 所有语言包（`satisfies` 会让漏掉的语言包编译失败）→ metadata →
  至少一个消费者 → 文档；
- 重命名 / 删除：同一次改动里删除所有引用与 metadata，`audit:i18n` 的「无孤儿 key」检查会拦住残留；
- 临时未翻译：在**语言包**里给出与默认值相同的值并在同一行标注 `// untranslated: <原因>`，
  `audit:i18n` 会把它打印为显式豁免（**不当作完成**）；没有标注的副本、以及标注了却已经翻译的行
  都会失败——豁免不会比它的理由活得更久；
- `audit:i18n` 在任何一项失败时以非零退出。

## 9. 风险与取舍

1. **Button 的 loading 没有自有文案。** `aria-busy` 的支持度参差不齐，但给 loading 加一条
   Yue 拥有的文字会造成「同一个按钮在读屏里出现两段话」（组件文案 + 消费者的「提交中」），
   而且这段文字在视觉上是隐藏的、无法被设计评审发现。因此：loading 的**文字**归消费者
   （默认插槽），Yue 只负责状态（`aria-busy` / `is-loading`）。这条决定变更时要同时改
   `apps/docs/components/button/*` 与无障碍说明。
2. **`Symbol.for('yue:locale')` 是全局注册表里的键。** 与 `yue:config` 同理：好处是两个包
   分别打包也能互相匹配；代价是同一页面里若有两个不相关的库用同名键会冲突。前缀已足够特定。
3. **默认语言是 `en-US`。** 现有文档与示例是中文，读者可能预期中文默认。选择英文默认是为了
   让「没有配置」有一个中立且可预期的结果；中文应用显式声明 `zh-CN`（文档示例都这么做）。
4. **双语文档的两套内容会漂移。** 缓解措施是 `audit:docs:i18n`（页面镜像、标题结构、
   代码块数量、组件标签与属性、内部链接与锚点）与「英文页不得出现中文」的检查；
   但**翻译质量**本身不是自动门禁能保证的，仍需人工抽查。
5. **RTL 目前没有真实消费方。** 运行时提供 `direction`（由 locale 元数据推导）与逻辑属性的
   CSS，浏览器门禁验证的是「逻辑属性 + `dir` 透传」，而不是一套完整的阿拉伯语页面。
   在出现 RTL 语言包之前，不声称 RTL 已完成。
6. **包体积**：根入口带 `en-US`（默认语言包必须可用），`zh-CN` 是独立子路径。
   `verify:treeshaking` 断言根入口不带 `zh-CN` 的字符串、语言包子路径不带组件代码。
