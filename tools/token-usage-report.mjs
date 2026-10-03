/**
 * Token usage report: which tokens no other file consumes, and **why each one exists**.
 *
 * Replaces the earlier "unreferenced" report, whose framing was wrong. A design language's token set is
 * necessarily wider than current usage: `--amber-400` and `--breakpoint-lg` are vocabulary, not debt, and
 * a metric that can only be reduced by deleting vocabulary measures the wrong thing. What is worth
 * reporting is whether every unconsumed token's existence is *explained* — see `tools/lib/token-usage.mjs`
 * for the causes and the rule each one carries.
 *
 * Usage: `node tools/token-usage-report.mjs` (writes `.spec-workflow/token-architecture/token-usage.md`
 * and `.json`, prints the summary). Does not modify any token.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { classifyUnconsumed, docFilesFor, docMentionIndex, referenceSources } from './lib/token-usage.mjs'

const OUT_DIR = '.spec-workflow/token-architecture'
const CAUSE_MEANING = {
  'same-file-composition': '只在声明它的文件内部被引用（语义角色由本文件的色阶组合而成）——计数口径排除自文件引用，实际上有消费者',
  'prototype-contract': '冻结原型声明同名 Token，parity 门禁固定住它',
  'consumer-facing': '面向消费者的公共原语，已在文档中说明（断点/布局/动效时长等，其中部分结构上无法被 CSS `var()` 读取）',
  'scale-step': '闭合刻度中的一个档位：刻度本身就是契约，不按当前用量裁剪',
  'interface-without-reader': '**唯一需要动作的一类**：组件层公共覆盖点，既没有读取方也没有文档',
}

const inventory = JSON.parse(readFileSync(`${OUT_DIR}/inventory.json`, 'utf8'))
const result = classifyUnconsumed({
  inventory,
  sources: referenceSources(),
  docs: docMentionIndex(docFilesFor()),
})

const byNamespace = (list) => {
  const counts = new Map()
  for (const row of list) counts.set(row.namespace, (counts.get(row.namespace) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1])
}

const lines = [
  '# Token 使用情况报告',
  '',
  '> 前提：**Token 集是设计语言，覆盖必然宽于组件当前用量**。下面的数字是"未被其他文件引用"的清单，',
  '> 不是待清理的债务；报表的作用是让每一个这样的 Token 都**有可解释的存在理由**。',
  '',
  `生成方式：\`node tools/token-usage-report.mjs\`。总数 ${result.rows.length}，全部可解释（需要动作的：${result.needsDecision.length}）。`,
  '',
  '| 存在理由 | 数量 | 含义 |',
  '| --- | --- | --- |',
  ...Object.entries(CAUSE_MEANING).map(
    ([cause, meaning]) => `| \`${cause}\` | ${result.counts[cause] ?? 0} | ${meaning} |`,
  ),
  '',
]
if (result.needsDecision.length > 0) {
  lines.push(
    '## 需要动作（组件层公共覆盖点，无读取方且无文档）',
    '',
    '| Token | 命名空间 | 声明位置 |',
    '| --- | --- | --- |',
    ...result.needsDecision.map((row) => `| \`${row.name}\` | ${row.namespace} | \`${row.declaredIn.join('<br>')}\` |`),
    '',
  )
}
for (const [cause, rows] of Object.entries(result.byCause).sort((a, b) => b[1].length - a[1].length)) {
  lines.push(
    `## ${cause}（${rows.length}）`,
    '',
    '| Token | 层 | 命名空间 | 声明位置 | 同文件引用 |',
    '| --- | --- | --- | --- | --- |',
    ...rows.map(
      (row) =>
        `| \`${row.name}\` | ${row.layer} | ${row.namespace} | \`${row.declaredIn.join('<br>')}\` | ` +
        `${row.referencedIn.length === 0 ? '—' : row.referencedIn.map((file) => `\`${file}\``).join('<br>')} |`,
    ),
    '',
  )
}

writeFileSync(`${OUT_DIR}/token-usage.md`, `${lines.join('\n')}\n`, 'utf8')
writeFileSync(
  `${OUT_DIR}/token-usage.json`,
  `${JSON.stringify({ total: result.rows.length, counts: result.counts, needsDecision: result.needsDecision.length, rows: result.rows }, null, 2)}\n`,
  'utf8',
)

console.log(`未被其他文件消费的 Token: ${result.rows.length}`)
for (const [cause, count] of Object.entries(result.counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${cause.padEnd(24)} ${count}`)
}
console.log(`需要动作: ${result.needsDecision.length}`)
for (const row of result.needsDecision) console.log(`  ${row.name} (${row.declaredIn.join(', ')})`)
if (result.needsDecision.length === 0) {
  console.log('每个未被引用的 Token 都有可解释的存在理由——没有需要删除或补读取方的项。')
}
