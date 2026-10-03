/**
 * Message resolution: merging packs, walking keys, interpolation and plural selection.
 *
 * All pure functions over plain data, so the interesting behaviour (what does a subtree
 * override keep? what happens when a key is missing?) is testable without a component, a
 * provider or a DOM.
 */
import type {
  DeepPartial,
  YueMessageLeaf,
  YueMessageParams,
  YueMessageTree,
  YuePluralMessage,
} from './types.js'

const PLURAL_CATEGORIES = ['zero', 'one', 'two', 'few', 'many', 'other'] as const

/** A plain object, as opposed to an array, a `Date`, or a message string. */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Whether a value is a plural message rather than a nested branch.
 *
 * The rule is structural: every key is a `Intl.PluralRules` category and `other` is a
 * string. Keys cannot be both, so the ambiguity a language pack could otherwise have
 * (`{ other: '…' }` — a leaf, or a branch with one child called `other`?) is resolved by
 * deciding that a branch never looks exactly like a plural map.
 */
export function isPluralMessage(value: unknown): value is YuePluralMessage {
  if (!isPlainObject(value)) return false
  const keys = Object.keys(value)
  if (keys.length === 0) return false
  if (typeof value.other !== 'string') return false
  return keys.every((key) => (PLURAL_CATEGORIES as readonly string[]).includes(key))
}

/** Whether a value is any kind of message leaf. */
export function isMessageLeaf(value: unknown): value is YueMessageLeaf {
  return typeof value === 'string' || isPluralMessage(value)
}

/**
 * Merge a partial tree onto a base, branch by branch.
 *
 * Branches merge, leaves replace. That is the difference between "translate one string"
 * and "translate nothing": a subtree override of `input.clear` must leave every sibling
 * key from the application's pack intact, and a plural map overriding only `other` must
 * keep the forms the base language already had.
 */
export function mergeMessages<TTree extends YueMessageTree>(
  base: TTree,
  override: DeepPartial<TTree> | undefined,
): TTree {
  if (!override) return base

  const result: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue
    const current = result[key]
    if (isPlainObject(value) && isPlainObject(current)) {
      result[key] = mergeMessages(current as YueMessageTree, value as DeepPartial<YueMessageTree>)
    } else {
      result[key] = value
    }
  }
  return result as TTree
}

/**
 * Resolve the message tree for a locale.
 *
 * Packs are merged from the *least* specific candidate to the most specific, so the chain
 * `zh-Hans-CN → zh-CN → zh → en-US` means "a zh-CN pack fills in what a zh-Hans-CN pack
 * omits, and en-US fills in what both omit". The scope's own `messages` override is applied
 * last, and only to this scope.
 */
export function resolveMessages<TTree extends YueMessageTree>(
  packs: Record<string, DeepPartial<TTree>>,
  candidates: readonly string[],
  override?: DeepPartial<TTree>,
): TTree {
  let resolved: YueMessageTree = {}
  for (const candidate of [...candidates].reverse()) {
    const pack = packs[candidate]
    if (pack) resolved = mergeMessages(resolved, pack)
  }
  return mergeMessages(resolved as TTree, override)
}

/** Read a dotted key out of a tree. Returns `undefined` for branches and missing keys. */
export function lookupMessage(tree: YueMessageTree, key: string): YueMessageLeaf | undefined {
  let node: unknown = tree
  for (const segment of key.split('.')) {
    if (!isPlainObject(node)) return undefined
    node = node[segment]
  }
  return isMessageLeaf(node) ? node : undefined
}

/** `{name}` placeholders, the one interpolation syntax Yue accepts. */
const PLACEHOLDER = /\{([A-Za-z0-9_]+)\}/g

/**
 * Fill `{name}` placeholders.
 *
 * A placeholder without a parameter is left *as written* and reported: silently replacing
 * it with an empty string produces a sentence that reads as finished, which is how a
 * missing parameter survives review.
 */
export function interpolate(
  template: string,
  params: YueMessageParams = {},
): { value: string; missing: string[] } {
  const missing: string[] = []
  const value = template.replace(PLACEHOLDER, (placeholder, name: string) => {
    const replacement = params[name]
    if (replacement === undefined || replacement === null) {
      missing.push(name)
      return placeholder
    }
    return String(replacement)
  })
  return { value, missing }
}

/** `Intl.PluralRules` instances are locale-specific and worth caching; results are not. */
const pluralRulesCache = new Map<string, Intl.PluralRules>()

function pluralRules(locale: string): Intl.PluralRules {
  let rules = pluralRulesCache.get(locale)
  if (!rules) {
    rules = new Intl.PluralRules(locale)
    pluralRulesCache.set(locale, rules)
  }
  return rules
}

/**
 * Pick the plural form for a count.
 *
 * The category comes from `Intl.PluralRules`, never from a `count === 1` comparison: the
 * number of forms a language has is the language's business (Arabic has six, Japanese has
 * one), and English grammar must not leak into a component.
 *
 * Returns the `other` form when the message has no form for the selected category — that is
 * what makes `other` mandatory — and `undefined` only when even `other` is missing, which
 * can only happen with untyped data.
 */
export function selectPluralForm(
  message: YuePluralMessage,
  count: number,
  locale: string,
): string | undefined {
  const category = pluralRules(locale).select(count)
  return message[category as keyof YuePluralMessage] ?? message.other
}

/** Whether a plural message has a form for the category `count` selects. */
export function hasPluralForm(message: YuePluralMessage, count: number, locale: string): boolean {
  const category = pluralRules(locale).select(count)
  return typeof message[category as keyof YuePluralMessage] === 'string'
}
