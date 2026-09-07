import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

export interface Column<T> {
  key?: string
  header: string
  accessorKey?: keyof T
  cell?: (item: T, index: number) => ReactNode
  render?: (item: T, index: number) => ReactNode
  align?: 'left' | 'center' | 'right'
  width?: string
}

export type TableColumn<T> = Column<T>

export interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  emptyMessage?: string
  keyExtractor?: (item: T, index: number) => string | number
  onRowClick?: (item: T) => void
  isLoading?: boolean
  className?: string
}

export function Table<T>({
  columns,
  data,
  emptyMessage = 'No records found.',
  keyExtractor,
  onRowClick,
  isLoading = false,
  className = '',
}: TableProps<T>) {
  return (
    <div
      className={`w-full overflow-hidden rounded-2xl border border-[#DDDDDD] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)] ${className}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#DDDDDD] bg-[#F7F7F7]">
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  style={{ width: col.width }}
                  className={`px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[#717171] ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0F0]">
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-12 text-center text-sm text-[#717171]"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-[#FF385C]" />
                    <span>Loading data...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-12 text-center text-sm text-[#717171]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, rowIdx) => (
                <tr
                  key={keyExtractor ? keyExtractor(item, rowIdx) : rowIdx}
                  onClick={() => onRowClick?.(item)}
                  className={`group transition-colors duration-150 ${
                    onRowClick ? 'cursor-pointer hover:bg-[#F9F9F9]' : 'hover:bg-[#FAFAFA]'
                  }`}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.key || colIdx}
                      className={`px-5 py-4 text-sm text-[#222222] ${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      }`}
                    >
                      {col.render
                        ? col.render(item, rowIdx)
                        : col.cell
                        ? col.cell(item, rowIdx)
                        : col.accessorKey
                        ? String(item[col.accessorKey] ?? '')
                        : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
