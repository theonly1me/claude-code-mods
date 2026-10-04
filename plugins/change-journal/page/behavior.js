(function () {
  'use strict'

  const J = window.Journal

  function refs(step) {
    const { el, state } = J
    const known = step.editIds.filter(id => state.data.edits.some(edit => edit.id === id))
    if (known.length === 0) return null
    return el(
      'div',
      { class: 'refs' },
      known.map(id => {
        const edit = state.data.edits.find(candidate => candidate.id === id)
        return el('button', {
          type: 'button',
          text: J.splitPath(edit.path).base,
          title: 'Show this edit',
          onclick: () => J.select({ tab: 'changes', turn: edit.turn, focus: id, follow: false, file: null }),
        })
      }),
    )
  }

  function flow(options) {
    const { el } = J
    return el('div', { class: 'flow' }, [
      el('h3', { text: options.title }),
      el(
        'ol',
        {},
        options.steps.map(step =>
          el('li', { class: step.isChanged ? 'changed' : '' }, [el('div', { text: step.text }), refs(step)]),
        ),
      ),
    ])
  }

  function turnFlows(turn) {
    const { el } = J
    const summary = turn.summary
    return el('section', { class: 'behavior-turn' }, [
      el('div', { class: 'turn-head' }, [
        el('div', { class: 'label', text: 'Turn ' + turn.index + ' at ' + J.clock(turn.startedAt) }),
        el('h2', { text: summary.title }),
        el('p', { class: 'explain', text: summary.explanation }),
      ]),
      el('div', { class: 'flows' }, [
        flow({ title: 'Before this turn', steps: summary.before }),
        flow({ title: 'After this turn', steps: summary.after }),
      ]),
    ])
  }

  J.views.behavior = function (root) {
    const { el, state } = J
    const turns = state.data.turns.filter(turn => turn.summary && turn.summary.after.length > 0).reverse()
    const selected = turns.find(turn => turn.index === state.turn)
    const ordered = selected ? [selected, ...turns.filter(turn => turn !== selected)] : turns
    if (ordered.length > 0) {
      root.replaceChildren(...ordered.map(turnFlows))
      return
    }
    const isWorking = state.data.turns.some(turn => turn.summaryStatus === 'waiting' || turn.summaryStatus === 'running')
    const message = !state.data.liveSummaries
      ? 'Behavior flows come from turn summaries, which are off. Turn on "Turn summaries" in /plugin.'
      : isWorking
        ? 'The first flow is being written. It appears here in a few seconds.'
        : 'When a turn with edits ends, this view shows how the code behaved before and after it.'
    root.replaceChildren(el('div', { class: 'empty' }, [el('h2', { text: 'No behavior flows yet' }), el('p', { text: message })]))
  }
})()
