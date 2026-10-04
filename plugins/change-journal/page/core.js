(function () {
  'use strict'

  const POLL_MS = 1500
  const LIVE_WINDOW_MS = 90 * 1000
  const state = {
    data: null,
    requested: new Set(),
    seen: new Set(),
    tab: 'changes',
    turn: null,
    focus: null,
    follow: true,
    file: null,
    lastUpdate: 0,
  }
  const views = {}

  function el(tag, props, children) {
    const node = document.createElement(tag)
    Object.entries(props || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === false) return
      if (key === 'class') node.className = value
      else if (key === 'text') node.textContent = value
      else if (key.startsWith('on')) node.addEventListener(key.slice(2), value)
      else node.setAttribute(key, value === true ? '' : String(value))
    })
    ;[].concat(children === undefined ? [] : children).forEach(child => {
      if (child === null || child === undefined || child === false) return
      node.append(child instanceof Node ? child : document.createTextNode(String(child)))
    })
    return node
  }

  function loadScript(src, done) {
    const script = document.createElement('script')
    script.src = src
    script.onload = () => {
      script.remove()
      if (done) done()
    }
    script.onerror = () => script.remove()
    document.head.append(script)
  }

  function clock(ms) {
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  function splitPath(path) {
    const index = path.lastIndexOf('/')
    return index < 0 ? { dir: '', base: path } : { dir: path.slice(0, index + 1), base: path.slice(index + 1) }
  }

  function turnTitle(turn) {
    return turn.summary ? turn.summary.title : turn.prompt
  }

  function editsOf(turnIndex) {
    return state.data ? state.data.edits.filter(edit => edit.turn === turnIndex) : []
  }

  function testsOf(turnIndex) {
    return state.data ? state.data.tests.filter(test => test.turn === turnIndex) : []
  }

  function activeTurns() {
    if (!state.data) return []
    return state.data.turns.filter(turn => editsOf(turn.index).length > 0 || testsOf(turn.index).length > 0)
  }

  function hunksOf(id) {
    const loaded = window.__changeJournalEdits || {}
    if (loaded[id]) return loaded[id].hunks
    if (!state.requested.has(id)) {
      state.requested.add(id)
      loadScript('edit-' + id + '.js?t=' + Date.now(), render)
    }
    return null
  }

  function select(next) {
    Object.assign(state, next)
    document.getElementById('follow').hidden = state.follow
    render()
  }

  function followNewest() {
    const turns = activeTurns()
    const newest = turns[turns.length - 1]
    if (!newest) return
    const edits = editsOf(newest.index)
    state.turn = newest.index
    state.focus = edits.length > 0 ? edits[edits.length - 1].id : null
  }

  function renderHeader() {
    const data = state.data
    const live = document.getElementById('live')
    if (!data) {
      live.textContent = 'Waiting for data'
      return
    }
    const isLive = Date.now() - data.updatedAt < LIVE_WINDOW_MS
    live.className = isLive ? 'live is-live' : 'live'
    live.textContent = isLive ? 'Live' : 'Last change at ' + clock(data.updatedAt)
    document.getElementById('project').textContent = data.project
    document.getElementById('subtitle').textContent = 'Change Journal for the session that started at ' + clock(data.startedAt)
    document.getElementById('stat-files').textContent = data.totals.files
    document.getElementById('stat-added').textContent = '+' + data.totals.added
    document.getElementById('stat-removed').textContent = '−' + data.totals.removed
    const checks = data.totals.passing + data.totals.failing
    document.getElementById('stat-tests').textContent = checks === 0 ? '' : data.totals.passing + ' of ' + checks + ' checks passed'
    document.title = data.project + ': Change Journal'
  }

  function render() {
    renderHeader()
    if (!state.data) return
    views.rail(document.getElementById('rail'))
    document.querySelectorAll('[role="tab"]').forEach(tab => {
      tab.setAttribute('aria-selected', String(tab.dataset.tab === state.tab))
    })
    views[state.tab](document.getElementById('view'))
    state.data.edits.forEach(edit => state.seen.add(edit.id))
  }

  function onData() {
    const data = window.__changeJournal
    if (!data || data.updatedAt === state.lastUpdate) return
    const isFirst = state.data === null
    state.data = data
    state.lastUpdate = data.updatedAt
    if (isFirst) data.edits.forEach(edit => state.seen.add(edit.id))
    if (state.follow) followNewest()
    render()
  }

  function poll() {
    loadScript('data.js?t=' + Date.now(), onData)
  }

  function readHash() {
    const params = new URLSearchParams(location.hash.slice(1))
    const tab = params.get('tab')
    if (tab && views[tab]) state.tab = tab
    if (params.has('turn')) {
      state.turn = Number(params.get('turn'))
      state.follow = false
    }
  }

  function start() {
    readHash()
    document.querySelectorAll('[role="tab"]').forEach(tab => {
      tab.addEventListener('click', () => select({ tab: tab.dataset.tab }))
    })
    document.getElementById('follow').addEventListener('click', () => {
      state.follow = true
      state.file = null
      followNewest()
      select({ tab: 'changes' })
    })
    poll()
    setInterval(poll, POLL_MS)
    setInterval(renderHeader, 10 * 1000)
  }

  window.Journal = { state, views, el, clock, splitPath, turnTitle, editsOf, testsOf, activeTurns, hunksOf, select, render }
  window.addEventListener('load', start)
})()
