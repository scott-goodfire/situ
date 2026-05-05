import type { ReactNode } from "react";

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
    <div className="dx-app-frame">
      <aside className="dx-app-frame__sidebar">{sidebar}</aside>
      <div className="dx-app-frame__main">
        {topBar && <div className="dx-app-frame__top-bar">{topBar}</div>}
        <div className="dx-app-frame__content">{children}</div>
      </div>
    </div>
  );
}
