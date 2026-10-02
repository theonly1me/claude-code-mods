import ts from 'typescript'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

export async function inlineRegister(entry) {
  const modules = new Map()
  const definitions = []
  async function bundle(path) {
    if (modules.has(path)) return modules.get(path)
    const name = 'module' + modules.size
    modules.set(path, name)
    let source = await readFile(path, 'utf8')
    const syntax = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true)
    const bindings = []
    for (const statement of syntax.statements) {
      if (!ts.isImportDeclaration(statement)) continue
      if (statement.importClause?.isTypeOnly || !ts.isStringLiteral(statement.moduleSpecifier)) continue
      const specifier = statement.moduleSpecifier.text
      if (!specifier.startsWith('.')) continue
      const dependency = await bundle(resolve(dirname(path), specifier + '.ts'))
      const imported = statement.importClause?.namedBindings
      if (imported && ts.isNamedImports(imported)) bindings.push('const {' + imported.elements.filter(element => !element.isTypeOnly).map(element => (element.propertyName?.text ?? element.name.text) + ':' + element.name.text).join(',') + '} = ' + dependency)
    }
    source = source.replace(/^import[\s\S]*?from ['"][^'"]+['"]\s*$/gm, '')
    const exports = []
    for (const statement of syntax.statements) {
      if (!statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue
      if (ts.isFunctionDeclaration(statement) && statement.name) exports.push(statement.name.text)
      if (ts.isVariableStatement(statement)) statement.declarationList.declarations.forEach(declaration => { if (ts.isIdentifier(declaration.name)) exports.push(declaration.name.text) })
    }
    definitions.push('const ' + name + ' = (() => {' + bindings.join(';') + ';' + source.replace(/\bexport /g, '') + ';return {' + exports.join(',') + '}})()')
    return name
  }
  let source = await readFile(entry, 'utf8')
  const plugin = resolve(entry, '../..').split('/').at(-1)
  const ref = "{plugin:'" + plugin + "',key:'claim'}"
  source = source.replace(/import \{ atom, read, update \} from 'claude-code'\n/, '')
  source = source.replace(/const claimAtom = atom\([^\n]+/, 'const claimAtom = { initial: { enabled: false, selectedAt: 0, expanded: false, playing: false } }')
  source = source.replace('await read($, claimAtom)', '(await $.state.get(' + ref + ')).value ?? claimAtom.initial')
  source = source.replaceAll('await update($, claimAtom, () => claim)', 'await $.state.set(' + ref + ', claim)')
  const reads = source.match(/async function readScenes[\s\S]*?\n\}/)?.[0]
  if (reads) {
    const body = reads.slice(reads.indexOf('{') + 1, -1).replace('  return ', '  const entries = ')
    source = source.replace(reads, '').replace('const entries = await readScenes($)', body)
  }
  const shell = source.match(/async function readShell[\s\S]*?\n\}/)?.[0]
  if (shell) source = source.replace(shell, '').replaceAll('await readShell($)', 'await (' + shell.slice(shell.indexOf('return ') + 7, -2).trim() + ')')
  source = source.replace(/^    if \(claim.playing[^\n]+\n/gm, '')
  source = source.replaceAll('publicationRef,', "{plugin:'" + plugin + "',key:'analysis'},")
  const syntax = ts.createSourceFile(entry, source, ts.ScriptTarget.Latest, true)
  const bindings = []
  for (const statement of syntax.statements) {
    if (!ts.isImportDeclaration(statement) || statement.importClause?.isTypeOnly || !ts.isStringLiteral(statement.moduleSpecifier) || !statement.moduleSpecifier.text.startsWith('.')) continue
    const dependency = await bundle(resolve(dirname(entry), statement.moduleSpecifier.text + '.ts'))
    const imported = statement.importClause?.namedBindings
    if (imported && ts.isNamedImports(imported)) bindings.push('const {' + imported.elements.filter(element => !element.isTypeOnly).map(element => (element.propertyName?.text ?? element.name.text) + ':' + element.name.text).join(',') + '} = ' + dependency)
  }
  source = source.replace(/^import[\s\S]*?from ['"][^'"]+['"]\s*$/gm, '')
  const start = source.indexOf('export const register')
  const body = source.indexOf('{', start)
  const combined = 'export const register = (on, options) => {' + definitions.join(';') + ';' + bindings.join(';') + ';' + source.slice(0, start) + source.slice(body + 1)
  return ts.transpileModule(combined, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, removeComments: true } }).outputText
}
