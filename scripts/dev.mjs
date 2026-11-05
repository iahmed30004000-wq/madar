import { spawn, spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const children = []
function start(args) {
  const child = spawn(process.execPath, args, { cwd: root, env: process.env, stdio: 'inherit', windowsHide: true })
  children.push(child)
  return child
}
function stop(child) {
  if (!child?.pid || child.killed) return
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true })
  else child.kill('SIGTERM')
}

const api = start(['server/index.mjs'])
const vite = start(['node_modules/vite/bin/vite.js', ...process.argv.slice(2)])
let closing = false
function close(code = 0) {
  if (closing) return
  closing = true
  stop(api); stop(vite)
  setTimeout(() => process.exit(code), 250)
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => close(0))
for (const child of [api, vite]) {
  child.on('error', () => close(1))
  child.on('exit', code => { if (!closing) close(code || 0) })
}
