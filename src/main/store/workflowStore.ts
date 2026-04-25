import { app } from 'electron'
import { join, basename } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs'
import { readdir, readFile } from 'fs/promises'
import type { Workflow } from '../../shared/types'

const dir = (): string => {
  const d = join(app.getPath('userData'), 'workflows')
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
  return d
}

const filePath = (id: string): string => {
  const safe = basename(id).replace(/[^a-zA-Z0-9_-]/g, '')
  if (!safe) throw new Error(`Invalid id: ${id}`)
  return join(dir(), `${safe}.json`)
}

export const workflowStore = {
  async list(): Promise<Workflow[]> {
    const d = dir()
    const files = (await readdir(d)).filter((f) => f.endsWith('.json'))
    return Promise.all(
      files.map(async (f) => JSON.parse(await readFile(join(d, f), 'utf-8')) as Workflow)
    )
  },

  load(id: string): Workflow | null {
    const p = filePath(id)
    if (!existsSync(p)) return null
    return JSON.parse(readFileSync(p, 'utf-8')) as Workflow
  },

  save(workflow: Workflow): void {
    writeFileSync(filePath(workflow.id), JSON.stringify(workflow, null, 2), 'utf-8')
  },

  delete(id: string): void {
    const p = filePath(id)
    if (existsSync(p)) rmSync(p)
  }
}
