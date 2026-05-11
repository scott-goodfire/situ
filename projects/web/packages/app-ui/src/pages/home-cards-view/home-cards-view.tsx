import { DxCard, DxSection } from "@situ/web-ui";
import type { ReactNode } from "react";
import * as s from "./home-cards-view.css";

export type HomeCardLink = {
  id: string;
  title: string;
  description: string;
  href: string;
  renderLink: ({ children }: { children: ReactNode }) => ReactNode;
};

export function HomeCardsView({ cards }: { cards: HomeCardLink[] }) {
  return (
    <DxSection title="Home">
      <ul className={s.grid}>
        {cards.map((card) => (
          <li key={card.id} className={s.gridItem}>
            {card.renderLink({
              children: (
                <DxCard interactive>
                  <div className={s.cardBody}>
                    <h3 className={s.cardTitle}>{card.title}</h3>
                    <p className={s.cardDescription}>{card.description}</p>
                  </div>
                </DxCard>
              ),
            })}
          </li>
        ))}
      </ul>
    </DxSection>
  );
}
