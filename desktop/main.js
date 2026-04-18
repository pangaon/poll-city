const {
  app,
  BrowserWindow,
  shell,
  Tray,
  Menu,
  nativeImage,
  Notification,
} = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const fs = require('fs')

const APP_URL = 'https://app.poll.city'
const APP_PROTOCOL = 'pollcity'
const windowStatePath = path.join(app.getPath('userData'), 'window-state.json')

let mainWindow = null
let tray = null

// ─── Window state ───────────────────────────────────────────────────────────

function loadWindowState() {
  try {
    return JSON.parse(fs.readFileSync(windowStatePath, 'utf8'))
  } catch {
    return { width: 1400, height: 900 }
  }
}

function saveWindowState(win) {
  if (!win || win.isMinimized() || win.isMaximized()) return
  fs.writeFileSync(windowStatePath, JSON.stringify(win.getBounds()))
}

// ─── App icon ────────────────────────────────────────────────────────────────

function getAppIcon() {
  const name =
    process.platform === 'win32'
      ? 'icon.ico'
      : process.platform === 'darwin'
        ? 'icon.icns'
        : 'icon.png'
  const p = path.join(__dirname, 'assets', name)
  return fs.existsSync(p) ? p : undefined
}

function getTrayIcon() {
  const p = path.join(__dirname, 'assets', 'tray-icon.png')
  if (fs.existsSync(p)) {
    return nativeImage.createFromPath(p).resize({ width: 16, height: 16 })
  }
  return nativeImage.createEmpty()
}

// ─── Main window ─────────────────────────────────────────────────────────────

function createWindow() {
  const state = loadWindowState()

  mainWindow = new BrowserWindow({
    width: state.width || 1400,
    height: state.height || 900,
    x: state.x,
    y: state.y,
    minWidth: 1024,
    minHeight: 768,
    // Native traffic lights on Mac, standard frame on Windows
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#0A2342',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    icon: getAppIcon(),
    show: false,
  })

  mainWindow.loadURL(APP_URL)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    if (state.maximized) mainWindow.maximize()
  })

  mainWindow.on('close', () => saveWindowState(mainWindow))
  mainWindow.on('resize', () => saveWindowState(mainWindow))
  mainWindow.on('move', () => saveWindowState(mainWindow))

  // External links open in the system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (
      !url.startsWith('https://app.poll.city') &&
      !url.startsWith('https://poll.city')
    ) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  // Show offline page when the network is unreachable
  mainWindow.webContents.on('did-fail-load', () => {
    mainWindow.loadFile(path.join(__dirname, 'offline.html'))
  })

  return mainWindow
}

// ─── System tray ─────────────────────────────────────────────────────────────

function createTray() {
  tray = new Tray(getTrayIcon())
  tray.setToolTip('Poll City')

  const menu = Menu.buildFromTemplate([
    {
      label: 'Open Poll City',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      },
    },
    { type: 'separator' },
    {
      label: 'Check for Updates',
      click: () => autoUpdater.checkForUpdatesAndNotify(),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setContextMenu(menu)
  tray.on('double-click', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })
}

// ─── Deep links: pollcity:// ──────────────────────────────────────────────────

function registerProtocol() {
  if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(APP_PROTOCOL, process.execPath, [
      path.resolve(process.argv[1]),
    ])
  } else {
    app.setAsDefaultProtocolClient(APP_PROTOCOL)
  }
}

function handleDeepLink(url) {
  if (!url.startsWith(`${APP_PROTOCOL}://`)) return
  const route = url.replace(`${APP_PROTOCOL}://`, '')
  mainWindow?.loadURL(`${APP_URL}/${route}`)
  mainWindow?.show()
  mainWindow?.focus()
}

// ─── Auto-updater ────────────────────────────────────────────────────────────

function setupAutoUpdater() {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    new Notification({
      title: 'Poll City Update Available',
      body: `Version ${info.version} is downloading in the background.`,
    }).show()
  })

  autoUpdater.on('update-downloaded', () => {
    new Notification({
      title: 'Update Ready',
      body: 'Restart Poll City to apply the latest update.',
    }).show()
  })

  // Check 30s after launch, then every 4 hours
  setTimeout(() => autoUpdater.checkForUpdatesAndNotify(), 30_000)
  setInterval(() => autoUpdater.checkForUpdatesAndNotify(), 4 * 60 * 60 * 1_000)
}

// ─── Single instance lock (Windows deep links) ───────────────────────────────

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    const url = argv.find((a) => a.startsWith(`${APP_PROTOCOL}://`))
    if (url) handleDeepLink(url)
    mainWindow?.show()
    mainWindow?.focus()
  })
}

// ─── App lifecycle ───────────────────────────────────────────────────────────

app.whenReady().then(() => {
  registerProtocol()
  createWindow()
  createTray()
  setupAutoUpdater()

  // macOS: re-open window when clicking the dock icon
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else {
      mainWindow?.show()
      mainWindow?.focus()
    }
  })
})

// macOS: handle deep link on a running app
app.on('open-url', (event, url) => {
  event.preventDefault()
  handleDeepLink(url)
})

// Keep app alive in tray on Windows/Linux when last window closes
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Tray is still running — don't quit
  }
})

app.on('before-quit', () => {
  app.isQuitting = true
})
