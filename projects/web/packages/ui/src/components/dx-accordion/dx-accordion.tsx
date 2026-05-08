import { Accordion } from "@base-ui/react/accordion";
import type { ReactNode } from "react";
import * as s from "./dx-accordion.css";

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
    <Accordion.Root className={s.accordion} defaultValue={defaultOpen}>
      {items.map((item) => (
        <Accordion.Item key={item.id} value={item.id} className={s.item}>
          <Accordion.Header className={s.header}>
            <Accordion.Trigger className={s.trigger}>
              <span className={s.question}>{item.question}</span>
              <svg
                className={s.chevron}
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
          <Accordion.Panel className={s.panel}>
            <div className={s.answer}>{item.answer}</div>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
