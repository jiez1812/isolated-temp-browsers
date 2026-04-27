import { chromium, firefox } from 'playwright'
import { existsSync } from 'fs'
import type { Browser, BrowserContext } from 'playwright'
import type { WebContents } from 'electron'
import type { ContextBrowserConfig, BrowserType, AvailableBrowsers } from '../../shared/types'
import { IPC } from '../../shared/ipc'

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  `${process.env['LOCALAPPDATA']}\\Google\\Chrome\\Application\\chrome.exe`,
]

const FIREFOX_PATHS = [
  'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
  'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe',
]

function findExecutable(paths: string[]): string | null {
  return paths.find(p => existsSync(p)) ?? null
}

export function detectBrowsers(): AvailableBrowsers {
  return {
    edge: true,
    chrome: CHROME_PATHS.some(p => existsSync(p)),
    firefox: FIREFOX_PATHS.some(p => existsSync(p)),
  }
}

interface RunningContext {
  context: BrowserContext
  configId: string
  windowIndex: number
}

const MAX_WINDOW_SLOTS = 8

class BrowserManager {
  private browsers = new Map<BrowserType, Browser>()
  private running = new Map<string, RunningContext>()
  private launching = new Set<string>()
  private freeSlots = new Set<number>(Array.from({ length: MAX_WINDOW_SLOTS }, (_, i) => i))

  private async ensureBrowser(type: BrowserType): Promise<Browser> {
    const existing = this.browsers.get(type)
    if (existing && existing.isConnected()) return existing

    let browser: Browser
    if (type === 'chrome') {
      browser = await chromium.launch({ channel: 'chrome', headless: false })
    } else if (type === 'firefox') {
      const executablePath = findExecutable(FIREFOX_PATHS)
      if (!executablePath) throw new Error('Firefox executable not found')
      browser = await firefox.launch({ executablePath, headless: false })
    } else {
      browser = await chromium.launch({ channel: 'msedge', headless: false })
    }

    this.browsers.set(type, browser)
    return browser
  }

  async launch(config: ContextBrowserConfig, sender: WebContents): Promise<void> {
    const configId = config.id
    if (this.running.has(configId) || this.launching.has(configId)) return
    this.launching.add(configId)
    try {
      const browserType = config.browserType ?? 'edge'

      // Grab a slot before any await so concurrent launches each get a unique slot
      const windowIndex = this.freeSlots.size > 0 ? Math.min(...this.freeSlots) : 0
      this.freeSlots.delete(windowIndex)
      const cascadeOffset = windowIndex * 50

      const browser = await this.ensureBrowser(browserType)
      const context = await browser.newContext({ viewport: null })

      const labelName = config.name
      const labelColor = config.color ?? '#5b5bf0'
      await context.addInitScript(`
        (function () {
          var name = ${JSON.stringify(labelName)};
          var color = ${JSON.stringify(labelColor)};
          function inject() {
            if (document.getElementById('__ctx-label__')) return;
            var el = document.createElement('div');
            el.id = '__ctx-label__';
            el.style.cssText =
              'position:fixed;top:0;left:0;z-index:2147483647;' +
              'background:' + color + ';color:#fff;' +
              'font:600 11px/1 system-ui,sans-serif;' +
              'padding:3px 10px 4px;border-radius:0 0 8px 0;' +
              'pointer-events:none;opacity:0.88;letter-spacing:0.3px;' +
              'box-shadow:0 2px 6px rgba(0,0,0,0.4)';
            el.textContent = name;
            document.documentElement.appendChild(el);
          }
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', inject);
          } else {
            inject();
          }
        })();
      `)

      const page = await context.newPage()

      // CDP window positioning only works for Chromium-based browsers
      if (browserType !== 'firefox') {
        try {
          const session = await context.newCDPSession(page)
          const { windowId } = await session.send('Browser.getWindowForTarget', {})
          await session.send('Browser.setWindowBounds', {
            windowId,
            bounds: {
              left: 40 + cascadeOffset,
              top: 40 + cascadeOffset,
              width: config.windowSize.width,
              height: config.windowSize.height
            }
          })
          await session.detach()
        } catch {
          // Window positioning is best-effort; ignore CDP errors
        }
      }

      await page.goto(config.startupUrl)
      this.running.set(configId, { context, configId, windowIndex })

      page.on('close', () => {
        this.running.delete(configId)
        this.freeSlots.add(windowIndex)
        if (!sender.isDestroyed()) {
          sender.send(IPC.DEBUG_LOG, { level: 'info', message: `[browser] page closed — contextId=${configId}`, timestamp: Date.now() })
          sender.send(IPC.CONTEXT_CLOSED, configId)
        }
      })
    } finally {
      this.launching.delete(configId)
    }
  }

  async close(configId: string): Promise<void> {
    const entry = this.running.get(configId)
    if (!entry) return
    this.running.delete(configId)
    this.freeSlots.add(entry.windowIndex)
    await entry.context.close()
  }

  getContext(configId: string): BrowserContext | null {
    return this.running.get(configId)?.context ?? null
  }

  async closeAll(): Promise<void> {
    for (const [id] of this.running) {
      await this.close(id)
    }
    for (const [, browser] of this.browsers) {
      await browser.close()
    }
    this.browsers.clear()
    this.freeSlots = new Set<number>(Array.from({ length: MAX_WINDOW_SLOTS }, (_, i) => i))
  }
}

export const browserManager = new BrowserManager()
