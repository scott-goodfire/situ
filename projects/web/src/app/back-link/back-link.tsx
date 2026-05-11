import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import * as s from "./back-link.css";

export function BackLink({ to, label }: { to: string; label: ReactNode }) {
  return (
    <Link to={to} className={s.link}>
      <ChevronLeft size={14} />
      {label}
    </Link>
  );
}
