import { Accordion } from "@base-ui/react/accordion";
import type { ReactNode } from "react";

export type DxAccordionItem = {
  id: string;
  question: ReactNode;
  answer: ReactNode;
};

export function DxAccordion({
  items,
  defaultOpen,
}: {
  items: DxAccordionItem[];
  defaultOpen?: string[];
}) {
  return (
    <Accordion.Root className="dx-accordion" defaultValue={defaultOpen}>
      {items.map((item) => (
        <Accordion.Item key={item.id} value={item.id} className="dx-accordion__item">
          <Accordion.Header className="dx-accordion__header">
            <Accordion.Trigger className="dx-accordion__trigger">
              <span className="dx-accordion__question">{item.question}</span>
              <svg
                className="dx-accordion__chevron"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel className="dx-accordion__panel">
            <div className="dx-accordion__answer">{item.answer}</div>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
