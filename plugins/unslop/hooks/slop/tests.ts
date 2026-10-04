const TAUTOLOGY = [
  /expect\(\s*(true|false|null|undefined|\d+|'[^']*'|"[^"]*")\s*\)\s*\.\s*(?:toBe|toEqual|toStrictEqual)\(\s*\1\s*\)/,
  /expect\(\s*true\s*\)\s*\.\s*toBeTruthy\(\s*\)/,
  /expect\(\s*false\s*\)\s*\.\s*toBeFalsy\(\s*\)/,
  /^\s*assert\s+True\b/,
  /^\s*assert\s+(\d+)\s*==\s*\1\b/,
  /\bassert(?:True)?\(\s*true\s*\)/,
  /\bassert\.ok\(\s*true\s*\)/,
]
const JS_TEST_START = /^(\s*)(?:it|test)(?:\.only|\.concurrent)?\(\s*['"`]/
const PY_TEST_START = /^(\s*)def\s+test_\w*\s*\(/
const ASSERTION = /\bexpect(?:TypeOf)?\(|\bassert|\.should\b|\bt\.(?:is|ok|deepEqual|true|false|throws)\(|toMatchSnapshot|\brequire\.(?:Equal|NoError|True)|\bmust\./
const WEAK_ASSERTION = /\.(?:toBeDefined|toBeTruthy)\(\s*\)|\.not\.(?:toBeUndefined|toBeNull)\(\s*\)|assert\s+\w+\s+is\s+not\s+None\s*$/

export type TestBlock = { start: number; header: string; body: string[]; isClosed: boolean }

export function isTautology(line: string): boolean {
  return TAUTOLOGY.some(pattern => pattern.test(line))
}

function blockEnd(options: { lines: readonly string[]; start: number; indent: string; isPython: boolean }): { end: number; isClosed: boolean } {
  const { lines, start, indent } = options
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    if (options.isPython) {
      const isDedented = line.trim() !== '' && !line.startsWith(`${indent} `) && !line.startsWith(`${indent}\t`)
      if (isDedented) {
        return { end: index, isClosed: true }
      }
    } else if (line.startsWith(indent) && /^\s*\}\)?;?\s*$/.test(line) && line.length - line.trimStart().length === indent.length) {
      return { end: index + 1, isClosed: true }
    }
  }
  return { end: lines.length, isClosed: options.isPython }
}

export function testBlocks(lines: readonly string[]): TestBlock[] {
  const blocks: TestBlock[] = []
  lines.forEach((line, index) => {
    const match = JS_TEST_START.exec(line) ?? PY_TEST_START.exec(line)
    if (!match || /\.(?:todo|skip)\(/.test(line)) {
      return
    }
    const isPython = PY_TEST_START.test(line)
    const { end, isClosed } = blockEnd({ lines, start: index, indent: match[1] ?? '', isPython })
    blocks.push({ start: index, header: line, body: lines.slice(index + 1, end), isClosed })
  })
  return blocks
}

export function hasNoAssertion(block: TestBlock): boolean {
  return block.isClosed && block.body.length > 0 && !block.body.some(line => ASSERTION.test(line)) && !ASSERTION.test(block.header)
}

export function hasOnlyWeakAssertions(block: TestBlock): boolean {
  const assertions = block.body.filter(line => ASSERTION.test(line))
  return block.isClosed && assertions.length > 0 && assertions.every(line => WEAK_ASSERTION.test(line))
}
