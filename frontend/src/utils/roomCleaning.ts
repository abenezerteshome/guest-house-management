const STORAGE_KEY = 'haven_house_cleaning_rooms'

export function getCleaningRooms(): Record<number, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, number>
    const now = Date.now()
    const valid: Record<number, number> = {}
    for (const [idStr, expiry] of Object.entries(parsed)) {
      const roomId = Number(idStr)
      if (expiry > now) {
        valid[roomId] = expiry
      }
    }
    return valid
  } catch {
    return {}
  }
}

export function setRoomCleaning(roomId: number, durationMs = 60 * 60 * 1000): string {
  const expiry = Date.now() + durationMs
  try {
    const current = getCleaningRooms()
    current[roomId] = expiry
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    // ignore
  }
  return new Date(expiry).toISOString()
}

export function clearRoomCleaning(roomId: number): void {
  try {
    const current = getCleaningRooms()
    delete current[roomId]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    // ignore
  }
}
