import { style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const card = style({
  border: `1px solid ${vars.color.border01_5}`,
  borderRadius: vars.radius.md,
  background: vars.color.card01Hex,
});

export const paddingDefault = style({ padding: "12px 14px" });
export const paddingTight = style({ padding: "8px 10px" });
export const paddingNone = style({ padding: 0 });

export const warning = style({
  borderColor: `color-mix(in srgb, ${vars.color.warningStrong} 30%, transparent)`,
  background: vars.color.warningSoft,
});

export const danger = style({
  borderColor: `color-mix(in srgb, ${vars.color.dangerStrong} 30%, transparent)`,
  background: vars.color.dangerSoft,
});

export const interactive = style({
  cursor: "pointer",
  transition: `background-color ${vars.duration.fast} ${vars.ease.out}, border-color ${vars.duration.fast} ${vars.ease.out}`,
  ":hover": {
    borderColor: vars.color.border02,
    background: vars.color.card02Hex,
  },
});
