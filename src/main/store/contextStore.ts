import { join, basename } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs'
import { readdir, readFile } from 'fs/promises'
import type { ContextBrowserConfig } from '../../shared/types'
import { settingsStore } from './settingsStore'

const dir = (): string => {
  const d = settingsStore.getDataDir('contexts')
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
  return d
}

const filePath = (id: string): string => {
  const safe = basename(id).replace(/[^a-zA-Z0-9_-]/g, '')
  if (!safe) throw new Error(`Invalid id: ${id}`)
  return join(dir(), `${safe}.json`)
}

export const contextStore = {
  async list(): Promise<ContextBrowserConfig[]> {
    const d = dir()
    const files = (await readdir(d)).filter((f) => f.endsWith('.json'))
    return Promise.all(
      files.map(async (f) => JSON.parse(await readFile(join(d, f), 'utf-8')) as ContextBrowserConfig)
    )
  },

  load(id: string): ContextBrowserConfig | null {
    const p = filePath(id)
    if (!existsSync(p)) return null
    return JSON.parse(readFileSync(p, 'utf-8')) as ContextBrowserConfig
  },

  save(config: ContextBrowserConfig): void {
    writeFileSync(filePath(config.id), JSON.stringify(config, null, 2), 'utf-8')
  },

  delete(id: string): void {
    const p = filePath(id)
    if (existsSync(p)) rmSync(p)
  }
}
