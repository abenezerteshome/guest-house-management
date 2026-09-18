/**
 * Utility for robust room number parsing and ascending sorting.
 * Correctly handles pure numbers ("101"), numbers with prefixes ("Room 104", "Suite 201"),
 * and alphanumeric suffixes ("104A", "104B").
 */
export function extractRoomNumber(roomNumber: string | undefined | null): number {
  if (!roomNumber) return Infinity
  const match = String(roomNumber).match(/\d+/)
  return match ? parseInt(match[0], 10) : Infinity
}

export function compareRoomsAscending<T extends { room_number: string }>(a: T, b: T): number {
  const numA = extractRoomNumber(a.room_number)
  const numB = extractRoomNumber(b.room_number)
  if (numA !== numB) {
    return numA - numB
  }
  return String(a.room_number).localeCompare(String(b.room_number), undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

export function sortRoomsAscending<T extends { room_number: string }>(rooms: T[]): T[] {
  return [...rooms].sort(compareRoomsAscending)
}
