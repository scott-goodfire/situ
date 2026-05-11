import { HomeCardsView, type HomeCardLink } from "@situ/web-app-ui";
import { Link } from "@tanstack/react-router";
import { useActiveResearchProject } from "../../hooks/research-projects";

export function HomePage() {
  const { isKickedOff } = useActiveResearchProject();
  const cards: HomeCardLink[] = [
    {
      id: "project",
      title: "Project",
      description: isKickedOff
        ? "View progress, tasks, and verifications for the active research project."
        : "Set up a research project or finish onboarding the manager.",
      href: "/project",
      renderLink: ({ children }) => <Link to="/project">{children}</Link>,
    },
  ];
  if (isKickedOff) {
    cards.push({
      id: "feed",
      title: "Feed",
      description: "Scribe-narrated live activity for the session.",
      href: "/feed",
      renderLink: ({ children }) => <Link to="/feed">{children}</Link>,
    });
    cards.push({
      id: "dashboard",
      title: "Dashboard",
      description: "Cross-cutting view of hypotheses, experiments, and measurements.",
      href: "/dashboard",
      renderLink: ({ children }) => <Link to="/dashboard">{children}</Link>,
    });
  }
  return <HomeCardsView cards={cards} />;
}
