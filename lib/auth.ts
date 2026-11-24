/** Sign-in rules shared by the browser and the server. */

export const MIN_PASSWORD = 8;

export const cleanEmail = (v: string) => v.trim().toLowerCase();
export const isEmail = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(cleanEmail(v)) && v.trim().length <= 254;

/**
 * Nigerian mobile numbers in the format the rest of the app stores them: "+234 803 123 4567".
 * Accepts 0803…, 803…, 234803… and +234 803…; returns "" if it isn't 10 digits after the country code.
 */
export function normalizePhone(v: string) {
  let d = v.replace(/\D/g, "");
  if (d.startsWith("234")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  if (!/^[789]\d{9}$/.test(d)) return "";
  return `+234 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

export function passwordProblem(p: string) {
  if (p.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return "Use letters and at least one number.";
  return "";
}
