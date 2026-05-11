import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { HomeCardsView, type HomeCardLink } from "./home-cards-view";

const meta: Meta<typeof HomeCardsView> = {
  title: "App UI/Home Cards",
  component: HomeCardsView,
};

export default meta;

type Story = StoryObj<typeof HomeCardsView>;

function anchorLink({ href }: { href: string }) {
  return ({ children }: { children: ReactNode }) => <a href={href}>{children}</a>;
}

const PROJECT_CARD: HomeCardLink = {
  id: "project",
  title: "Project",
  description: "View progress, tasks, and verifications for the active research project.",
  href: "/project",
  renderLink: anchorLink({ href: "/project" }),
};

const FEED_CARD: HomeCardLink = {
  id: "feed",
  title: "Feed",
  description: "Scribe-narrated live activity for the session.",
  href: "/feed",
  renderLink: anchorLink({ href: "/feed" }),
};

const DASHBOARD_CARD: HomeCardLink = {
  id: "dashboard",
  title: "Dashboard",
  description: "Cross-cutting view of hypotheses, experiments, and measurements.",
  href: "/dashboard",
  renderLink: anchorLink({ href: "/dashboard" }),
};

export const ProjectKickedOff: Story = {
  args: { cards: [PROJECT_CARD, FEED_CARD, DASHBOARD_CARD] },
};

export const ProjectNotStarted: Story = {
  args: {
    cards: [
      {
        ...PROJECT_CARD,
        description: "Set up a research project or finish onboarding the manager.",
      },
    ],
  },
};
