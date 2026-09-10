export const minimumPasswordLength = 8;

export function getPasswordValidationError(password: string) {
  if (password.length < minimumPasswordLength) {
    return `Password must be at least ${minimumPasswordLength} characters.`;
  }

  return null;
}
