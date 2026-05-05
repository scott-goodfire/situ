import { Tabs } from "@base-ui/react/tabs";
import type { ReactNode } from "react";

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
      className="dx-tabs"
      defaultValue={initial}
      onValueChange={(value) => {
        if (typeof value === "string") {
          onTabChange?.({ tabId: value });
        }
      }}
    >
      <Tabs.List className="dx-tabs__list">
        {tabs.map((tab) => (
          <Tabs.Tab key={tab.id} value={tab.id} className="dx-tabs__tab">
            {tab.label}
          </Tabs.Tab>
        ))}
        <Tabs.Indicator className="dx-tabs__indicator" />
      </Tabs.List>
      {tabs.map((tab) => (
        <Tabs.Panel key={tab.id} value={tab.id} className="dx-tabs__panel">
          {tab.content}
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}
