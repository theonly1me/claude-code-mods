import { readFileSync, writeFileSync } from 'node:fs'

const [input, output, firstLine = '0', lastLine = '9999'] = process.argv.slice(2)
const lines = readFileSync(input, 'utf8')
  .replace(/\x1b\]8;[^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
  .split('\n')
  .slice(Number(firstLine), Number(lastLine))
const BASE = ['#000000', '#cd3131', '#0dbc79', '#e5e510', '#2472c8', '#bc3fbc', '#11a8cd', '#e5e5e5']
const BRIGHT = ['#666666', '#f14c4c', '#23d18b', '#f5f543', '#3b8eea', '#d670d6', '#29b8db', '#ffffff']

function color256(index) {
  if (index < 8) return BASE[index]
  if (index < 16) return BRIGHT[index - 8]
  if (index >= 232) {
    const level = 8 + (index - 232) * 10
    return `rgb(${level},${level},${level})`
  }
  const value = index - 16
  const steps = [0, 95, 135, 175, 215, 255]
  return `rgb(${steps[Math.floor(value / 36)]},${steps[Math.floor(value / 6) % 6]},${steps[value % 6]})`
}

function escape(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

let state = { fg: null, bg: null, bold: false, dim: false, italic: false, inverse: false }
const reset = () => ({ fg: null, bg: null, bold: false, dim: false, italic: false, inverse: false })

function apply(codes) {
  for (let index = 0; index < codes.length; index += 1) {
    const code = codes[index]
    if (code === 0) state = reset()
    else if (code === 1) state.bold = true
    else if (code === 2) state.dim = true
    else if (code === 3) state.italic = true
    else if (code === 7) state.inverse = true
    else if (code === 22) { state.bold = false; state.dim = false }
    else if (code === 23) state.italic = false
    else if (code === 27) state.inverse = false
    else if (code >= 30 && code <= 37) state.fg = BASE[code - 30]
    else if (code >= 90 && code <= 97) state.fg = BRIGHT[code - 90]
    else if (code >= 40 && code <= 47) state.bg = BASE[code - 40]
    else if (code >= 100 && code <= 107) state.bg = BRIGHT[code - 100]
    else if (code === 39) state.fg = null
    else if (code === 49) state.bg = null
    else if ((code === 38 || code === 48) && codes[index + 1] === 2) {
      const value = `rgb(${codes[index + 2]},${codes[index + 3]},${codes[index + 4]})`
      if (code === 38) state.fg = value
      else state.bg = value
      index += 4
    } else if ((code === 38 || code === 48) && codes[index + 1] === 5) {
      if (code === 38) state.fg = color256(codes[index + 2])
      else state.bg = color256(codes[index + 2])
      index += 2
    }
  }
}

function span(text) {
  if (text === '') return ''
  const fg = state.inverse ? state.bg ?? '#1e1e2e' : state.fg
  const bg = state.inverse ? state.fg ?? '#d4d4d4' : state.bg
  const style = [
    fg ? `color:${fg}` : '',
    bg ? `background:${bg}` : '',
    state.bold ? 'font-weight:700' : '',
    state.dim ? 'opacity:.6' : '',
    state.italic ? 'font-style:italic' : '',
  ].filter(Boolean).join(';')
  return style ? `<span style="${style}">${escape(text)}</span>` : escape(text)
}

const html = lines.map(line => {
  let out = ''
  let buffer = ''
  const pattern = /\x1b\[([0-9;]*)m/g
  let last = 0
  for (const match of line.matchAll(pattern)) {
    buffer = line.slice(last, match.index)
    out += span(buffer)
    apply(match[1] === '' ? [0] : match[1].split(';').map(Number))
    last = match.index + match[0].length
  }
  out += span(line.slice(last))
  state = reset()
  return out
}).join('\n')

writeFileSync(output, `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#1e1e2e;color:#d4d4d4}pre{margin:0;padding:14px 16px;font:14px/1.0 "SF Mono",Menlo,monospace;letter-spacing:0}</style><pre>${html}</pre>`)
