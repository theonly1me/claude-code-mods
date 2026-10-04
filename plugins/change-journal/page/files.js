(function () {
  'use strict'

  const J = window.Journal

  function aggregate(edits) {
    const byPath = new Map()
    edits
      .filter(edit => edit.status === 'applied')
      .forEach(edit => {
        const entry = byPath.get(edit.path) || { path: edit.path, added: 0, removed: 0, count: 0, lastAt: 0 }
        entry.added += edit.added
        entry.removed += edit.removed
        entry.count += 1
        entry.lastAt = Math.max(entry.lastAt, edit.at)
        byPath.set(edit.path, entry)
      })
    return [...byPath.values()].sort((first, second) => second.added + second.removed - (first.added + first.removed))
  }

  J.views.files = function (root) {
    const { el, state } = J
    const files = aggregate(state.data.edits)
    if (files.length === 0) {
      root.replaceChildren(
        el('div', { class: 'empty' }, [el('h2', { text: 'No files changed yet' }), el('p', { text: 'Files Claude changes are listed here, the busiest first.' })]),
      )
      return
    }
    const peak = Math.max(...files.map(file => file.added + file.removed), 1)
    const rows = files.map(file =>
      el(
        'tr',
        {
          tabindex: 0,
          onclick: () => J.select({ file: file.path, tab: 'changes', follow: false }),
          onkeydown: event => {
            if (event.key === 'Enter') J.select({ file: file.path, tab: 'changes', follow: false })
          },
        },
        [
          el('td', { class: 'path', text: file.path }),
          el(
            'td',
            {},
            el('div', { class: 'churn', title: '+' + file.added + ' −' + file.removed }, [
              el('span', { class: 'a', style: 'width:' + (file.added / peak) * 100 + '%' }),
              el('span', { class: 'r', style: 'width:' + (file.removed / peak) * 100 + '%' }),
            ]),
          ),
          el('td', { text: '+' + file.added + ' −' + file.removed }),
          el('td', { text: file.count === 1 ? '1 edit' : file.count + ' edits' }),
          el('td', { class: 'when', text: J.clock(file.lastAt) }),
        ],
      ),
    )
    root.replaceChildren(
      el('table', { class: 'files' }, [
        el(
          'thead',
          {},
          el('tr', {}, ['File', 'Churn', 'Lines', 'Edits', 'Last change'].map((label, index) => el('th', { class: index === 4 ? 'when' : '', text: label }))),
        ),
        el('tbody', {}, rows),
      ]),
    )
  }
})()
