import type { EntityLinkRecord } from "../domain/records";
import { daysAgo, hoursAgo } from "./helpers";

export const ENTITY_LINK_FIXTURES: EntityLinkRecord[] = [
  {
    id: "lnk_01",
    fromKind: "hypothesis",
    fromId: "hyp_01HZQK5J7C8X3Q9V",
    toKind: "experiment",
    toId: "exp_01HZQK5J7C8X3Q9V",
    relationship: "tested-by",
    createdAt: daysAgo(2),
  },
  {
    id: "lnk_02",
    fromKind: "hypothesis",
    fromId: "hyp_01HZQK5J7C8X3Q9V",
    toKind: "experiment",
    toId: "exp_02HZQK5J7C8X3Q9V",
    relationship: "forked-into",
    createdAt: daysAgo(1),
  },
  {
    id: "lnk_03",
    fromKind: "hypothesis",
    fromId: "hyp_02HZQK5J7C8X3Q9V",
    toKind: "experiment",
    toId: "exp_04HZQK5J7C8X3Q9V",
    relationship: "tested-by",
    createdAt: hoursAgo(5),
  },
  {
    id: "lnk_04",
    fromKind: "hypothesis",
    fromId: "hyp_03HZQK5J7C8X3Q9V",
    toKind: "experiment",
    toId: "exp_03HZQK5J7C8X3Q9V",
    relationship: "tested-by",
    createdAt: daysAgo(8),
  },
  {
    id: "lnk_05",
    fromKind: "experiment",
    fromId: "exp_01HZQK5J7C8X3Q9V",
    toKind: "evaluation",
    toId: "evl_01HZQK5J7C8X3Q9V",
    relationship: "evaluated-by",
    createdAt: hoursAgo(8),
  },
];
