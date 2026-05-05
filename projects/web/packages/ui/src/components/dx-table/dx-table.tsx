import type { ReactNode } from "react";

export type DxTableColumn<Row> = {
  id: string;
  header: ReactNode;
  width?: string;
  renderCell: ({ row }: { row: Row }) => ReactNode;
};

export function DxTable<Row>({
  columns,
  rows,
  getRowKey,
  emptyLabel,
}: {
  columns: Array<DxTableColumn<Row>>;
  rows: Row[];
  getRowKey: ({ row }: { row: Row }) => string;
  emptyLabel: ReactNode;
}) {
  if (rows.length === 0) {
    return <p className="dx-muted">{emptyLabel}</p>;
  }

  return (
    <div className="dx-table__scroll">
      <table className="dx-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.id} style={columnStyle({ column })}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey({ row })}>
              {columns.map((column) => (
                <td key={column.id}>{column.renderCell({ row })}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function columnStyle<Row>({
  column,
}: {
  column: DxTableColumn<Row>;
}): { width?: string } | undefined {
  if (!column.width) {
    return undefined;
  }

  return { width: column.width };
}
