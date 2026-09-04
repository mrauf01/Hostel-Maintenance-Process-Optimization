export function normalizePhone(raw: string): { phone?: string; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { error: "Enter a contact number." };
  const digits = trimmed.replace(/[^\d+]/g, "");
  const only = digits.replace(/\+/g, "");
  if (only.length < 10 || only.length > 15) {
    return { error: "Contact number should be 10 to 15 digits." };
  }
  return { phone: trimmed.replace(/\s+/g, " ") };
}
