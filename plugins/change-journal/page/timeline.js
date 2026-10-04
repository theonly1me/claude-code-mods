(function () {
  'use strict'

  const J = window.Journal

  function editNode(edit, newestId) {
    const { el, state } = J
    const kind = edit.source === 'Command' ? 'command' : edit.status
    const classes = ['edit-node', kind]
    if (state.focus === edit.id && !state.file) classes.push('is-selected')
    if (edit.id === newestId) classes.push('is-newest')
    return el(
      'button',
      {
        class: classes.join(' '),
        type: 'button',
        title: edit.path,
        onclick: () => J.select({ turn: edit.turn, focus: edit.id, follow: false, file: null, tab: 'changes' }),
      },
      [
        el('span', { class: 'name', text: J.splitPath(edit.path).base }),
        el('span', { class: 'counts', text: edit.status === 'applied' ? '+' + edit.added + ' −' + edit.removed : edit.status }),
      ],
    )
  }

  function testNode(test) {
    const { el } = J
    return el(
      'button',
      {
        class: 'test-node' + (test.isPassing ? '' : ' failing'),
        type: 'button',
        title: test.command,
        onclick: () => J.select({ turn: test.turn, focus: null, follow: false, file: null, tab: 'changes' }),
      },
      el('span', { class: 'cmd', text: test.command }),
    )
  }

  J.views.rail = function (root) {
    const { el, state } = J
    const turns = J.activeTurns().slice().reverse()
    const lastEdit = state.data.edits[state.data.edits.length - 1]
    const newestId = lastEdit && Date.now() - lastEdit.at < 60 * 1000 ? lastEdit.id : null
    if (turns.length === 0) {
      root.replaceChildren(el('p', { class: 'rail-empty', text: 'Turns appear here as Claude edits files.' }))
      return
    }
    root.replaceChildren(
      ...turns.map(turn => {
        const isSelected = state.turn === turn.index && state.focus === null && !state.file
        return el('div', { class: 'turn-group' }, [
          el(
            'button',
            {
              class: 'turn-node' + (isSelected ? ' is-selected' : ''),
              type: 'button',
              'data-index': turn.index,
              onclick: () => J.select({ turn: turn.index, focus: null, follow: false, file: null, tab: 'changes' }),
            },
            [el('span', { class: 'title', text: J.turnTitle(turn) }), el('span', { class: 'when', text: J.clock(turn.startedAt) })],
          ),
          ...J.editsOf(turn.index).map(edit => editNode(edit, newestId)),
          ...J.testsOf(turn.index).map(testNode),
        ])
      }),
    )
  }
})()
