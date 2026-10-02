# 组件

::: warning 当前状态：尚无组件
`@snapclip/vue` 的构建管线、包导出（`@snapclip/vue` 与 `@snapclip/vue/style.css`）与类型声明生成已经就绪，但组件本身还没有开始迁移。这一页会在 `DsButton` 落地后填入真实内容。
:::

## 为什么先做垂直切片

原型的 HTML 里有按钮、表单、标签、列表、状态、浮层、盒子等一批组件。一次性把它们全部改写成 Vue，会得到一个无法回退的大改动，而且在此之前无法验证「打包后能否被外部项目消费」这件事。

所以顺序是：**先让一个组件走完从组件源码到文档页、到 tarball 消费的完整链路**，再横向复制。

## 第一个组件：DsButton

目标 API：

```vue
<DsButton theme="primary" variant="solid" size="md" :loading="false">
  保存
</DsButton>
```

| Prop | 取值 | 默认 |
| --- | --- | --- |
| `theme` | `default` \| `primary` \| `danger` \| `success` | `default` |
| `variant` | `solid` \| `outline` \| `ghost` \| `link` | `solid` |
| `size` | `sm` \| `md` \| `lg` | `md` |
| `shape` | `square` \| `round` \| `circle` | `square` |
| `disabled` | `boolean` | `false` |
| `loading` | `boolean` | `false` |
| `block` | `boolean` | `false` |

图标通过插槽传入，不绑定任何图标库：

```vue
<DsButton>
  <template #leading><IconSearch /></template>
  搜索
</DsButton>
```

约定：

- 类名使用 BEM（`.ds-button`、`.ds-button--primary`、`.ds-button__leading`）
- 只消费 Component Token（`--button-*`），不直接写原始色板
- **不使用 `scoped`** —— 样式全局生效，外部才能覆写与主题化
- 组件样式发布在 `@snapclip/vue/style.css`，不打包 Token 包

## 这份文档的硬性要求

组件页必须**引用真实的 `@snapclip/vue` 组件**，而不是继续手写 HTML 示例。示例代码与页面渲染的必须是同一个组件、同一份样式，否则文档会先于实现漂移。
