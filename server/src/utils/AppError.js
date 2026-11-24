// An error we expect and can describe to the user (wrong password, duplicate email, ...).
// Anything that is NOT an AppError is treated as a bug: the details stay in the server log
// and the browser gets a generic message.
export class AppError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.fields = fields;
  }
}
