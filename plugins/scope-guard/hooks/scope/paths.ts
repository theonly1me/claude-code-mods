const TEMPORARY_ROOTS = ['/tmp/', '/private/tmp/', '/var/folders/']
const GENERIC_STEMS = new Set(['index', 'main', 'mod', 'lib', 'src', 'test', 'tests', 'utils', 'readme'])
const PATH_TOKEN = /[A-Za-z0-9_@~+.\-/]+/g

export function relativeTo(options: { path: string; root: string }): string {
  const trimmed = options.path.replace(/^\.\//, '')
  const prefix = options.root.endsWith('/') ? options.root : `${options.root}/`
  return options.root !== '' && trimmed.startsWith(prefix) ? trimmed.slice(prefix.length) : trimmed
}

export function folderOf(path: string): string {
  const slash = path.lastIndexOf('/')
  return slash <= 0 ? '.' : path.slice(0, slash)
}

export function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

function stemOf(path: string): string {
  const base = baseName(path)
  const dot = base.indexOf('.', 1)
  return dot === -1 ? base : base.slice(0, dot)
}

export function isTemporary(path: string): boolean {
  return TEMPORARY_ROOTS.some(temporary => path.startsWith(temporary))
}

export function isOutside(options: { path: string; root: string }): boolean {
  const { path, root } = options
  if (path.startsWith('..')) {
    return true
  }
  if (!path.startsWith('/') || root === '') {
    return false
  }
  const isUnderRoot = path === root || path.startsWith(root.endsWith('/') ? root : `${root}/`)
  return !isUnderRoot && !isTemporary(path)
}

export function isMentioned(options: { path: string; text: string }): boolean {
  const text = options.text.toLowerCase()
  const path = options.path.toLowerCase()
  const base = baseName(path)
  const stem = stemOf(path)
  if (text.includes(path) || text.includes(base)) {
    return true
  }
  return stem.length >= 3 && !GENERIC_STEMS.has(stem) && new RegExp(`\\b${stem.replace(/[^a-z0-9]/g, '.')}\\b`).test(text)
}

export function isUnderFolder(options: { path: string; folder: string }): boolean {
  return options.folder === '.' ? !options.path.includes('/') : options.path === options.folder || options.path.startsWith(`${options.folder}/`)
}

export function pathTokens(text: string): string[] {
  return (text.match(PATH_TOKEN) ?? [])
    .map(token => token.replace(/^\.\//, '').replace(/[.\-/]+$/, ''))
    .filter(token => token.includes('/') || /\.[A-Za-z0-9]{1,8}$/.test(token))
}

export function lineCount(text: string): number {
  return text === '' ? 0 : text.split('\n').length
}
