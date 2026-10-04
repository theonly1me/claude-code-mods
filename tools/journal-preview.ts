import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { creationHunk, parseUnifiedDiff } from '../plugins/change-journal/hooks/journal/diff.ts'
import { takeWrites } from '../plugins/change-journal/hooks/journal/output.ts'
import {
  addEdit,
  addTest,
  beginTurn,
  endTurn,
  finishSummary,
  recordReason,
  resetJournal,
} from '../plugins/change-journal/hooks/journal/state.ts'

const PAGE_FILES = ['index.html', 'style.css', 'core.js', 'timeline.js', 'changes.js', 'behavior.js', 'files.js']
const root = resolve(import.meta.dirname, '..')
const [output = resolve(root, '.cache/journal-preview')] = process.argv.slice(2)
const now = Date.now()
const minute = 60 * 1000

const cartDiff = `@@ -1,9 +1,18 @@
 import { prices } from './prices.js'

 export function addItem(cart, sku, quantity = 1) {
-  cart.items.push({ sku, quantity })
+  const existing = cart.items.find(item => item.sku === sku)
+  if (existing) {
+    existing.quantity += quantity
+    return cart
+  }
+  cart.items.push({ sku, quantity })
   return cart
 }
+
+export function cartTotal(cart) {
+  return cart.items.reduce((sum, item) => sum + prices[item.sku] * item.quantity, 0)
+}`

resetJournal({ sessionId: 'demo', project: 'cart-api', root: '/demo/cart-api', folder: output, startedAt: now - 30 * minute })
beginTurn({ at: now - 12 * minute, prompt: 'Merge duplicate cart lines and add a cart total endpoint' })
recordReason({ toolUseId: 'a', reason: 'Adding the same SKU twice creates two lines today. I will merge quantities in addItem and add a cartTotal helper next to it.' })
addEdit({ toolUseId: 'a', source: 'Edit', path: 'src/cart.js', status: 'applied', hunks: parseUnifiedDiff(cartDiff), note: '', at: now - 11 * minute })
recordReason({ toolUseId: 'b', reason: 'The route should reuse cartTotal so the endpoint and the helper always agree.' })
addEdit({
  toolUseId: 'b',
  source: 'Write',
  path: 'src/routes/total.js',
  status: 'applied',
  hunks: [creationHunk("import { cartTotal } from '../cart.js'\n\nexport function totalRoute(request, reply) {\n  reply.send({ total: cartTotal(request.cart) })\n}\n")],
  note: '',
  at: now - 10 * minute,
})
recordReason({ toolUseId: 'c', reason: 'A test pins the merge so the duplicate-line bug cannot come back.' })
addEdit({
  toolUseId: 'c',
  source: 'Edit',
  path: 'test/cart.test.js',
  status: 'applied',
  hunks: parseUnifiedDiff("@@ -8,3 +8,9 @@\n test('adds an item', () => {\n   expect(addItem(cart(), 'tea').items).toHaveLength(1)\n })\n+\n+test('merges the same sku', () => {\n+  const merged = addItem(addItem(cart(), 'tea'), 'tea', 2)\n+  expect(merged.items).toEqual([{ sku: 'tea', quantity: 3 }])\n+})"),
  note: '',
  at: now - 9 * minute,
})
addTest({ command: 'npm test', isPassing: false, at: now - 8 * minute })
addEdit({ toolUseId: 'd', source: 'Edit', path: 'package.json', status: 'denied', hunks: [], note: '', at: now - 7 * minute })
addTest({ command: 'npm test', isPassing: true, at: now - 6 * minute })
endTurn(now - 5 * minute)
finishSummary({
  index: 1,
  summary: {
    title: 'Merge duplicate cart lines and add totals',
    explanation:
      'Adding an item that is already in the cart now raises its quantity, so a cart never holds two lines for one SKU. A new cartTotal helper prices the cart, and a /total route returns it. Check that prices covers every SKU, because a missing price makes the total NaN.',
    before: [
      { text: 'addItem always pushes a new line', isChanged: false, editIds: [] },
      { text: 'The same SKU twice gives two lines', isChanged: false, editIds: [] },
      { text: 'No way to ask for the cart total', isChanged: false, editIds: [] },
    ],
    after: [
      { text: 'addItem looks for a line with the same SKU', isChanged: true, editIds: [1] },
      { text: 'A match raises its quantity, otherwise a new line is added', isChanged: true, editIds: [1, 3] },
      { text: 'GET /total sums price times quantity', isChanged: true, editIds: [1, 2] },
    ],
    editReasons: [],
  },
})
beginTurn({ at: now - 2 * minute, prompt: 'Format the repo' })
addEdit({ toolUseId: '', source: 'Command', path: 'src/prices.js', status: 'applied', hunks: parseUnifiedDiff("@@ -1,3 +1,3 @@\n-export const prices = {tea:4,coffee:5}\n+export const prices = { tea: 4, coffee: 5 }\n"), note: 'changed outside Edit and Write (a command, a tool, or you); the diff shows every uncommitted change in this file', at: now - minute })
endTurn(now - 30 * 1000)

await mkdir(output, { recursive: true })
for (const name of PAGE_FILES) {
  await copyFile(resolve(root, 'plugins/change-journal/page', name), resolve(output, name))
}
const writes = takeWrites(now - 20 * 1000)
for (const edit of writes.edits) {
  await writeFile(resolve(output, `edit-${edit.id}.js`), edit.text)
}
await writeFile(resolve(output, 'data.js'), writes.data ?? '')
console.log(`journal preview: ${resolve(output, 'index.html')}`)
