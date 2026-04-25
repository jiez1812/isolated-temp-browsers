import { app } from 'electron'
import { join, basename } from 'path'
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, rmSync } from 'fs'
import type { Profile } from '../../shared/types'

const dir = (): string => {
  const d = join(app.getPath('userData'), 'profiles')
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
  return d
}

const filePath = (id: string): string => {
  const safe = basename(id).replace(/[^a-zA-Z0-9_-]/g, '')
  if (!safe) throw new Error(`Invalid id: ${id}`)
  return join(dir(), `${safe}.json`)
}

export const profileStore = {
  list(): Profile[] {
    return readdirSync(dir())
      .filter((f) => f.endsWith('.json'))
      .map((f) => JSON.parse(readFileSync(join(dir(), f), 'utf-8')) as Profile)
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
