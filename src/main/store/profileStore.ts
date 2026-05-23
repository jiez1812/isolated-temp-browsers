import { join, basename } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs'
import { readdir, readFile } from 'fs/promises'
import type { Profile } from '../../shared/types'
import { settingsStore } from './settingsStore'

const dir = (): string => {
  const d = settingsStore.getDataDir('profiles')
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
  return d
}

const filePath = (id: string): string => {
  const safe = basename(id).replace(/[^a-zA-Z0-9_-]/g, '')
  if (!safe) throw new Error(`Invalid id: ${id}`)
  return join(dir(), `${safe}.json`)
}

export const profileStore = {
  async list(): Promise<Profile[]> {
    const d = dir()
    const files = (await readdir(d)).filter((f) => f.endsWith('.json'))
    return Promise.all(
      files.map(async (f) => JSON.parse(await readFile(join(d, f), 'utf-8')) as Profile)
    )
  },

  load(id: string): Profile | null {
    const p = filePath(id)
    if (!existsSync(p)) return null
    return JSON.parse(readFileSync(p, 'utf-8')) as Profile
  },

  save(profile: Profile): void {
    writeFileSync(filePath(profile.id), JSON.stringify(profile, null, 2), 'utf-8')
  },

  delete(id: string): void {
    const p = filePath(id)
    if (existsSync(p)) rmSync(p)
  }
}
