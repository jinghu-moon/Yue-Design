import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const root = process.cwd()
const validateData = path.join(root, '.agent/skills/yue-component-spec/scripts/validate-interview-data.mjs')
const validateAnswers = path.join(root, '.agent/skills/yue-component-spec/scripts/validate-answers.mjs')

function run(script, file, extra = []) {
  return () => execFileSync(process.execPath, [script, file, ...extra], { cwd: root, encoding: 'utf8' })
}

describe('yue-component-spec interview contracts', () => {
  it('accepts the Popover data and migrated snapshot', () => {
    expect(run(validateData, 'interviews/yue-popover/data.js')()).toContain('validated 40 questions')
    expect(run(validateAnswers, 'interviews/yue-popover/answers.json', ['interviews/yue-popover/data.js'])()).toContain('validated answers')
  })

  it('rejects a freeze with an unresolved decision', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yue-answer-fixture-'))
    const file = path.join(dir, 'answers.json')
    fs.writeFileSync(file, JSON.stringify({
      schemaVersion: 2,
      component: 'Fixture',
      freezeGate: { choice: 'freeze' },
      answers: { '1': { status: 'unknown', letters: [], note: '' } },
      userQuestions: [],
    }))
    expect(() => run(validateAnswers, file)()).toThrow(/cannot freeze/)
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('rejects malformed data question types', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yue-data-fixture-'))
    const file = path.join(dir, 'data.js')
    fs.writeFileSync(file, `window.SCHEMA_VERSION=2;window.COMPONENT_NAME='Fixture';window.QUESTIONS=[{id:1,type:'bad',required:true,options:[]}];window.SECTIONS=[];`)
    expect(() => run(validateData, file)()).toThrow(/invalid type/)
    fs.rmSync(dir, { recursive: true, force: true })
  })
})
