export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function printOk(data: Record<string, unknown>): void {
  printJson({
    ok: true,
    ...data,
  });
}

export function printError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);

  printJson({
    ok: false,
    error: "execution_error",
    message,
  });
}
