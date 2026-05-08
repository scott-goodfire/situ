import type { Meta, StoryObj } from "@storybook/react";
import { mono } from "../../utilities.css";
import { DxTable, type DxTableColumn } from "./dx-table";

type Row = {
  id: string;
  status: string;
  note: string;
};

const rows: Row[] = [
  {
    id: "EX1",
    status: "completed",
    note: "Baseline evidence recorded.",
  },
  {
    id: "EX2",
    status: "running",
    note: "Testing retrieval filtering on cancellation tickets.",
  },
  {
    id: "EX3",
    status: "concern",
    note: "Result shape changed after an eval-adjacent file moved.",
  },
];

const columns: Array<DxTableColumn<Row>> = [
  {
    id: "id",
    header: "Experiment",
    width: "220px",
    renderCell: ({ row }) => <span className={mono}>{row.id}</span>,
    sortValue: ({ row }) => row.id,
  },
  {
    id: "status",
    header: "Status",
    width: "140px",
    renderCell: ({ row }) => row.status,
    sortValue: ({ row }) => row.status,
  },
  {
    id: "note",
    header: "Note",
    renderCell: ({ row }) => row.note,
  },
];

const meta = {
  title: "UI/Dx Table",
  component: DxTable<Row>,
  args: {
    columns,
    rows,
    getRowKey: ({ row }) => row.id,
    emptyLabel: "No rows yet",
  },
} satisfies Meta<typeof DxTable<Row>>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Populated: Story = {};

export const CompactScrollable: Story = {
  args: {
    rows: Array.from({ length: 18 }, (_, index) => {
      const row = rows[index % rows.length];

      return {
        ...row,
        id: `exp_${String(index + 1).padStart(3, "0")}`,
      };
    }),
    density: "compact",
    maxHeight: "260px",
    stickyHeader: true,
    sortable: true,
    animateRows: true,
    autoScroll: true,
    getRowTone: ({ row }) => {
      if (row.status === "concern") {
        return "warning";
      }

      return "neutral";
    },
  },
};

export const Empty: Story = {
  args: {
    rows: [],
  },
};
