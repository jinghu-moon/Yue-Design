# 图标

## Yue 不内置图标库

Yue **不提供图标库、图标字体、默认 SVG 集合或外部 CDN**，也不把 Tabler、Material Icons 等作为运行时依赖。这是有意的边界：应用可以选择自己的图标资产和许可证，Yue 只规范图标在组件中的承载方式。

## 组件契约

以 Button 为例，图标通过插槽传入：

```vue
<YueButton>
  <template #leading><SaveIcon aria-hidden="true" /></template>
  保存
</YueButton>
```

- `leading` 和 `trailing` 插槽分别位于 `.yue-button__icon--leading` / `.yue-button__icon--trailing`。
- 尺寸由 `--button-icon-size-sm|md|lg` 统一控制，图标本身应使用 `width: 100%; height: 100%`。
- SVG 默认继承 `currentColor`，不在图标文件中写死主题色。
- 装饰性图标设置 `aria-hidden="true"`；表达信息的图标必须有相邻文字或可访问名称。
- `shape="circle"` 是图标按钮，必须提供 `aria-label` 或 `aria-labelledby`。开发模式会对无名称实例发出警告。

## 选择图标时

优先选择含义明确、笔画一致、在 `sm/md/lg` 尺寸下仍可辨识的图标。不要用图标替代必须阅读的文字，也不要通过引入远程字体来绕过资源管理和无障碍检查。
