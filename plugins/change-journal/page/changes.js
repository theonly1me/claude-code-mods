(function () {
  'use strict'

  const J = window.Journal
  const PREVIEW_LINES = 240
  const expanded = new Set()
  let lastScrolled = null
  const SOURCE_LABEL = { Edit: 'Edit', Write: 'Write', NotebookEdit: 'Notebook', Command: 'Outside change' }
  const STATUS_LABEL = { applied: 'Applied', failed: 'Failed', denied: 'Denied' }

  function diffTable(edit, hunks) {
    const { el } = J
    const rows = []
    let budget = expanded.has(edit.id) ? Infinity : PREVIEW_LINES
    let hidden = 0
    hunks.forEach(hunk => {
      let oldLine = hunk.oldStart
      let newLine = hunk.newStart
      const end = hunk.newStart + Math.max(0, hunk.newLines - 1)
      rows.push(el('tr', { class: 'hunk' }, el('td', { colspan: 3, text: 'Lines ' + hunk.newStart + ' to ' + end })))
      hunk.lines.forEach(line => {
        const sign = line[0]
        const kind = sign === '+' ? 'plus' : sign === '-' ? 'minus' : 'same'
        const oldNumber = sign === '+' ? '' : oldLine++
        const newNumber = sign === '-' ? '' : newLine++
        if (budget <= 0) {
          hidden += 1
          return
        }
        budget -= 1
        rows.push(
          el('tr', { class: kind }, [
            el('td', { class: 'num', text: oldNumber }),
            el('td', { class: 'num', text: newNumber }),
            el('td', { class: 'code', text: line }),
          ]),
        )
      })
    })
    const table = el('table', { class: 'diff' }, el('tbody', {}, rows))
    if (hidden === 0) return table
    const more = el('button', {
      class: 'more',
      type: 'button',
      text: 'Show ' + hidden + ' more lines',
      onclick: () => {
        expanded.add(edit.id)
        J.render()
      },
    })
    return el('div', {}, [table, more])
  }

  function card(edit) {
    const { el, state } = J
    const kind = edit.source === 'Command' ? 'command' : edit.status
    const { dir, base } = J.splitPath(edit.path)
    const hunks = edit.hunkCount > 0 ? J.hunksOf(edit.id) : []
    const classes = ['card']
    if (state.focus === edit.id) classes.push('is-focused')
    if (!state.seen.has(edit.id)) classes.push('is-fresh')
    let body
    if (hunks === null) body = el('p', { class: 'quiet', text: 'Loading the diff' })
    else if (hunks.length === 0) body = el('p', { class: 'quiet', text: edit.status === 'applied' ? 'No line changes to show.' : 'Nothing changed on disk.' })
    else body = diffTable(edit, hunks)
    return el('article', { class: classes.join(' '), id: 'edit-' + edit.id }, [
      el('header', { class: 'card-head' }, [
        el('span', { class: 'pill ' + kind, text: edit.source === 'Command' ? SOURCE_LABEL.Command : STATUS_LABEL[edit.status] }),
        el('span', { class: 'path' }, [el('span', { class: 'dir', text: dir }), base]),
        edit.source === 'Command' ? null : el('span', { class: 'meta', text: SOURCE_LABEL[edit.source] }),
        el('span', { class: 'meta', text: '+' + edit.added + ' −' + edit.removed }),
        el('span', { class: 'meta', text: J.clock(edit.at) }),
      ]),
      edit.reason ? el('p', { class: 'why' }, [el('b', { text: edit.isReasonInferred ? 'Likely reason, inferred after the turn' : "Claude's reason" }), edit.reason]) : null,
      edit.note ? el('p', { class: 'note', text: edit.note }) : null,
      body,
    ])
  }

  function turnHead(turn) {
    const { el, state } = J
    const pending = { waiting: 'A summary of this turn is on its way.', running: 'Writing a summary of this turn.' }
    return el('div', { class: 'turn-head' }, [
      el('div', { class: 'label', text: 'Turn ' + turn.index + ' at ' + J.clock(turn.startedAt) }),
      el('h2', { text: J.turnTitle(turn) }),
      turn.summary ? el('p', { class: 'asked', text: 'You asked: ' + turn.prompt }) : null,
      turn.summary ? el('p', { class: 'explain', text: turn.summary.explanation }) : null,
      pending[turn.summaryStatus] ? el('p', { class: 'pending', text: pending[turn.summaryStatus] }) : null,
      state.data.liveSummaries ? null : el('p', { class: 'pending', text: 'Turn summaries are off. Turn on "Turn summaries" in /plugin to get explanations.' }),
    ])
  }

  function testList(tests) {
    const { el } = J
    if (tests.length === 0) return null
    return el(
      'ul',
      { class: 'tests' },
      tests.map(test => el('li', { class: test.isPassing ? 'pass' : 'fail', text: (test.isPassing ? '✓ ' : '✗ ') + test.command })),
    )
  }

  function fileHistory(root) {
    const { el, state } = J
    const edits = state.data.edits.filter(edit => edit.path === state.file)
    root.replaceChildren(
      el('div', { class: 'filter' }, [
        state.file,
        el('button', { type: 'button', text: 'Show all files', onclick: () => J.select({ file: null }) }),
      ]),
      el('div', { class: 'turn-head' }, el('h2', { text: 'Every change to ' + J.splitPath(state.file).base })),
      ...edits.map(card),
    )
  }

  J.views.changes = function (root) {
    const { el, state } = J
    if (state.file) return fileHistory(root)
    const turn = state.data.turns.find(candidate => candidate.index === state.turn)
    if (!turn) {
      root.replaceChildren(
        el('div', { class: 'empty' }, [
          el('h2', { text: 'Waiting for the first edit' }),
          el('p', { text: 'Leave this page open. Each change Claude makes appears here with its diff and the reason behind it.' }),
        ]),
      )
      return
    }
    root.replaceChildren(turnHead(turn), testList(J.testsOf(turn.index)) || '', ...J.editsOf(turn.index).map(card))
    const focused = state.focus === null ? null : document.getElementById('edit-' + state.focus)
    if (focused && state.focus !== lastScrolled) {
      lastScrolled = state.focus
      focused.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }
})()
