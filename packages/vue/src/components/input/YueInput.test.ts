import { mount } from '@vue/test-utils'
import type { MountingOptions } from '@vue/test-utils'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import { yueConfigKey } from '@yue-ui/hooks'
import { createYueLocale, YueLocaleProvider, yueLocaleKey } from '../../locale'
import type { YueInputProps, YueInputSize } from './types'
import YueInput from './YueInput.vue'

/**
 * Load the stylesheet this component ships with.
 *
 * Not `import ... from './style.css?raw'`: Vitest stubs CSS imports (including the
 * `?raw` query) to an empty string, so every assertion below would pass vacuously
 * against `''`. Not `new URL('./style.css', import.meta.url)` either, because under
 * happy-dom `import.meta.url` is not a `file:` URL.
 *
 * The candidates cover running from the workspace root and from the package directory;
 * anything else throws rather than reading `''`.
 */
function readStylesheet(): string {
  for (const candidate of [
    resolve(process.cwd(), 'packages/vue/src/components/input/style.css'),
    resolve(process.cwd(), 'src/components/input/style.css'),
  ]) {
    if (existsSync(candidate)) return readFileSync(candidate, 'utf8')
  }
  throw new Error(`could not locate the Input stylesheet from ${process.cwd()}`)
}

/**
 * Deliberately a type alias, not an `interface`.
 *
 * `mount`'s option type carries a string index signature, and TypeScript only gives an
 * *implicit* index signature to object-literal types — interfaces do not get one, so the
 * same shape declared with `interface` is rejected. The Button test sidesteps this by
 * spreading into a fresh object literal; an alias is the version that keeps the helper
 * explicit.
 */
type MountInputOptions = {
  props?: YueInputProps
  attrs?: Record<string, unknown>
  slots?: Record<string, () => unknown>
  global?: MountingOptions<YueInputProps>['global']
}

function mountInput(options: MountInputOptions = {}) {
  return mount(YueInput, options)
}

/**
 * Slot content as render functions rather than HTML strings.
 *
 * YueInput declares its slots with defineSlots, so @vue/test-utils type-checks
 * them and a raw string is rejected — a string slot would also be rendered as text
 * rather than markup. Using h() keeps the tests type-safe and asserts against real
 * elements, which is what the assertions below actually inspect.
 */
const prefixSlot = () => h('span', { class: 'unit' }, '¥')
const suffixSlot = () => h('span', { class: 'unit' }, 'kg')

/** Provide the real (Symbol-keyed) configuration to a subtree. */
function withConfig(size: YueInputSize) {
  return { provide: { [yueConfigKey]: { size } } }
}

/**
 * Provide a locale instance to a subtree.
 *
 * The real injection key with a real instance, not a stub object: the component reads
 * `t()` from it, so a fake would assert the fake.
 */
function withLocale(options: Parameters<typeof createYueLocale>[0] = {}) {
  return { provide: { [yueLocaleKey]: createYueLocale(options) } }
}

/** The native control, which is where every form and a11y semantic has to live. */
const native = (wrapper: ReturnType<typeof mountInput>) => wrapper.find('input')

afterEach(() => {
  vi.restoreAllMocks()
})

describe('YueInput', () => {
  describe('default rendering', () => {
    it('renders a wrapper around a real native <input>', () => {
      const wrapper = mountInput()

      expect(wrapper.element.tagName).toBe('DIV')
      expect(wrapper.classes().sort()).toEqual(['yue-input', 'yue-input--md'])
      // The roadmap's one hard rule: never a div pretending to be a control.
      expect(wrapper.find('input').exists()).toBe(true)
      expect(native(wrapper).classes()).toEqual(['yue-input__native'])
    })

    it('defaults to type="text" and forwards the documented types', () => {
      expect(native(mountInput()).attributes('type')).toBe('text')
      for (const type of ['search', 'email', 'url', 'tel', 'password'] as const) {
        expect(native(mountInput({ props: { type } })).attributes('type')).toBe(type)
      }
    })

    it('renders no affix or clear markup when nothing asks for it', () => {
      const wrapper = mountInput()
      expect(wrapper.find('.yue-input__prefix').exists()).toBe(false)
      expect(wrapper.find('.yue-input__suffix').exists()).toBe(false)
      expect(wrapper.find('.yue-input__clear').exists()).toBe(false)
    })

    it('binds the value from modelValue', () => {
      const wrapper = mountInput({ props: { modelValue: 'yue' } })
      expect(native(wrapper).element).toHaveProperty('value', 'yue')
    })
  })

  describe('the size prop', () => {
    it('accepts the shared control-size contract', () => {
      for (const size of ['sm', 'md', 'lg'] as const) {
        expect(mountInput({ props: { size } }).classes()).toContain(`yue-input--${size}`)
      }
    })

    it('falls back to the application-level config, and the prop wins over it', () => {
      expect(mountInput({ global: withConfig('lg') }).classes()).toContain('yue-input--lg')
      expect(
        mountInput({ props: { size: 'sm' }, global: withConfig('lg') }).classes(),
      ).toContain('yue-input--sm')
    })
  })

  describe('attribute routing', () => {
    it('sends native input attributes to the control, not the wrapper', () => {
      const wrapper = mountInput({
        attrs: {
          id: 'email',
          name: 'email',
          autocomplete: 'email',
          inputmode: 'email',
          required: true,
          maxlength: 64,
          minlength: 3,
          pattern: '.+@.+',
          'aria-describedby': 'email-hint',
          'aria-label': '邮箱',
        },
      })

      const control = native(wrapper)
      expect(control.attributes('id')).toBe('email')
      expect(control.attributes('name')).toBe('email')
      expect(control.attributes('autocomplete')).toBe('email')
      expect(control.attributes('inputmode')).toBe('email')
      expect(control.attributes('required')).toBeDefined()
      expect(control.attributes('maxlength')).toBe('64')
      expect(control.attributes('minlength')).toBe('3')
      expect(control.attributes('pattern')).toBe('.+@.+')
      // `label for` and `aria-describedby` only work if the id and the references are on
      // the control; on a `<div>` they would silently do nothing.
      expect(control.attributes('aria-describedby')).toBe('email-hint')
      expect(control.attributes('aria-label')).toBe('邮箱')
      expect(wrapper.attributes('id')).toBeUndefined()
      expect(wrapper.attributes('name')).toBeUndefined()
    })

    it('sends class, style and data-* to the wrapper, which is the component root', () => {
      const wrapper = mountInput({
        attrs: { class: 'field', style: 'width: 12rem', 'data-testid': 'email-field' },
      })

      expect(wrapper.classes()).toContain('field')
      expect(wrapper.attributes('style')).toContain('width: 12rem')
      expect(wrapper.attributes('data-testid')).toBe('email-field')
      // The control keeps its own class and gets none of the consumer's.
      expect(native(wrapper).classes()).toEqual(['yue-input__native'])
      expect(native(wrapper).attributes('data-testid')).toBeUndefined()
    })

    it('emits no empty style attribute when the consumer passes none', () => {
      // An `:style="undefined"` binding still renders `style=""` in some Vue versions,
      // and an empty style attribute is a real thing for consumers to have to override.
      expect(mountInput().attributes('style')).toBeUndefined()
    })

    it('routes dir to the wrapper, so the whole field mirrors and not just the text', () => {
      const wrapper = mountInput({
        attrs: { dir: 'rtl' },
        slots: { prefix: prefixSlot, suffix: suffixSlot },
      })

      // The wrapper is what lays out the affix row, so direction belongs there. Left on
      // the control, the text inside the field would mirror while the prefix/suffix row
      // stayed in visual order — a field that is half-RTL.
      expect(wrapper.attributes('dir')).toBe('rtl')
      expect(native(wrapper).attributes('dir')).toBeUndefined()
    })

    it('leaves lang on the control, because it is about the text rather than the layout', () => {
      const wrapper = mountInput({ attrs: { lang: 'zh-CN' } })
      expect(native(wrapper).attributes('lang')).toBe('zh-CN')
      expect(wrapper.attributes('lang')).toBeUndefined()
    })

    it('keeps the wrapper out of the accessibility tree as a control', () => {
      const wrapper = mountInput()
      // No role, no tabindex, no value: anything else would give AT a second, fake
      // control to announce next to the real one.
      expect(wrapper.attributes('role')).toBeUndefined()
      expect(wrapper.attributes('tabindex')).toBeUndefined()
    })
  })

  describe('v-model', () => {
    it('emits update:modelValue and input when the user types', async () => {
      const wrapper = mountInput()
      const control = native(wrapper)

      control.element.value = 'hello'
      await control.trigger('input')

      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['hello'])
      expect(wrapper.emitted('input')).toHaveLength(1)
    })

    it('carries the string, never a coerced number', async () => {
      const wrapper = mountInput()
      const control = native(wrapper)

      control.element.value = '42'
      await control.trigger('input')

      const [value] = wrapper.emitted('update:modelValue')?.[0] ?? []
      expect(value).toBe('42')
      expect(typeof value).toBe('string')
    })

    it('follows a programmatic modelValue change', async () => {
      const wrapper = mountInput({ props: { modelValue: 'a' } })
      await wrapper.setProps({ modelValue: 'b' })
      expect(native(wrapper).element).toHaveProperty('value', 'b')
    })

    it('does not commit a value the IME is still composing', async () => {
      const wrapper = mountInput()
      const control = native(wrapper)

      await control.trigger('compositionstart')
      // An `input` event fired mid-composition carries a half-finished value. Committing
      // it would make the parent re-render the field and can drop the candidate the user
      // was choosing.
      control.element.value = 'zhong'
      await control.trigger('input')
      expect(wrapper.emitted('update:modelValue')).toBeUndefined()

      control.element.value = '中文'
      await control.trigger('compositionend')
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['中文'])
    })

    it('commits normally again after a composition ends', async () => {
      const wrapper = mountInput()
      const control = native(wrapper)

      await control.trigger('compositionstart')
      await control.trigger('compositionend')
      control.element.value = 'after'
      await control.trigger('input')

      // The first commit is the (empty) composition end; the typing that follows must
      // still reach the consumer.
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['after'])
    })

    describe('the real event sequences', () => {
      /**
       * Drive a full IME composition in the order the given engine uses.
       *
       * `trailingInput` is the difference that matters: Chrome and Safari fire
       * `compositionend` and then an `input` with the final value; Firefox fires the final
       * `input` while the composition is still open and then `compositionend`.
       */
      async function compose(wrapper: ReturnType<typeof mountInput>, order: 'chromium' | 'firefox') {
        const control = native(wrapper)
        await control.trigger('compositionstart')
        control.element.value = 'zhong'
        await control.trigger('input')

        control.element.value = '中文'
        if (order === 'firefox') {
          // The final value arrives while still composing — the component must not reject
          // it, and `compositionend` is then the only remaining chance to publish it.
          await control.trigger('input')
          await control.trigger('compositionend')
        } else {
          await control.trigger('compositionend')
          // The engine's own trailing `input`, carrying the value that was just published.
          await control.trigger('input')
        }
        return control
      }

      it('emits exactly once for one composition in Chrome and Safari', async () => {
        const wrapper = mountInput()
        const control = await compose(wrapper, 'chromium')

        // The defect this covers: committing on `compositionend` *and* on the trailing
        // `input` published the same value twice.
        expect(wrapper.emitted('update:modelValue')).toEqual([['中文']])
        expect(wrapper.emitted('input')).toHaveLength(1)
        expect(control.element.value).toBe('中文')
      })

      it('emits exactly once for one composition in Firefox', async () => {
        const wrapper = mountInput()
        await compose(wrapper, 'firefox')

        // The other failure mode: an implementation that only commits on the trailing
        // `input` would publish nothing here, because that event arrived mid-composition.
        expect(wrapper.emitted('update:modelValue')).toEqual([['中文']])
        expect(wrapper.emitted('input')).toHaveLength(1)
      })

      it('reports the published value with an `input` event, never a composition event', () => {
        // The contract in `types.ts` and the API page: the DOM events are re-emitted
        // unchanged, so an `@input` handler may switch on `event.type`. Both orders publish
        // through `compositionend` in some engine, and forwarding that event verbatim gave
        // handlers a payload of type `compositionend`.
        return (async () => {
          for (const order of ['chromium', 'firefox'] as const) {
            const wrapper = mountInput()
            await compose(wrapper, order)

            const [event] = (wrapper.emitted('input')?.[0] ?? []) as [Event]
            expect(event.type, `${order}: the payload was a ${event.type} event`).toBe('input')
            // And it is the browser's own event, so `data` / `inputType` / `target` are real
            // rather than fabricated.
            expect((event.target as HTMLInputElement).value).toBe('中文')
          }
        })()
      })

      it('reuses the browser event that carried the final value', async () => {
        // The Firefox / CDP order: the final `input` arrives while the composition is still
        // open, so the payload can be the browser's own event — `data` and `inputType` and
        // all — rather than something the component made up.
        const wrapper = mountInput()
        const control = native(wrapper)

        await control.trigger('compositionstart')
        control.element.value = 'zhong'
        control.element.dispatchEvent(new Event('input', { bubbles: true }))
        control.element.value = '中文'
        const finalEvent = new Event('input', { bubbles: true })
        control.element.dispatchEvent(finalEvent)
        await control.trigger('compositionend')

        expect(wrapper.emitted('input')?.[0]?.[0]).toBe(finalEvent)
      })

      it('never forwards a mid-composition event that describes an earlier value', async () => {
        // The Chrome / Safari order, and the defect this pins: the last event cached before
        // `compositionend` still carries the *intermediate* text, so reusing it would hand a
        // consumer `data: 'zhong'` for a publication of `'中文'`.
        const wrapper = mountInput()
        const control = native(wrapper)

        await control.trigger('compositionstart')
        control.element.value = 'zhong'
        const intermediate = new Event('input', { bubbles: true })
        control.element.dispatchEvent(intermediate)
        control.element.value = '中文'
        await control.trigger('compositionend')

        const payload = wrapper.emitted('input')?.[0]?.[0] as Event
        expect(payload).not.toBe(intermediate)
        expect(payload.type).toBe('input')
      })

      it('dispatches the synthesised payload, so it has a real target', async () => {
        // A hand-built event that is never dispatched has `target === null`, which would
        // break the documented `event.target.value` for exactly the case it exists to serve.
        const wrapper = mountInput()
        const control = native(wrapper)

        await control.trigger('compositionstart')
        control.element.value = 'zhong'
        control.element.dispatchEvent(new Event('input', { bubbles: true }))
        control.element.value = '中文'
        await control.trigger('compositionend')

        const payload = wrapper.emitted('input')?.[0]?.[0] as Event
        expect(payload.target).toBe(control.element)
        expect((payload.target as HTMLInputElement).value).toBe('中文')
      })

      it('synthesises an `input` event when the engine sent none', async () => {
        // A composition that produces no `input` event at all still has to report its value
        // as an `input` event — borrowing a stale one from earlier typing would be worse, so
        // this one is constructed.
        const wrapper = mountInput()
        const control = native(wrapper)

        await control.trigger('input')
        control.element.value = 'typed'
        await control.trigger('input')

        await control.trigger('compositionstart')
        control.element.value = 'composed'
        await control.trigger('compositionend')

        const payloads = wrapper.emitted('input') as Array<[Event]>
        expect(payloads.at(-1)?.[0].type).toBe('input')
        // Not the earlier real event, which carried a different value.
        expect(payloads.at(-1)?.[0]).not.toBe(payloads[0][0])
      })

      it('does not re-emit when an engine delivers the same value a third time', async () => {
        const wrapper = mountInput()
        const control = await compose(wrapper, 'chromium')

        // Nothing changed, so there is nothing to publish — regardless of how many times
        // an engine repeats the event.
        await control.trigger('input')
        await control.trigger('change')
        expect(wrapper.emitted('update:modelValue')).toEqual([['中文']])
      })

      it('still emits after the composition when the value really changes', async () => {
        const wrapper = mountInput()
        const control = await compose(wrapper, 'chromium')

        control.element.value = '中文输入'
        await control.trigger('input')

        expect(wrapper.emitted('update:modelValue')).toEqual([['中文'], ['中文输入']])
      })
    })
  })

  describe('the event contract', () => {
    it('re-emits change, focus and blur unchanged', async () => {
      const wrapper = mountInput()
      const control = native(wrapper)

      await control.trigger('change')
      await control.trigger('focus')
      await control.trigger('blur')

      expect(wrapper.emitted('change')).toHaveLength(1)
      expect(wrapper.emitted('focus')).toHaveLength(1)
      expect(wrapper.emitted('blur')).toHaveLength(1)
      // The handler forwards the DOM event itself, so `event.target` still works.
      const [event] = wrapper.emitted('change')?.[0] as [Event]
      expect(event.target).toBe(control.element)
    })

    it('declares its events so they do not also fall through as native listeners', () => {
      const wrapper = mountInput()
      // A declared emit is removed from `$attrs`; if `change` were undeclared it would be
      // attached to the control *and* re-emitted, and consumers would see it twice.
      expect(native(wrapper).attributes('onChange')).toBeUndefined()
    })
  })

  describe('disabled and readonly', () => {
    it('uses the native disabled attribute and the disabled state class', () => {
      const wrapper = mountInput({ props: { disabled: true } })

      expect(native(wrapper).attributes('disabled')).toBeDefined()
      expect(wrapper.classes()).toContain('is-disabled')
    })

    it('uses the native readonly attribute and never disabled for readonly', () => {
      const wrapper = mountInput({ props: { readonly: true } })

      expect(native(wrapper).attributes('readonly')).toBeDefined()
      // The distinction is the whole point of having both: a readonly field is still
      // focusable, still selectable and still submitted, so it must not be disabled.
      expect(native(wrapper).attributes('disabled')).toBeUndefined()
      expect(wrapper.classes()).toContain('is-readonly')
      expect(wrapper.classes()).not.toContain('is-disabled')
    })

    it('keeps disabled and readonly visually distinct, not just semantically', () => {
      const stylesheet = readStylesheet()
      const rule = (selector: string) => {
        const index = stylesheet.indexOf(selector)
        return index === -1 ? '' : stylesheet.slice(index, stylesheet.indexOf('}', index))
      }
      expect(rule('.yue-input.is-readonly {')).toContain('--input-background-readonly')
      expect(rule('.yue-input.is-readonly {')).not.toContain('--input-color-disabled')
      expect(rule('.yue-input.is-disabled {')).toContain('--input-color-disabled')
      expect(rule('.yue-input.is-disabled {')).toContain('--input-background-disabled')
    })

    it('reports both states to assistive technology without inventing a role', () => {
      const disabled = mountInput({ props: { disabled: true } })
      const readonly = mountInput({ props: { readonly: true } })
      // Native attributes are the signal; a redundant `aria-disabled` would be a second
      // source of truth that can contradict the platform.
      expect(native(disabled).attributes('aria-disabled')).toBeUndefined()
      expect(native(readonly).attributes('aria-readonly')).toBeUndefined()
    })
  })

  describe('invalid', () => {
    it('sets aria-invalid and the error state class', () => {
      const wrapper = mountInput({ props: { invalid: true } })
      expect(native(wrapper).attributes('aria-invalid')).toBe('true')
      expect(wrapper.classes()).toContain('is-invalid')
    })

    it('omits aria-invalid entirely when the field is valid', () => {
      // `aria-invalid="false"` is not the same as absent for every screen reader, so the
      // attribute is removed rather than set to false.
      expect(native(mountInput()).attributes('aria-invalid')).toBeUndefined()
    })

    it('does not render an error message of its own', () => {
      const wrapper = mountInput({ props: { invalid: true } })
      // Explaining *what* is wrong belongs to YueField; two sources of error text would
      // be two things to keep in sync.
      expect(wrapper.text()).toBe('')
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    })

    it('keeps the error border under focus, so focus cannot hide the error', () => {
      const stylesheet = readStylesheet()
      const focusRule = stylesheet.slice(stylesheet.indexOf('.yue-input:not(.is-invalid):focus-within'))
      // The focus rule must exclude invalid fields, or focusing a bad field would
      // recolour its border and erase the only visual error signal.
      expect(focusRule.slice(0, 200)).toContain('.yue-input:not(.is-invalid):focus-within')
      expect(stylesheet).toContain('.yue-input.is-invalid {')
      expect(stylesheet.slice(stylesheet.indexOf('.yue-input.is-invalid {'))).toContain(
        '--input-border-color-invalid',
      )
    })

    it('still shows a focus ring while invalid', () => {
      const stylesheet = readStylesheet()
      const ringIndex = stylesheet.indexOf('outline: var(--input-focus-ring-width)')
      expect(ringIndex).toBeGreaterThan(-1)
      // The ring rule is not scoped to `:not(.is-invalid)` — an invalid field that is
      // focused still needs a visible, non-colour focus cue.
      const ringSelector = stylesheet.slice(
        stylesheet.lastIndexOf('.yue-input', ringIndex),
        ringIndex,
      )
      expect(ringSelector).toContain(':focus-visible')
      expect(ringSelector).not.toContain('is-invalid')
    })
  })

  describe('prefix and suffix slots', () => {
    it('renders an affix span only when the slot is provided', () => {
      const withPrefix = mountInput({ slots: { prefix: prefixSlot } })
      expect(withPrefix.find('.yue-input__prefix').exists()).toBe(true)
      expect(withPrefix.find('.yue-input__prefix').text()).toBe('¥')
      expect(withPrefix.find('.yue-input__suffix').exists()).toBe(false)

      const withSuffix = mountInput({ slots: { suffix: suffixSlot } })
      expect(withSuffix.find('.yue-input__suffix').text()).toBe('kg')
      expect(withSuffix.find('.yue-input__prefix').exists()).toBe(false)
    })

    it('leaves the value, the selection and the keyboard to the control', async () => {
      const wrapper = mountInput({
        props: { modelValue: '7' },
        slots: { prefix: prefixSlot, suffix: suffixSlot },
      })

      // Slots are decoration: they add no focusable element and no second value.
      expect(wrapper.findAll('input')).toHaveLength(1)
      expect(wrapper.findAll('[tabindex]')).toHaveLength(0)
      const control = native(wrapper)
      expect(control.element.value).toBe('7')
      expect(control.attributes('readonly')).toBeUndefined()

      control.element.value = '8'
      await control.trigger('input')
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['8'])
    })

    it('nests no interactive control inside an affix span', () => {
      // The roadmap forbids an affix span that *looks* like decoration but holds a
      // control: it would put a tab stop outside the control's own contract. The clear
      // button is therefore a sibling, and this asserts the structure rather than
      // trusting it.
      const wrapper = mountInput({
        props: { clearable: true, modelValue: 'x' },
        slots: { prefix: prefixSlot, suffix: suffixSlot },
      })

      expect(wrapper.find('.yue-input__prefix button').exists()).toBe(false)
      expect(wrapper.find('.yue-input__suffix button').exists()).toBe(false)
      expect(wrapper.element.children[1]?.tagName).toBe('INPUT')
      expect(wrapper.find('.yue-input__clear').element.tagName).toBe('BUTTON')
    })

    it('sizes affix content from tokens rather than from the consumer', () => {
      const stylesheet = readStylesheet()
      const rule = stylesheet.slice(stylesheet.indexOf('.yue-input__prefix > svg'))
      expect(rule.slice(0, 160)).toContain('--_icon-size')
    })
  })

  describe('clearable', () => {
    it('renders a real button, typed and labelled', () => {
      const wrapper = mountInput({ props: { clearable: true, modelValue: 'yue' } })
      const clear = wrapper.find('.yue-input__clear')

      expect(clear.element.tagName).toBe('BUTTON')
      // `type="button"` matters: inside a `<form>` the default `type="submit"` would make
      // clearing the field submit it.
      expect(clear.attributes('type')).toBe('button')
      // No provider anywhere in this test: the shipped default language pack answers, which
      // is the "a component used on its own renders real words" contract.
      expect(clear.attributes('aria-label')).toBe('Clear')
    })

    it('takes its accessible name from the locale catalog', () => {
      const wrapper = mountInput({
        props: { clearable: true, modelValue: 'yue' },
        global: withLocale({ locale: 'zh-CN', packs: { 'zh-CN': { input: { clear: '清空' } } } }),
      })
      expect(wrapper.find('.yue-input__clear').attributes('aria-label')).toBe('清空')
    })

    it('takes the language of the nearest provider', () => {
      // The integration the docs rely on: a provider scopes the language, the field reads it,
      // and nothing about the field's own props changes.
      const wrapper = mount({
        render: () =>
          h(
            YueLocaleProvider,
            { locale: 'zh-CN', packs: { 'zh-CN': { input: { clear: '清空' } } } },
            { default: () => h(YueInput, { clearable: true, modelValue: 'yue' }) },
          ),
      })
      expect(wrapper.find('.yue-input__clear').attributes('aria-label')).toBe('清空')
      expect(wrapper.find('.yue-input').exists()).toBe(true)
    })

    it('updates an already-mounted field when its locale instance switches', async () => {
      const locale = createYueLocale({
        locale: 'en-US',
        packs: { 'zh-CN': { input: { clear: '清空' } } },
      })
      const wrapper = mountInput({
        props: { clearable: true, modelValue: 'yue' },
        global: { provide: { [yueLocaleKey]: locale } },
      })
      expect(wrapper.find('.yue-input__clear').attributes('aria-label')).toBe('Clear')

      locale.current.value = 'zh-CN'
      await nextTick()
      expect(wrapper.find('.yue-input__clear').attributes('aria-label')).toBe('清空')
    })

    it('has no prop of its own for that string', () => {
      // The deviation this replaces: a per-component `clearLabel` prop serves one
      // component, must be repeated at every call site, and turns a translation into a
      // markup change. `clearLabel` must not come back as a prop.
      const props = Object.keys(
        (YueInput as unknown as { props?: Record<string, unknown> }).props ?? {},
      )
      expect(props).toContain('clearable')
      expect(props).not.toContain('clearLabel')
      expect(props).not.toContain('messages')
    })

    it('keeps the shipped default when no locale was provided', () => {
      const wrapper = mountInput({ props: { clearable: true, modelValue: 'yue' } })
      expect(wrapper.find('.yue-input__clear').attributes('aria-label')).toBe(
        createYueLocale().t('input.clear'),
      )
    })

    it('is absent when the field is disabled, readonly or empty', () => {
      const render = (props: YueInputProps) => mountInput({ props }).find('.yue-input__clear').exists()
      expect(render({ clearable: true, modelValue: 'x', disabled: true })).toBe(false)
      expect(render({ clearable: true, modelValue: 'x', readonly: true })).toBe(false)
      expect(render({ clearable: true, modelValue: '' })).toBe(false)
      expect(render({ modelValue: 'x' })).toBe(false)
      expect(render({ clearable: true, modelValue: 'x' })).toBe(true)
    })

    it('emits update:modelValue and clear, and empties the control', async () => {
      const wrapper = mountInput({ props: { clearable: true, modelValue: 'yue' } })

      await wrapper.find('.yue-input__clear').trigger('click')

      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([''])
      expect(wrapper.emitted('clear')).toHaveLength(1)
      expect(native(wrapper).element.value).toBe('')
    })

    it('hides itself even when the parent ignores update:modelValue', async () => {
      // The two-way-binding-free case, which is what exposed the mixed model: the button's
      // visibility and the DOM have to read the same value, or clearing an unresponsive
      // field leaves an active "clear" button over an empty input.
      const wrapper = mountInput({ props: { clearable: true, modelValue: 'yue' } })
      expect(wrapper.find('.yue-input__clear').exists()).toBe(true)

      await wrapper.find('.yue-input__clear').trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:modelValue')).toEqual([['']])
      expect(wrapper.find('.yue-input__clear').exists()).toBe(false)
      expect(native(wrapper).element.value).toBe('')
    })

    it('does not let a parent re-render put the cleared value back', async () => {
      // `setProps` with the same (stale) value is exactly what an unresponsive parent does
      // on its next render. The field must stay empty rather than resurrect 'yue'.
      const wrapper = mountInput({ props: { clearable: true, modelValue: 'yue' } })
      await wrapper.find('.yue-input__clear').trigger('click')

      await wrapper.setProps({ modelValue: 'yue' })
      await wrapper.vm.$nextTick()

      expect(native(wrapper).element.value).toBe('')
      expect(wrapper.find('.yue-input__clear').exists()).toBe(false)
    })

    it('still adopts a value the parent really changes', async () => {
      // The other half of the contract: an external change must reach the field, or the
      // internal value would have made the component uncontrolled.
      const wrapper = mountInput({ props: { modelValue: 'a' } })
      await wrapper.setProps({ modelValue: 'b' })
      expect(native(wrapper).element.value).toBe('b')

      await wrapper.setProps({ modelValue: '' })
      expect(native(wrapper).element.value).toBe('')
    })

    it('keeps the composed text when the parent re-renders mid-composition', async () => {
      // A real IME fires `input` while composing, so this is the sequence that matters: the
      // component mirrors the text without publishing it, and a parent render must not put
      // its own value back into the control.
      //
      // This is not cosmetic. Vue re-applies a dynamic `value` prop on *every* patch rather
      // than only when the bound value changed, so the mirror is what makes the patch a
      // no-op instead of a clobber — Vue's own `v-model` solves the same problem by skipping
      // its DOM write in `beforeUpdate` while composing.
      const wrapper = mountInput({ props: { modelValue: 'a' } })
      const control = native(wrapper)

      await control.trigger('compositionstart')
      control.element.value = 'zhong'
      await control.trigger('input')
      expect(wrapper.emitted('update:modelValue')).toBeUndefined()

      await wrapper.setProps({ modelValue: 'external' })
      await wrapper.vm.$nextTick()
      expect(control.element.value).toBe('zhong')

      // And the composition still publishes its own value, not the one that arrived while
      // it was open: the user's in-progress text wins, as it does in Vue's own model.
      await control.trigger('compositionend')
      expect(wrapper.emitted('update:modelValue')).toEqual([['zhong']])
    })

    it('does not emit a synthetic input event', async () => {
      const wrapper = mountInput({ props: { clearable: true, modelValue: 'yue' } })
      await wrapper.find('.yue-input__clear').trigger('click')
      // The roadmap names exactly two events for clearing; a third would be an
      // undocumented signal that consumers would have to guess about.
      expect(wrapper.emitted('input')).toBeUndefined()
    })

    it('sends focus back to the control instead of leaving it on the button', async () => {
      const wrapper = mountInput({ props: { clearable: true, modelValue: 'yue' } })
      const control = native(wrapper)
      // Spied rather than asserted through `document.activeElement`: `mount` without
      // `attachTo` renders into a detached node, where focus() is a no-op and
      // `activeElement` stays `<body>` no matter what the component does. The real
      // browser assertion — that the caret is still in the field after clearing — lives
      // in `tests/visual/verify.mjs`, which is the only place that can make it.
      const focus = vi.spyOn(control.element, 'focus')

      await wrapper.find('.yue-input__clear').trigger('click')

      expect(focus).toHaveBeenCalled()
    })

    it('is the field\'s only clear affordance, and says so rather than claiming otherwise', () => {
      // The decision this pins: `appearance: none` on the native control removes the
      // engine's own decoration, so Chrome's search clear button is gone in *both* the
      // `clearable` and the plain `type="search"` case. An earlier revision carried a rule
      // scoped to `clearable` plus a comment asserting the opposite for plain search, and
      // neither could be reproduced in Chromium.
      const stylesheet = readStylesheet()
      // Comments stripped: the stylesheet explains this decision by *naming* the selector it
      // does not use, and a raw-text scan reads the explanation as the rule.
      const declarations = stylesheet.replace(/\/\*[\s\S]*?\*\//g, '')
      expect(declarations).not.toContain('::-webkit-search-cancel-button')
      // The reset itself is still there, and still unconditional — the wrapper paints the
      // border and fill, so the native decoration cannot be left to the engine.
      const native = declarations.slice(declarations.indexOf('.yue-input__native {'))
      expect(native.slice(0, 900)).toContain('appearance: none')
    })

    it('no longer emits a class whose only consumer was that rule', () => {
      // `is-clearable` existed to scope the suppression. With the rule gone it would be a
      // rendered class no loaded rule matches, which the browser-level class audit in
      // `verify:visual` rejects outright.
      expect(mountInput({ props: { clearable: true } }).classes()).not.toContain('is-clearable')
      expect(mountInput().classes()).not.toContain('is-clearable')
    })

    it('gives the control a hit area larger than the glyph it draws', () => {
      const stylesheet = readStylesheet()
      const rule = stylesheet.slice(stylesheet.indexOf('.yue-input__clear {'))
      expect(rule.slice(0, 400)).toContain('--input-clear-hit-size')
      // Two bars, rotated: no icon font, no SVG asset, and it survives forced-colors
      // because it is painted with `currentColor`.
      expect(stylesheet).toContain('.yue-input__clear::before')
      expect(stylesheet).toContain('rotate(45deg)')
      expect(stylesheet).toContain('rotate(-45deg)')
    })

    it('has its own hover and focus-visible styling', () => {
      const stylesheet = readStylesheet()
      expect(stylesheet).toContain('.yue-input__clear:hover {')
      expect(stylesheet).toContain('.yue-input__clear:focus-visible {')
    })
  })

  describe('clicking the field chrome', () => {
    it('focuses the control when a non-interactive part is clicked', async () => {
      const wrapper = mountInput({ slots: { prefix: prefixSlot } })
      const focus = vi.spyOn(native(wrapper).element, 'focus')

      await wrapper.find('.yue-input__prefix').trigger('mousedown')

      expect(focus).toHaveBeenCalled()
    })

    it('prevents the default of that click, so the affix does not take focus itself', async () => {
      const wrapper = mountInput({ slots: { prefix: prefixSlot } })
      const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true })

      wrapper.find('.yue-input__prefix').element.dispatchEvent(event)

      expect(event.defaultPrevented).toBe(true)
    })

    it('never hijacks a click that landed on the control or on a control-like child', async () => {
      const wrapper = mountInput({ props: { clearable: true, modelValue: 'yue' } })
      const control = native(wrapper)

      // Clicking the input itself must keep native text-selection behaviour.
      const inputEvent = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
      control.element.dispatchEvent(inputEvent)
      expect(inputEvent.defaultPrevented).toBe(false)

      // And a click on the clear button must not be turned into a focus grab.
      const clear = wrapper.find('.yue-input__clear')
      const clearEvent = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
      clear.element.dispatchEvent(clearEvent)
      expect(clearEvent.defaultPrevented).toBe(true)
    })
  })

  describe('the stylesheet contract', () => {
    const stylesheet = readStylesheet()
    const withoutComments = stylesheet.replace(/\/\*[\s\S]*?\*\//g, '')

    /**
     * Classes the component emits that deliberately carry no rule of their own, because
     * the base block already declares their values. Registering them here is what makes
     * the "every class has a rule" check meaningful rather than vacuous.
     */
    const BASE_DEFAULTS = ['yue-input--md']

    it('is not placed in a cascade layer', () => {
      // Unlayered CSS outranks every layer, so a layered component sheet loses to the
      // host's resets. See `packages/vue/src/style.css` for the full argument.
      expect(withoutComments).not.toContain('@layer')
    })

    it('matches every class the component can render', () => {
      // Every class the component can emit, per its documented API.
      const emitted = [
        'yue-input',
        'yue-input--sm',
        'yue-input--md',
        'yue-input--lg',
        'yue-input__native',
        'yue-input__prefix',
        'yue-input__suffix',
        'yue-input__clear',
      ]
      const unstyled = emitted.filter(
        (className) =>
          !BASE_DEFAULTS.includes(className) && !withoutComments.includes(`.${className}`),
      )
      expect(unstyled).toEqual([])
    })

    it('the base block really carries the `md` default', () => {
      // The exemption above is only honest if the base block holds the default values.
      // Matching against a non-empty block is also what stops a namespace change from
      // emptying the sheet and making the check vacuously pass.
      const base = /\.yue-input \{[^}]*\}/.exec(withoutComments)?.[0] ?? ''
      expect(base).not.toBe('')
      expect(base).toContain('--_height: var(--input-height-md)')
      expect(base).toContain('height: var(--_height)')
      expect(base).toContain('border: var(--input-border-width) solid var(--_border-color)')
    })

    it('uses exactly one namespace, on both sides', () => {
      const inStylesheet = new Set(
        [...withoutComments.matchAll(/\.([a-z][a-z0-9]*)-input/g)].map((match) => match[1]),
      )
      const emitted = new Set(
        mountInput({ props: { size: 'lg', clearable: true, modelValue: 'x' } })
          .classes()
          .map((name) => /^([a-z][a-z0-9]*)-input/.exec(name)?.[1])
          .filter((namespace) => namespace !== undefined),
      )

      expect([...inStylesheet]).toEqual(['yue'])
      expect([...emitted]).toEqual(['yue'])
      expect(inStylesheet).toEqual(emitted)
    })

    it('styles every state class it can put on the wrapper', () => {
      for (const state of ['is-disabled', 'is-readonly', 'is-invalid']) {
        expect(withoutComments, `${state} is rendered but never styled`).toContain(`.${state}`)
      }
    })

    it('never suppresses the focus ring without drawing one', () => {
      // The native control's own outline is suppressed because the wrapper draws the
      // ring. Asserting both halves together is what stops the affordance being deleted
      // by a later edit that only removes the outline.
      const suppressions = [...withoutComments.matchAll(/outline:\s*none/g)].length
      expect(suppressions).toBe(1)
      const suppressionIndex = withoutComments.indexOf('outline: none')
      expect(withoutComments.slice(0, suppressionIndex)).toContain('.yue-input__native')
      expect(withoutComments).toContain(':has(.yue-input__native:focus-visible)')
      expect(withoutComments).toContain('outline: var(--input-focus-ring-width) solid')
    })

    it('states its geometry in logical properties, so RTL mirrors without a second sheet', () => {
      // The roadmap lists RTL as a candidate scenario. Nothing here declares `dir`, but a
      // field built from physical properties (`padding-left`, `left`, `text-align: left`)
      // would need an override sheet the moment one appeared, and the override would be
      // the second place every spacing decision lives.
      const physical = [...withoutComments.matchAll(/(?:^|[\s;{])(padding|margin|border)-(left|right)\s*:/g)]
      expect(
        physical.map((match) => match[0].trim()),
        'physical inline properties will not mirror in RTL',
      ).toEqual([])
      expect(withoutComments).not.toMatch(/(?:^|[\s;{])(left|right)\s*:/)
      expect(withoutComments).not.toMatch(/text-align:\s*(left|right)/)
      // And the logical ones really are used, so the assertions above cannot pass by
      // the sheet simply not mentioning direction at all.
      expect(withoutComments).toContain('--input-padding-inline')
      expect(withoutComments).toContain('padding: var(--input-padding-block) var(--_padding-inline)')
      expect(withoutComments).toContain('inset-inline-start: 50%')
    })

    it('does not restate prefers-reduced-motion, because the token already handles it', () => {
      // `--input-duration` resolves to `--motion-duration-interaction`, which the token
      // sheet zeroes under that preference. A second block here would be a second thing
      // to keep in sync, and the visual test asserts the computed duration instead.
      expect(withoutComments).not.toContain('prefers-reduced-motion')
    })

    it('replaces its tokens with system colours in forced-colors', () => {
      const forced = withoutComments.slice(withoutComments.indexOf('@media (forced-colors: active)'))
      expect(forced).toContain('FieldText')
      expect(forced).toContain('GrayText')
      // Hues are unavailable there, so error needs a non-hue channel plus `aria-invalid`.
      expect(forced).toContain('Mark')
    })

    it('reads only --input-* tokens, never a raw colour or another namespace', () => {
      for (const match of withoutComments.matchAll(/var\((--[a-z0-9-]+)/g)) {
        const token = match[1]
        if (token.startsWith('--_')) continue
        expect(token, `${token} is not an --input-* component token`).toMatch(/^--input-/)
      }
      expect(withoutComments).not.toMatch(/#[0-9a-f]{3,8}\b/i)
      expect(withoutComments).not.toMatch(/\brgba?\(/)
    })

    it('moves the size ramp by repointing tokens, not by duplicating declarations', () => {
      for (const size of ['sm', 'lg']) {
        const block = withoutComments.slice(
          withoutComments.indexOf(`.yue-input--${size} {`),
          withoutComments.indexOf('}', withoutComments.indexOf(`.yue-input--${size} {`)),
        )
        for (const slot of ['--_height', '--_padding-inline', '--_font-size', '--_icon-size']) {
          expect(block, `${size} does not repoint ${slot}`).toContain(slot)
        }
      }
    })

    it('transitions only the two properties the state rules change', () => {
      const block = withoutComments.slice(withoutComments.indexOf('transition:'))
      const transition = block.slice(0, block.indexOf(';'))
      // `transition: all` would also animate layout properties, which is how a
      // component library turns a hover into a reflow.
      expect(transition).not.toContain('all')
      expect(transition).toContain('border-color')
      expect(transition).toContain('background-color')
    })
  })
})
