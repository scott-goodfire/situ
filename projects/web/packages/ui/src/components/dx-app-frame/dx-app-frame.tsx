import type { ReactNode } from "react";
import * as s from "./dx-app-frame.css";

export function DxAppFrame({
  sidebar,
  topBar,
  children,
}: {
  sidebar: ReactNode;
  topBar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={s.frame}>
      <aside className={s.sidebar}>{sidebar}</aside>
      <div className={s.main}>
        {topBar && <div className={s.topBar}>{topBar}</div>}
        <div className={s.content}>{children}</div>
      </div>
    </div>
  );
}
