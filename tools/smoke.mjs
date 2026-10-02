import { mkdir, mkdtemp, writeFile, readFile, cp } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const mode = process.argv[2] ?? 'install'
if (!['install', 'model'].includes(mode)) throw Error('Choose install or model')
const directory = await mkdtemp(resolve(tmpdir(), 'claude-mods-smoke-'))
const configuration = resolve(directory, 'configuration')
const project = resolve(directory, 'project')
await mkdir(configuration)
await mkdir(project)
const environment = { ...process.env, CLAUDE_CONFIG_DIR: configuration }
if (mode === 'model' && process.argv.includes('--use-local-auth')) delete environment.CLAUDE_CONFIG_DIR
function run(options) {
  const result = spawnSync('claude', options.arguments, { cwd: project, env: environment, encoding: 'utf8', timeout: options.timeout ?? 15000, maxBuffer: 2 * 1024 * 1024 })
  if (result.status !== 0) throw Error((result.stdout + result.stderr).slice(-1600) || String(result.error))
  return result.stdout
}
if (mode === 'install') {
  run({ arguments: ['plugin', 'marketplace', 'add', root, '--json'] })
  for (const name of ['night-feast', 'little-harvest', 'samurai-dojo', 'pocket-familiar', 'change-journal', 'behavior-map']) {
    run({ arguments: ['plugin', 'install', name + '@claude-code-mods', '--json'] })
    console.log('Installed ' + name + ' in isolated configuration')
  }
  const installed = JSON.parse(run({ arguments: ['plugin', 'list', '--json'] }))
  console.log('Isolated marketplace installation completed')
  await writeFile(resolve(directory, 'installed.json'), JSON.stringify(installed, null, 2))
  console.log('Inspection directory: ' + directory)
} else {
  await writeFile(resolve(project, 'cart.mjs'), 'export function total(items) { return items.reduce((sum, item) => sum + item.price, 0) }\n')
  await writeFile(resolve(project, 'cart.test.mjs'), "import { test } from 'node:test'\nimport { strict as assert } from 'node:assert'\nimport { total } from './cart.mjs'\ntest('empty carts cost zero', () => assert.equal(total([]), 0))\n")
  const diagnostic = resolve(directory, 'diagnostic')
  await mkdir(resolve(diagnostic, '.claude-plugin'), { recursive: true })
  await mkdir(resolve(diagnostic, 'hooks'))
  await cp(resolve(root, 'types/contracts.d.ts'), resolve(diagnostic, 'types.d.ts'))
  await writeFile(resolve(diagnostic, '.claude-plugin/plugin.json'), JSON.stringify({ name: 'smoke-observer', version: '0.1.0', types: './types.d.ts' }))
  await writeFile(resolve(diagnostic, 'hooks/hooks.json'), JSON.stringify({ modules: ['./register.ts'] }))
  await cp(resolve(root, 'tools/smoke-observer.ts'), resolve(diagnostic, 'hooks/register.ts'))
  const prompt = 'In this temporary demo project, read cart.mjs and cart.test.mjs. Add support for omitted items by giving the items parameter a default empty array. Add one test for total() returning zero. Run node --test cart.test.mjs. Do not modify any other files or use subagents. Keep your final response to one sentence.'
  const output = run({ arguments: ['--plugin-dir', resolve(root, 'plugins'), '--plugin-dir', diagnostic, '--setting-sources', '', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--no-session-persistence', '--permission-mode', 'acceptEdits', '--allowedTools', 'Read,Edit,Bash(node --test *)', '--model', 'claude-sonnet-5-5', '--effort', 'medium', '--max-budget-usd', '1', '--output-format', 'json', '-p', prompt], timeout: 55000 })
  const messages = JSON.parse(output)
  const result = Array.isArray(messages) ? messages.findLast(message => message.type === 'result') : messages
  if (!result || result.is_error) throw Error('Claude did not complete the demo turn')
  console.log('Claude run result: ' + (result.is_error ? 'error' : 'completed'))
  console.log('Total model cost: ' + (result.total_cost_usd ?? 'not reported'))
  const edited = await readFile(resolve(project, 'cart.mjs'), 'utf8')
  if (!edited.includes('items = []') && !edited.includes('items=[]')) throw Error('The requested edit was not observed')
  const checks = spawnSync(process.execPath, ['--test', 'cart.test.mjs'], { cwd: project, encoding: 'utf8', timeout: 5000 })
  if (checks.status !== 0) throw Error('Demo checks failed')
  console.log('Real edit and two cart checks verified')
  const analysis = JSON.parse(await readFile(resolve(project, 'mod-smoke.json'), 'utf8'))
  console.log('Summary diagnostics: ' + JSON.stringify(analysis))
  if (!analysis.ready || !analysis.calls.some(call => call.model === 'claude-sonnet-5-5' && call.effort === 'medium' && call.answered)) throw Error('Live analysis did not produce a confirmed response')
  console.log('Inspection directory: ' + directory)
}
