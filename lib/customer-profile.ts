export function validateCustomerProfile(name: string, phone: string) {
  if (name.trim().length < 2 || name.trim().length > 100 || /[\r\n]/.test(name))
    return "Enter your full name (2–100 characters).";
  if (!/^\+?[0-9 ()-]{7,25}$/.test(phone.trim()) || phone.replace(/\D/g, "").length < 7)
    return "Enter a valid phone number, including your country code.";
  return null;
}
