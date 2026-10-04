import { mkdir, mkdtemp, readdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { homedir, tmpdir } from 'node:os'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const mode = process.argv[2] ?? 'install'
if (!['install', 'model'].includes(mode)) throw Error('Choose install or model')
const marketplace = JSON.parse(await readFile(resolve(root, '.claude-plugin/marketplace.json'), 'utf8'))
const names = marketplace.plugins.map(plugin => plugin.name)
const directory = await mkdtemp(resolve(tmpdir(), 'claude-mods-smoke-'))
const configuration = resolve(directory, 'configuration')
const project = resolve(directory, 'project')
await mkdir(configuration)
await mkdir(project)
const environment = { ...process.env, CLAUDE_CONFIG_DIR: configuration }
if (mode === 'model' && process.argv.includes('--use-local-auth')) delete environment.CLAUDE_CONFIG_DIR

function run(options) {
  const result = spawnSync('claude', options.arguments, { cwd: project, env: environment, encoding: 'utf8', timeout: options.timeout ?? 15000, maxBuffer: 4 * 1024 * 1024 })
  if (result.status !== 0) throw Error((result.stdout + result.stderr).slice(-1600) || String(result.error))
  return result.stdout
}

if (mode === 'install') {
  run({ arguments: ['plugin', 'marketplace', 'add', root, '--json'] })
  for (const name of names) {
    run({ arguments: ['plugin', 'install', name + '@claude-code-mods', '--json'] })
    console.log('Installed ' + name + ' in an isolated configuration')
  }
  await writeFile(resolve(directory, 'installed.json'), run({ arguments: ['plugin', 'list', '--json'] }))
  console.log('Inspection directory: ' + directory)
} else {
  await writeFile(resolve(project, 'cart.mjs'), 'export function total(items) { return items.reduce((sum, item) => sum + item.price, 0) }\n')
  await writeFile(resolve(project, 'cart.test.mjs'), "import { test } from 'node:test'\nimport { strict as assert } from 'node:assert'\nimport { total } from './cart.mjs'\ntest('one item', () => assert.equal(total([{ price: 2 }]), 2))\n")
  const pluginFlags = names.flatMap(name => ['--plugin-dir', resolve(root, 'plugins', name)])
  const settings = JSON.stringify({ pluginConfigs: { 'change-journal': { options: { autoOpen: false } } } })
  const prompt = 'Read cart.mjs and cart.test.mjs. Give the items parameter a default empty array, add one test that total() returns zero, and run node --test cart.test.mjs. Change no other files. Answer in one sentence.'
  const output = run({
    arguments: [...pluginFlags, '--settings', settings, '--setting-sources', '', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--permission-mode', 'acceptEdits', '--allowedTools', 'Read,Edit,Bash(node --test *)', '--model', 'sonnet', '--max-budget-usd', '1', '--output-format', 'json', '-p', prompt],
    timeout: 120000,
  })
  const messages = JSON.parse(output)
  const result = Array.isArray(messages) ? messages.findLast(message => message.type === 'result') : messages
  if (!result || result.is_error) throw Error('Claude did not complete the demo turn')
  console.log('Total model cost: ' + (result.total_cost_usd ?? 'not reported'))
  const edited = await readFile(resolve(project, 'cart.mjs'), 'utf8')
  if (!/items\s*=\s*\[\]/.test(edited)) throw Error('The requested edit was not observed')
  const checks = spawnSync(process.execPath, ['--test', 'cart.test.mjs'], { cwd: project, encoding: 'utf8', timeout: 5000 })
  if (checks.status !== 0) throw Error('Demo checks failed')
  const slug = (await realpath(project)).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const journalRoot = resolve(homedir(), '.claude/change-journal', slug)
  const [session] = await readdir(journalRoot)
  const data = await readFile(resolve(journalRoot, session ?? '', 'data.js'), 'utf8')
  if (!data.includes('"path":"cart.mjs"')) throw Error('Change Journal did not record the edit')
  console.log('Real edit, checks, and the Change Journal page verified in ' + resolve(journalRoot, session ?? ''))
}
