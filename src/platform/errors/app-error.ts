export class AppError extends Error {
  readonly isOperational = true;

  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "AppError";
  }
}
