import type { ReactElement } from "react";

export type TuiStory = {
  id: string;
  title: string;
  name: string;
  render: () => ReactElement;
};
