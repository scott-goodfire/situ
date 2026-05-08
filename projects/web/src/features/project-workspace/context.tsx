import { createContext, useContext, type ReactNode } from "react";
import type { ProjectWorkspaceData } from "./types";

const ProjectWorkspaceContext = createContext<ProjectWorkspaceData | null>(null);

export function ProjectWorkspaceProvider({
  data,
  children,
}: {
  data: ProjectWorkspaceData;
  children: ReactNode;
}) {
  return (
    <ProjectWorkspaceContext.Provider value={data}>
      {children}
    </ProjectWorkspaceContext.Provider>
  );
}

export function useProjectWorkspaceData(): ProjectWorkspaceData {
  const data = useContext(ProjectWorkspaceContext);

  if (!data) {
    throw new Error("Project workspace data is not available");
  }

  return data;
}
