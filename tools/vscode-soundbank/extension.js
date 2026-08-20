const vscode = require('vscode')
const fs = require('fs/promises')
const path = require('path')

const BANK_REL = path.join('public', 'sounds', 'soundbank.json')
const PACKS_REL = path.join('public', 'sounds', 'packs')
const AUDIO_EXT = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.flac'])

function workspaceRoot() {
  const folder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0]
  if (!folder) throw new Error('Open the lorewalk-web folder first.')
  return folder.uri.fsPath
}

async function readBank(root) {
  const raw = await fs.readFile(path.join(root, BANK_REL), 'utf8')
  return JSON.parse(raw)
}

async function writeBank(root, bank) {
  const file = path.join(root, BANK_REL)
  await fs.writeFile(file, JSON.stringify(bank, null, 2) + '\n', 'utf8')
}

// A pack is a directory of samples plus an optional pack.json. The manifest is
// metadata only - the sample list always comes from what is on disk, so
// dropping a new CC0 pack in needs no hand-editing to show up here.
async function scanPacks(root) {
  const dir = path.join(root, PACKS_REL)
  let entries = []
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
  const packs = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const packDir = path.join(dir, entry.name)
    let manifest = {}
    try {
      manifest = JSON.parse(await fs.readFile(path.join(packDir, 'pack.json'), 'utf8'))
    } catch {
      manifest = {}
    }
    const files = (await fs.readdir(packDir)).filter((f) => AUDIO_EXT.has(path.extname(f).toLowerCase())).sort()
    const labels = new Map((manifest.samples || []).map((s) => [s.file, s.label]))
    packs.push({
      id: entry.name,
      name: manifest.name || entry.name,
      author: manifest.author || '',
      license: manifest.license || '',
      attribution: manifest.attribution || '',
      samples: files.map((file) => ({ file, label: labels.get(file) || '' })),
    })
  }
  return packs
}

function nonce() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function html(webview, extensionUri) {
  const n = nonce()
  const css = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'editor.css'))
  const js = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'editor.js'))
  const csp = [
    "default-src 'none'",
    `style-src ${webview.cspSource}`,
    `script-src 'nonce-${n}'`,
    `media-src ${webview.cspSource}`,
    `connect-src ${webview.cspSource}`,
  ].join('; ')
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<link rel="stylesheet" href="${css}">
<title>Soundbank</title>
</head>
<body>
<header>
  <div class="bank-field"><label for="pack">Pack</label><select id="pack"></select></div>
  <div class="bank-field"><label for="master">Master gain</label><input id="master" type="range" min="0" max="1" step="0.01"><output id="master-out"></output></div>
  <div class="spacer"></div>
  <span id="status"></span>
  <button id="reload" class="ghost">Reload</button>
  <button id="save">Save</button>
</header>
<main>
  <aside>
    <h2>Events</h2>
    <ul id="events"></ul>
    <button id="add-event" class="ghost">+ Add event</button>
    <p id="pack-meta"></p>
  </aside>
  <section id="detail"></section>
</main>
<script nonce="${n}" src="${js}"></script>
</body>
</html>`
}

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('lorewalk.soundbank.open', async () => {
      let root
      try {
        root = workspaceRoot()
      } catch (err) {
        vscode.window.showErrorMessage(err.message)
        return
      }

      const panel = vscode.window.createWebviewPanel('lorewalk.soundbank', 'Soundbank', vscode.ViewColumn.One, {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'media'),
          vscode.Uri.file(path.join(root, 'public', 'sounds')),
        ],
      })

      const sendInit = async () => {
        try {
          const [bank, packs] = await Promise.all([readBank(root), scanPacks(root)])
          const packBase = panel.webview.asWebviewUri(vscode.Uri.file(path.join(root, PACKS_REL))).toString()
          panel.webview.postMessage({ type: 'init', bank, packs, packBase })
        } catch (err) {
          panel.webview.postMessage({ type: 'error', message: String(err.message || err) })
        }
      }

      panel.webview.onDidReceiveMessage(async (msg) => {
        if (msg.type === 'ready' || msg.type === 'reload') return sendInit()
        if (msg.type === 'save') {
          try {
            await writeBank(root, msg.bank)
            panel.webview.postMessage({ type: 'saved' })
          } catch (err) {
            panel.webview.postMessage({ type: 'error', message: String(err.message || err) })
          }
        }
      }, undefined, context.subscriptions)

      panel.webview.html = html(panel.webview, context.extensionUri)
    })
  )
}

function deactivate() {}

module.exports = { activate, deactivate }
