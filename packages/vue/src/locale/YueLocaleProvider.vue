<script setup lang="ts">
import { onMounted, onScopeDispose, watch, watchEffect } from 'vue'
import type { DeepPartial, YueLocaleAdapter, YueLocaleDirection } from '@yue-ui/hooks'
import { provideLocale } from './runtime'
import type { YueLocaleMessages } from './catalog'

/**
 * `YueLocaleProvider` — scopes a locale to a subtree from a template.
 *
 * The same contract as `provideLocale()`, in component form: the base is what the subtree
 * already sees, so a provider that only translates one string keeps the application's
 * language, its packs and every other key.
 *
 * `packs`, `adapter` and `direction` are read once, when the provider is created. A
 * language pack is a module import and a translation engine is an application-level
 * decision; neither is per-render state. `locale`, `fallback` and `messages` are reactive
 * where it matters — switching `locale` re-renders every component below, which is the
 * behaviour the roadmap asks for.
 */
const props = withDefaults(
  defineProps<{
    /** BCP 47 tag. Inherited from the parent scope when omitted. */
    locale?: string
    /** Fallback tag. Inherited from the parent scope when omitted. */
    fallback?: string
    /** Language packs by locale tag — a partial override of what came before. */
    packs?: Record<string, DeepPartial<YueLocaleMessages>>
    /** A one-string (or one-branch) override for this subtree. */
    messages?: DeepPartial<YueLocaleMessages>
    /** Delegate translation to an application engine. */
    adapter?: YueLocaleAdapter
    /** Override the direction derived from the locale. */
    direction?: YueLocaleDirection
    /**
     * Mirror the locale onto `document.documentElement.lang`.
     *
     * Opt-in, and only for a provider that owns the whole page: a subtree in French must not
     * relabel a Chinese document. The write is mounted-only, so it can never run during server
     * rendering — see the effect below for why that distinction is not cosmetic.
     */
    documentLang?: boolean
  }>(),
  { documentLang: false },
)

const locale = provideLocale({
  locale: props.locale,
  fallback: props.fallback,
  packs: props.packs,
  messages: props.messages,
  adapter: props.adapter,
  direction: props.direction,
})

watch(
  () => props.locale,
  (next) => {
    if (next !== undefined && next !== locale.current.value) locale.current.value = next
  },
)

watch(
  () => props.fallback,
  (next) => {
    if (next !== undefined && next !== locale.fallback.value) locale.fallback.value = next
  },
)

if (props.documentLang) {
  // `onMounted`, not a bare `watchEffect`: a `watchEffect` created during setup runs immediately —
  // including during server rendering — and `typeof document === 'undefined'` only holds in a plain
  // Node pass. Any SSR environment with a DOM shim (a prerender, a test runner) would then have the
  // *server* mutate the host document, which is exactly what hydration is supposed to compare
  // against. Mounted-only also means client-side switches still apply, because the effect keeps
  // tracking `locale.current`.
  let stop: (() => void) | undefined
  onMounted(() => {
    stop = watchEffect(() => {
      document.documentElement.lang = locale.current.value
    })
  })
  onScopeDispose(() => stop?.())
}
</script>

<template>
  <slot />
</template>
