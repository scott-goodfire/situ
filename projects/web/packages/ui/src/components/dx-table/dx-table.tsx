import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type Header,
  type Row as TableRow,
  type SortingState,
} from "@tanstack/react-table";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { muted } from "../../utilities.css";
import * as s from "./dx-table.css";

export type DxTableColumn<Row> = {
  id: string;
  header: ReactNode;
  width?: string;
  renderCell: ({ row }: { row: Row }) => ReactNode;
  sortValue?: ({ row }: { row: Row }) => number | string | null | undefined;
};

export type DxTableDensity = "regular" | "compact";

export type DxTableRowTone = "neutral" | "success" | "warning" | "danger";

export function DxTable<Row>({
  columns,
  rows,
  getRowKey,
  emptyLabel,
  density = "regular",
  maxHeight,
  stickyHeader = false,
  sortable = false,
  animateRows = false,
  autoScroll = false,
  getRowTone,
}: {
  columns: Array<DxTableColumn<Row>>;
  rows: Row[];
  getRowKey: ({ row }: { row: Row }) => string;
  emptyLabel: ReactNode;
  density?: DxTableDensity;
  maxHeight?: string;
  stickyHeader?: boolean;
  sortable?: boolean;
  animateRows?: boolean;
  autoScroll?: boolean;
  getRowTone?: ({ row }: { row: Row }) => DxTableRowTone;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const prefersReducedMotion = useReducedMotion();

  const tableColumns = useMemo(
    () =>
      columns.map(
        (column): ColumnDef<Row> => ({
          id: column.id,
          header: () => column.header,
          cell: ({ row }) => column.renderCell({ row: row.original }),
          accessorFn: column.sortValue ? (row) => column.sortValue?.({ row }) ?? "" : undefined,
          enableSorting: sortable && Boolean(column.sortValue),
          meta: {
            width: column.width,
          },
        }),
      ),
    [columns, sortable],
  );

  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getRowId: (row) => getRowKey({ row }),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const tableRows = table.getRowModel().rows;
  const scrollTrigger = tableRows.map((row) => row.id).join("");
  const autoScrollState = usePinnedAutoScroll({
    enabled: autoScroll,
    smooth: prefersReducedMotion !== true,
    trigger: scrollTrigger,
  });
  const shouldAnimateRows = animateRows && prefersReducedMotion !== true;

  if (rows.length === 0) {
    return <p className={muted}>{emptyLabel}</p>;
  }

  return (
    <div
      className={s.scroll}
      ref={autoScrollState.scrollRef}
      style={scrollStyle({ maxHeight })}
      onScroll={autoScrollState.handleScroll}
    >
      <table className={s.table} data-density={density} data-sticky-header={stickyHeader}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} style={columnStyle({ columnDef: header.column.columnDef })}>
                  <DxTableHeader header={header} />
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {tableRows.map((tableRow) =>
              renderTableRow({
                tableRow,
                shouldAnimateRows,
                getRowTone,
              }),
            )}
          </AnimatePresence>
        </tbody>
      </table>
      <div className={s.scrollAnchor} ref={autoScrollState.anchorRef} />
    </div>
  );
}

function DxTableHeader<Row>({ header }: { header: Header<Row, unknown> }) {
  const canSort = header.column.getCanSort();
  const sortDirection = header.column.getIsSorted();
  const label = flexRender(header.column.columnDef.header, header.getContext());

  if (!canSort) {
    return <span className={s.headerLabel}>{label}</span>;
  }

  const sortLabel = (() => {
    if (sortDirection === "asc") {
      return "ascending";
    }

    if (sortDirection === "desc") {
      return "descending";
    }

    return "unsorted";
  })();

  const sortIndicator = sortIndicatorLabel({ sortDirection });

  return (
    <button
      className={s.headerButton}
      type="button"
      onClick={header.column.getToggleSortingHandler()}
      aria-label={`${String(header.column.id)} ${sortLabel}`}
    >
      <span className={s.headerLabel}>{label}</span>
      {sortIndicator && (
        <span className={s.sortIndicator} aria-hidden="true">
          {sortIndicator}
        </span>
      )}
    </button>
  );
}

function sortIndicatorLabel({ sortDirection }: { sortDirection: false | "asc" | "desc" }): string {
  if (sortDirection === "asc") {
    return "A-Z";
  }

  if (sortDirection === "desc") {
    return "Z-A";
  }

  return "";
}

function renderTableRow<Row>({
  tableRow,
  shouldAnimateRows,
  getRowTone,
}: {
  tableRow: TableRow<Row>;
  shouldAnimateRows: boolean;
  getRowTone?: ({ row }: { row: Row }) => DxTableRowTone;
}) {
  const tone = getRowTone?.({ row: tableRow.original }) ?? "neutral";
  const cells = tableRow.getVisibleCells().map((cell) => (
    <td key={cell.id}>
      <div className={s.cell}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
    </td>
  ));

  if (shouldAnimateRows) {
    return (
      <motion.tr
        key={tableRow.id}
        data-tone={tone}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
      >
        {cells}
      </motion.tr>
    );
  }

  return (
    <tr key={tableRow.id} data-tone={tone}>
      {cells}
    </tr>
  );
}

function columnStyle<Row>({
  columnDef,
}: {
  columnDef: ColumnDef<Row>;
}): { width?: string } | undefined {
  const meta = columnDef.meta as { width?: string } | undefined;

  if (!meta?.width) {
    return undefined;
  }

  return { width: meta.width };
}

function scrollStyle({ maxHeight }: { maxHeight: string | undefined }): CSSProperties | undefined {
  if (!maxHeight) {
    return undefined;
  }

  return { maxHeight };
}

function usePinnedAutoScroll({
  enabled,
  smooth,
  trigger,
}: {
  enabled: boolean;
  smooth: boolean;
  trigger: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const pinnedToBottomRef = useRef(true);
  const lastTriggerRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const scrollElement = scrollRef.current;
    if (!scrollElement) {
      return;
    }

    pinnedToBottomRef.current = isPinnedToBottom({ element: scrollElement });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      lastTriggerRef.current = trigger;
      return;
    }

    const isInitialScroll = lastTriggerRef.current === undefined;

    if (!isInitialScroll && lastTriggerRef.current === trigger) {
      return;
    }

    lastTriggerRef.current = trigger;

    if (!isInitialScroll && !pinnedToBottomRef.current) {
      return;
    }

    anchorRef.current?.scrollIntoView({
      block: "end",
      behavior: smooth ? "smooth" : "auto",
    });
  }, [enabled, smooth, trigger]);

  return {
    scrollRef,
    anchorRef,
    handleScroll: () => {
      const scrollElement = scrollRef.current;

      if (!scrollElement) {
        return;
      }

      pinnedToBottomRef.current = isPinnedToBottom({ element: scrollElement });
    },
  };
}

function isPinnedToBottom({ element }: { element: HTMLDivElement }): boolean {
  const distanceToBottom = element.scrollHeight - element.scrollTop - element.clientHeight;

  return distanceToBottom < 32;
}
