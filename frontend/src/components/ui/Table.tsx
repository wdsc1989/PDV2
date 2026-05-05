"use client";

export interface TableColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  actions?: (row: T) => React.ReactNode;
  keyExtractor: (row: T) => string | number;
  getRowClassName?: (row: T) => string;
}

export function Table<T>({ columns, data, actions, keyExtractor, getRowClassName }: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                {col.label}
              </th>
            ))}
            {actions && <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Ações</th>}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row) => (
            <tr key={keyExtractor(row)} className={`hover:bg-gray-50 ${getRowClassName ? getRowClassName(row) : ""}`}>
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-sm text-gray-700">
                  {col.render ? col.render(row) : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                </td>
              ))}
              {actions && <td className="px-4 py-3 text-sm"><div className="flex flex-wrap gap-2">{actions(row)}</div></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
