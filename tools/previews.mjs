import { access, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = resolve(import.meta.dirname, '..')
const marketplace = JSON.parse(await readFile(resolve(root, '.claude-plugin/marketplace.json'), 'utf8'))
const sections = []

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

for (const plugin of marketplace.plugins) {
  const storyboard = resolve(root, 'tools/storyboards', `${plugin.name}.ts`)
  if (await exists(storyboard)) {
    for (const tool of ['tools/storyboard.mjs', 'tools/animate.mjs']) {
      const result = spawnSync(process.execPath, ['--import', './tools/typescript-loader.mjs', tool, plugin.name], { cwd: root, stdio: 'inherit' })
      if (result.status !== 0) process.exit(1)
    }
  }
  const hasAnimation = await exists(resolve(root, 'plugins', plugin.name, 'assets/preview.gif'))
  const hasImage = await exists(resolve(root, 'plugins', plugin.name, 'assets/preview.png'))
  const image = `../plugins/${plugin.name}/assets/preview.${hasAnimation ? 'gif' : 'png'}`
  sections.push(
    `<section><h2>${plugin.name}</h2><p>${plugin.description}</p>${hasAnimation || hasImage ? `<img src="${image}" alt="${plugin.name} preview">` : ''}</section>`,
  )
}

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Claude Code Mods</title>
<style>
body { background: #101522; color: #f5ead3; font: 16px/1.5 system-ui, sans-serif; max-width: 1100px; margin: 40px auto; padding: 0 16px; }
h1, h2 { color: #ffd166; } section { margin: 40px 0; } p { color: #b8b3c9; }
img { width: 100%; image-rendering: pixelated; border-radius: 12px; }
</style>
</head>
<body>
<h1>Claude Code Mods</h1>
<p>Each game preview is an animation rendered by the mod's own simulation. The work mods show captures from real sessions.</p>
${sections.join('\n')}
</body>
</html>
`
await writeFile(resolve(root, 'previews/index.html'), page)
console.log(`Wrote previews/index.html with ${sections.length} mods`)
