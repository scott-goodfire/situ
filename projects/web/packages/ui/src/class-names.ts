import { classNameModule } from "./modules/class-name";

export function classNames({
  values,
}: {
  values: Array<string | false | null | undefined>;
}): string {
  return classNameModule.classNames({ values });
}
