import type { FileFamily } from './types'

const SLASH_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'mts', 'cts', 'java', 'c', 'h', 'cc', 'cpp', 'hpp', 'cs', 'go', 'rs', 'swift', 'kt', 'kts', 'scala', 'dart', 'php', 'css', 'scss', 'less', 'vue', 'svelte']
const HASH_EXTENSIONS = ['py', 'rb', 'sh', 'bash', 'zsh', 'fish', 'yaml', 'yml', 'toml', 'r', 'pl', 'ex', 'exs', 'nix', 'tf', 'ps1']
const DOUBLE_DASH_EXTENSIONS = ['sql', 'lua', 'hs', 'elm']
const PROSE_EXTENSIONS = ['md', 'mdx', 'markdown', 'txt', 'rst', 'adoc']
const BINARY_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'pdf', 'zip', 'gz', 'tgz', 'woff', 'woff2', 'ttf', 'otf', 'mp3', 'mp4', 'mov', 'wasm', 'lockb']
const LOCKFILES = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lock', 'cargo.lock', 'poetry.lock', 'gemfile.lock', 'go.sum', 'composer.lock', 'uv.lock', 'pipfile.lock']
const IGNORED_FOLDER = /(?:^|\/)(?:node_modules|vendor|vendors|third_party|dist|build|out|coverage|\.git|\.next|target|__generated__|generated)\//i
const GENERATED_FILE = /\.(?:min\.[a-z]+|map|snap|lock)$|\.generated\.|\.pb\.|_pb2\.py$/i
const TEST_FILE = /(?:^|\/)(?:tests?|__tests__|spec)\/|\.(?:test|spec)\.[a-z]+$|(?:^|\/)test_[^/]+\.py$|_test\.(?:go|py|rb)$/i

function extensionOf(path: string): string {
  const name = path.split('/').at(-1) ?? ''
  const dot = name.lastIndexOf('.')
  return dot <= 0 ? '' : name.slice(dot + 1).toLowerCase()
}

export function familyOf(path: string): FileFamily {
  const extension = extensionOf(path)
  if (SLASH_EXTENSIONS.includes(extension)) {
    return 'slash'
  }
  if (HASH_EXTENSIONS.includes(extension)) {
    return 'hash'
  }
  if (DOUBLE_DASH_EXTENSIONS.includes(extension)) {
    return 'double-dash'
  }
  return PROSE_EXTENSIONS.includes(extension) ? 'prose' : 'other'
}

export function isTestPath(path: string): boolean {
  return TEST_FILE.test(path)
}

export function isIgnoredPath(path: string): boolean {
  const name = (path.split('/').at(-1) ?? '').toLowerCase()
  return (
    IGNORED_FOLDER.test(path) ||
    GENERATED_FILE.test(path) ||
    LOCKFILES.includes(name) ||
    BINARY_EXTENSIONS.includes(extensionOf(path))
  )
}

export function isBinaryText(text: string): boolean {
  return text.includes(String.fromCodePoint(0))
}

export function relativePath(options: { path: string; root: string }): string {
  const root = options.root.replace(/\/+$/, '')
  return root !== '' && options.path.startsWith(`${root}/`) ? options.path.slice(root.length + 1) : options.path
}
