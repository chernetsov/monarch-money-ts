export class CliError extends Error {
  readonly code: string;
  readonly exitCode: number;
  readonly details?: unknown;

  constructor(code: string, message: string, exitCode = 1, details?: unknown) {
    super(message);
    this.name = 'CliError';
    this.code = code;
    this.exitCode = exitCode;
    this.details = details;
  }
}

export function writeSuccess(data: unknown): void {
  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        data,
      },
      null,
      2,
    ) + '\n',
  );
}

export function writeError(error: unknown): number {
  const cliError =
    error instanceof CliError
      ? error
      : new CliError(
          'COMMAND_FAILED',
          error instanceof Error ? error.message : String(error),
          classifyExitCode(error),
        );

  const payload: Record<string, unknown> = {
    ok: false,
    error: {
      code: cliError.code,
      message: cliError.message,
      ...(cliError.details === undefined ? {} : { details: cliError.details }),
    },
  };

  process.stderr.write(JSON.stringify(payload, null, 2) + '\n');
  return cliError.exitCode;
}

function classifyExitCode(error: unknown): number {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (/auth|token|login|credential|mfa/.test(message)) return 2;
    if (/graphql|mutation|api/.test(message)) return 3;
    if (/zod|schema|validation|parse/.test(message)) return 4;
    if (/network|fetch|rate|timeout|429/.test(message)) return 5;
  }
  return 1;
}
