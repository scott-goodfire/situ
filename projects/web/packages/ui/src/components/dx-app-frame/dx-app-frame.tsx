import type { ReactNode } from "react";
import * as s from "./dx-app-frame.css";

export function DxAppFrame({
  sidebar,
  topBar,
  children,
  fullBleed = false,
}: {
  sidebar: ReactNode;
  topBar?: ReactNode;
  children: ReactNode;
  /**
   * When true, the content slot drops its padding and outer scroll so the
   * child fills the viewport and manages its own scrolling. Use for routes
   * whose primary content (e.g. a research map) needs full-screen real estate.
   */
  fullBleed?: boolean;
}) {
  return (
    <div className={s.frame}>
      <aside className={s.sidebar}>{sidebar}</aside>
      <div className={s.main}>
        {topBar && <div className={s.topBar}>{topBar}</div>}
        <div className={fullBleed ? s.contentFullBleed : s.content}>{children}</div>
      </div>
    </div>
  );
}
