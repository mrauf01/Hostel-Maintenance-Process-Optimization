export const PHONE_DIGITS = 10;

export function digitsOnlyPhone(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, PHONE_DIGITS);
}

export function normalizePhone(raw: string): { phone?: string; error?: string } {
  const phone = digitsOnlyPhone(raw);
  if (!phone) return { error: "Enter a contact number." };
  if (phone.length !== PHONE_DIGITS) {
    return { error: `Contact number must be ${PHONE_DIGITS} digits.` };
  }
  return { phone };
}
