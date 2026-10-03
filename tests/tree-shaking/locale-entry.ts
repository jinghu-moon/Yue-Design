/**
 * Tree-shaking consumer — one language pack.
 *
 * This is the path a consumer takes when they want Yue's components in a language other than the
 * default: import the pack from its own subpath. Two properties are under test, and both are about
 * the *bundle graph* rather than about the strings:
 *
 *   1. importing a language pack must not drag the component library along — a pack is data;
 *   2. the pack must actually reach the bundle, so the assertion above cannot pass by the module
 *      having been dropped.
 */
import ZhCN from '@yue-ui/vue/locale/zh-CN'

// Used, not merely imported: a bare `export { ZhCN }` would be dropped as unused and the test would
// then pass for the wrong reason. Mounting is not needed here — reading the value is enough to
// keep the module in the graph.
globalThis.__yueLocalePack = ZhCN.input.clear
