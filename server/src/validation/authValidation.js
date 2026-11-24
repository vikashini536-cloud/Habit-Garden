// Validation runs on the server. The browser may also check, but that is only for convenience:
// anyone can send requests without the browser's checks.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidTimezone(zone) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

// Shared password rule for signup and password change.
// bcrypt only reads the first 72 bytes, so longer passwords are refused rather than silently cut.
export function passwordProblem(password) {
  const bytes = Buffer.byteLength(password, 'utf8');
  if (!password) return 'Please choose a password.';
  if (bytes < 8) return 'Password must be at least 8 characters.';
  if (bytes > 72) return 'Password is too long. Please use 72 characters or fewer.';
  return null;
}

export function validateSignup(body) {
  const errors = {};

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  // Passwords are NOT trimmed. Leading or trailing spaces are part of the password.
  const password = typeof body.password === 'string' ? body.password : '';

  if (!name) {
    errors.name = 'Please enter your name.';
  } else if (name.length > 80) {
    errors.name = 'Name must be 80 characters or fewer.';
  }

  if (!email) {
    errors.email = 'Please enter your email address.';
  } else if (email.length > 255 || !EMAIL_PATTERN.test(email)) {
    errors.email = 'Please enter a valid email address.';
  }

  const problem = passwordProblem(password);
  if (problem) errors.password = problem;

  // The browser sends the user's timezone, e.g. "Asia/Kolkata". It is optional and defaults to UTC.
  let timezone = 'UTC';
  if (body.timezone !== undefined) {
    if (typeof body.timezone === 'string' && body.timezone.length <= 64 && isValidTimezone(body.timezone)) {
      timezone = body.timezone;
    } else {
      errors.timezone = 'Unknown timezone.';
    }
  }

  return { errors, values: { name, email, password, timezone } };
}

export function validateLogin(body) {
  const errors = {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email) errors.email = 'Please enter your email address.';
  if (!password) errors.password = 'Please enter your password.';
  // Upper limit only, to stop huge inputs from making bcrypt slow. No format rules at login.
  if (password.length > 1000) errors.password = 'Password is too long.';

  return { errors, values: { email, password } };
}

export function validateChangePassword(body) {
  const errors = {};
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

  if (!currentPassword) errors.currentPassword = 'Please enter your current password.';

  const problem = passwordProblem(newPassword);
  if (problem) {
    errors.newPassword = problem;
  } else if (newPassword === currentPassword) {
    errors.newPassword = 'Choose a password that is different from your current one.';
  }

  return { errors, values: { currentPassword, newPassword } };
}

export function validateDeleteAccount(body) {
  const errors = {};
  const password = typeof body.password === 'string' ? body.password : '';
  if (!password) errors.password = 'Please enter your password to confirm.';
  return { errors, values: { password } };
}
