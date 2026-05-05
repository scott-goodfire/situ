import type { Meta, StoryObj } from "@storybook/react";
import { DxTable, type DxTableColumn } from "./dx-table";

type Row = {
  id: string;
  status: string;
  note: string;
};

const columns: Array<DxTableColumn<Row>> = [
  {
    id: "id",
    header: "Experiment",
    width: "220px",
    renderCell: ({ row }) => <span className="dx-mono">{row.id}</span>,
  },
  {
    id: "status",
    header: "Status",
    width: "140px",
    renderCell: ({ row }) => row.status,
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
    rows: [
      {
        id: "exp_001",
        status: "completed",
        note: "Baseline evidence recorded.",
      },
      {
        id: "exp_002",
        status: "running",
        note: "Testing retrieval filtering on cancellation tickets.",
      },
    ],
    getRowKey: ({ row }) => row.id,
    emptyLabel: "No rows yet",
  },
} satisfies Meta<typeof DxTable<Row>>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Populated: Story = {};

export const Empty: Story = {
  args: {
    rows: [],
  },
};
