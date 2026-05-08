import { createContext, useContext, type ReactNode } from "react";
import type { SessionConnection } from "../../project-discovery/types";

const SessionConnectionContext = createContext<SessionConnection | null>(null);

export function SessionConnectionProvider({
  session,
  children,
}: {
  session: SessionConnection;
  children: ReactNode;
}) {
  return (
    <SessionConnectionContext.Provider value={session}>
      {children}
    </SessionConnectionContext.Provider>
  );
}

export function useSessionConnection(): SessionConnection | null {
  return useContext(SessionConnectionContext);
}
