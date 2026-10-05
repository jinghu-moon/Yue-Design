import { chromium } from 'playwright-core'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const root = path.resolve('.agent/skills/yue-component-spec/references')
const data = path.resolve('interviews/yue-popover/data.js')
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yue-interview-'))
fs.copyFileSync(path.join(root, 'interview-panel-template.html'), path.join(dir, 'panel.html'))
fs.copyFileSync(data, path.join(dir, 'data.js'))

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage()
const errors = []
page.on('pageerror', (error) => errors.push(String(error)))
await page.goto(`file://${dir.replaceAll('\\', '/')}/panel.html`)
await page.waitForTimeout(300)
const result = await page.evaluate(() => ({
  title: document.title,
  cards: document.querySelectorAll('.q-card').length,
  questions: document.querySelectorAll('#userQuestionsPanel').length,
  findings: document.querySelectorAll('#findingsPanel').length,
  freeze: document.querySelectorAll('input[name="freezeGate"]').length,
  subtitle: document.querySelector('#componentSubtitle')?.textContent,
  status: document.querySelector('#statusSummary')?.textContent,
  factQuestionOptions: document.querySelector('#q-39 .options')?.children.length ?? 0,
  factQuestionStatus: document.querySelector('#q-39 .q-status')?.textContent,
  factQuestionStatusTag: document.querySelector('#q-39 .q-status')?.tagName,
}))
await page.locator('#addUserQuestionBtn').click()
const questionCount = await page.locator('#userQuestionsList .user-question-row').count()
const questionRow = page.locator('#userQuestionsList .user-question-row').first()
const questionInput = questionRow.locator('textarea')
const resolveButton = questionRow.locator('.resolve-question-btn')
await questionInput.fill('需要确认的设计问题')
const beforeResolve = await resolveButton.evaluate((element) => ({
  width: element.getBoundingClientRect().width,
  height: element.getBoundingClientRect().height,
  text: element.textContent,
}))
await resolveButton.click()
const afterResolve = await questionRow.evaluate((row) => ({
  resolved: row.classList.contains('is-resolved'),
  background: getComputedStyle(row).backgroundColor,
  buttonText: row.querySelector('.resolve-question-btn')?.textContent,
}))
await page.locator('input[name="freezeGate"][value="freeze"]').check()
const blockersVisible = await page.locator('#blockingList li').count()
console.log(JSON.stringify({ result, errors }, null, 2))
fs.rmSync(dir, { recursive: true, force: true })
if (errors.length || result.cards !== 40 || result.freeze !== 3 || result.factQuestionOptions !== 0 || result.factQuestionStatus !== 'Agent · 已有研究发现' || result.factQuestionStatusTag !== 'SPAN' || questionCount !== 1 || blockersVisible === 0 || beforeResolve.width !== 112 || beforeResolve.height !== 40 || !afterResolve.resolved || afterResolve.background === 'rgba(0, 0, 0, 0)' || afterResolve.buttonText !== '取消解决') process.exit(1)

const multiDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yue-interview-multi-'))
fs.copyFileSync(path.join(root, 'interview-panel-template.html'), path.join(multiDir, 'panel.html'))
fs.copyFileSync(path.join(root, 'data-template.js'), path.join(multiDir, 'data.js'))
const multiPage = await browser.newPage()
const multiErrors = []
multiPage.on('pageerror', (error) => multiErrors.push(String(error)))
await multiPage.goto(`file://${multiDir.replaceAll('\\', '/')}/panel.html`)
const multiQuestion = multiPage.locator('#q-3')
const multiOptions = multiQuestion.locator('.option')
const multiGroup = multiQuestion.locator('.options')
await multiOptions.nth(0).click()
await multiOptions.nth(1).click()
const bothSelected = await multiOptions.evaluateAll((items) => items.map((item) => item.getAttribute('aria-checked')))
const multiSemantics = await multiGroup.evaluate((element) => ({
  role: element.getAttribute('role'),
  multiselectable: element.getAttribute('aria-multiselectable'),
}))
await multiOptions.nth(0).click()
const afterRemove = await multiOptions.evaluateAll((items) => items.map((item) => item.getAttribute('aria-checked')))
await multiPage.locator('#exportBtn').click()
const multiState = await multiPage.evaluate(() => ({
  checked: Array.from(document.querySelectorAll('#q-3 .option.is-checked')).map((item) => item.dataset.letter),
  status: document.querySelector('#q-3 .q-status')?.value,
}))
await multiPage.close()
fs.rmSync(multiDir, { recursive: true, force: true })
if (multiErrors.length || JSON.stringify(bothSelected) !== JSON.stringify(['true', 'true', 'false']) || multiSemantics.role !== 'group' || multiSemantics.multiselectable !== 'true' || JSON.stringify(afterRemove) !== JSON.stringify(['false', 'true', 'false']) || JSON.stringify(multiState.checked) !== JSON.stringify(['B']) || multiState.status !== 'decided') process.exit(1)
await browser.close()
