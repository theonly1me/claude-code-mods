export function sanitize(text: string): string {
  return text
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    .replace(/-----BEGIN [\w ]*(?:PRIVATE KEY|CERTIFICATE)-----[\s\S]*?(?:-----END [\w ]+-----|$)/g, '[redacted credential]')
    .replace(/\b(?:sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9_]{12,}|github_pat_[A-Za-z0-9_]{12,}|AKIA[A-Z0-9]{16})\b/g, '[redacted token]')
    .replace(/((?:api[_-]?key|secret|token|password|authorization)["']?\s*[=:]\s*)(["']?)[^\s,;"']+/gi, '$1$2[redacted]')
    .replace(/(?:https?:\/\/)[^\s/@]+:[^\s/@]+@/g, 'https://[redacted]@')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
}

export function safePath(options: { path: string; root: string }): string | undefined {
  const root = options.root.replaceAll('\\', '/').replace(/\/$/, '')
  let path = options.path.replaceAll('\\', '/')
  if (path.startsWith(root + '/')) path = path.slice(root.length + 1)
  if (path.startsWith('/') || /^[A-Za-z]:/.test(path) || path.split('/').includes('..')) return undefined
  if (/(?:^|\/)(?:\.env(?:\.[^/]*)?|\.aws|\.ssh|\.git|node_modules|dist|credentials(?:\.[^/]*)?|secrets?(?:\.[^/]*)?)(?:\/|$)|\.(?:pem|key|p12|pfx)$/i.test(path)) return undefined
  return path
}

export function excerpt(text: string): string {
  return sanitize(text).slice(0, 3000)
}
