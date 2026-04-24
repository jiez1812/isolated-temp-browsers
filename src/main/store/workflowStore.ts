import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, rmSync } from 'fs'
import type { Workflow } from '../../shared/types'

const dir = (): string => {
  const d = join(app.getPath('userData'), 'workflows')
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
  return d
}

const filePath = (id: string): string => join(dir(), `${id}.json`)

export const workflowStore = {
  list(): Workflow[] {
    return readdirSync(dir())
      .filter((f) => f.endsWith('.json'))
      .map((f) => JSON.parse(readFileSync(join(dir(), f), 'utf-8')) as Workflow)
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
