export type CaptureCandidateResult =
  | {
      isEmpty: false;
      candidateCommit: string;
      patchContent: string;
    }
  | {
      isEmpty: true;
      candidateCommit: null;
      patchContent: null;
    };

export type CommandResult = {
  command: string;
  cwd: string;
  exitCode: number;
  success: boolean;
  timedOut: boolean;
  outputTruncated: boolean;
  stdout: string;
  stderr: string;
  changedFiles: string[];
};
