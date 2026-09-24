const vscode = require('vscode')
const fs = require('fs/promises')
const path = require('path')

const BANK_REL = path.join('public', 'vfx', 'vfxbank.json')
// The preview is a dev-only page of the game itself, so `npm run dev` must run.
// vite.config.ts pins the dev server to this port.
const DEV_ORIGIN = 'http://localhost:8849'
const PREVIEW_URL = `${DEV_ORIGIN}/src/dev/vfxPreview.html`

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
    `frame-src ${DEV_ORIGIN}`,
  ].join('; ')
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<link rel="stylesheet" href="${css}">
<title>Particle Editor</title>
</head>
<body data-preview-url="${PREVIEW_URL}" data-preview-origin="${DEV_ORIGIN}">
<header>
  <button id="play">Play</button>
  <label class="check"><input id="repeat" type="checkbox" checked> Repeat</label>
  <button id="reset-spot" class="ghost">Reset spot</button>
  <span id="particles"></span>
  <div class="spacer"></div>
  <span id="status"></span>
  <button id="copy" class="ghost">Copy JSON</button>
  <button id="reload" class="ghost">Reload</button>
  <button id="save">Save</button>
</header>
<main>
  <aside>
    <h2>Effects</h2>
    <ul id="effects" class="list"></ul>
    <div class="row">
      <button id="add-effect" class="ghost">+ New</button>
      <button id="copy-effect" class="ghost">Duplicate</button>
      <button id="delete-effect" class="ghost danger">Delete</button>
    </div>
    <h2>Emitters</h2>
    <ul id="emitters" class="list"></ul>
    <div class="row">
      <button id="add-emitter" class="ghost">+ New</button>
      <button id="copy-emitter" class="ghost">Duplicate</button>
      <button id="delete-emitter" class="ghost danger">Delete</button>
    </div>
    <p class="meta">1 unit = 1 m at zoom 20. The avatar is 5.6 units tall, a companion cat 3.2.</p>
  </aside>
  <section id="detail"></section>
  <section id="preview">
    <iframe id="preview-frame" title="Particle preview"></iframe>
    <div id="preview-offline" hidden>
      <p>The preview needs the dev server.</p>
      <p>Run <code>npm run dev</code> in a terminal, then retry.</p>
      <button id="retry">Retry</button>
    </div>
  </section>
</main>
<script nonce="${n}" src="${js}"></script>
</body>
</html>`
}

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('lorewalk.particles.open', async () => {
      let root
      try {
        root = workspaceRoot()
      } catch (err) {
        vscode.window.showErrorMessage(err.message)
        return
      }

      const panel = vscode.window.createWebviewPanel('lorewalk.particles', 'Particle Editor', vscode.ViewColumn.One, {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
      })

      const sendInit = async () => {
        try {
          panel.webview.postMessage({ type: 'init', bank: await readBank(root) })
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
        if (msg.type === 'copy') {
          await vscode.env.clipboard.writeText(msg.text)
          vscode.window.setStatusBarMessage('Particle effect copied as JSON', 3000)
        }
      }, undefined, context.subscriptions)

      panel.webview.html = html(panel.webview, context.extensionUri)
    })
  )
}

function deactivate() {}

module.exports = { activate, deactivate }
