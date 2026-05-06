import { Tabs } from "@base-ui/react/tabs";
import type { ReactNode } from "react";
import * as s from "./dx-tabs.css";

export type DxTabItem = {
  id: string;
  label: ReactNode;
  content: ReactNode;
};

export function DxTabs({
  tabs,
  defaultTab,
  onTabChange,
}: {
  tabs: DxTabItem[];
  defaultTab?: string;
  onTabChange?: ({ tabId }: { tabId: string }) => void;
}) {
  const initial = defaultTab ?? tabs[0]?.id;

  return (
    <Tabs.Root
      className={s.tabs}
      defaultValue={initial}
      onValueChange={(value) => {
        if (typeof value === "string") {
          onTabChange?.({ tabId: value });
        }
      }}
    >
      <Tabs.List className={s.list}>
        {tabs.map((tab) => (
          <Tabs.Tab key={tab.id} value={tab.id} className={s.tab}>
            {tab.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {tabs.map((tab) => (
        <Tabs.Panel key={tab.id} value={tab.id} className={s.panel}>
          {tab.content}
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}
