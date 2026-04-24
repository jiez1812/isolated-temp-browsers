export function reorder(ids: string[], fromId: string, toId: string): string[] {
  const from = ids.indexOf(fromId)
  const to = ids.indexOf(toId)
  if (from === -1 || to === -1 || from === to) return ids
  const arr = [...ids]
  arr.splice(to, 0, arr.splice(from, 1)[0])
  return arr
}
