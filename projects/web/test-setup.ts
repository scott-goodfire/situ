// Vitest global setup for the web side. Loads jest-dom matchers and runs
// React Testing Library cleanup between tests. Referenced from
// `vitest.config.ts` and `projects/web/packages/app-ui/vitest.config.ts`.
import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
