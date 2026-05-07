import { EventEmitter } from "node:events";
import { render as inkRender } from "ink";
import type { ReactElement } from "react";

type TestWriteCallback = (error?: Error | null) => void;

export type TestInkInstance = {
  rerender: (tree: ReactElement) => void;
  unmount: () => void;
  cleanup: () => void;
  stdin: TestStdin;
  stdout: TestStdout;
  stderr: TestStdout;
  frames: string[];
  lastFrame: () => string | undefined;
};

export class TestStdout extends EventEmitter {
  readonly isTTY = true;
  readonly frames: string[] = [];
  columns: number;
  rows: number;
  private currentFrame: string | undefined;

  constructor({
    columns = 120,
    rows = 36,
  }: {
    columns?: number;
    rows?: number;
  } = {}) {
    super();
    this.columns = columns;
    this.rows = rows;
  }

  write = (
    data: string | Uint8Array,
    callback?: TestWriteCallback,
  ): boolean => {
    const frame = String(data);
    this.frames.push(frame);
    this.currentFrame = frame;
    callback?.(null);
    return true;
  };

  lastFrame = (): string | undefined => this.currentFrame;

  getColorDepth = (): number => 8;

  hasColors = (): boolean => true;
}

export class TestStdin extends EventEmitter {
  readonly isTTY = true;
  private currentData: string | null = null;

  write = (data: string): boolean => {
    this.currentData = data;
    this.emit("readable");
    this.emit("data", data);
    return true;
  };

  setEncoding = (): void => {};

  setRawMode = (): void => {};

  resume = (): void => {};

  pause = (): void => {};

  ref = (): void => {};

  unref = (): void => {};

  read = (): string | null => {
    const data = this.currentData;
    this.currentData = null;
    return data;
  };
}

export function renderInk(
  tree: ReactElement,
  {
    columns,
    rows,
  }: {
    columns?: number;
    rows?: number;
  } = {},
): TestInkInstance {
  const stdout = new TestStdout({ columns, rows });
  const stderr = new TestStdout({ columns, rows });
  const stdin = new TestStdin();
  const instance = inkRender(tree, {
    stdout: stdout as unknown as NodeJS.WriteStream,
    stderr: stderr as unknown as NodeJS.WriteStream,
    stdin: stdin as unknown as NodeJS.ReadStream,
    debug: true,
    exitOnCtrlC: false,
    interactive: true,
    patchConsole: false,
  });

  return {
    rerender: instance.rerender,
    unmount: instance.unmount,
    cleanup: instance.cleanup,
    stdin,
    stdout,
    stderr,
    frames: stdout.frames,
    lastFrame: stdout.lastFrame,
  };
}
