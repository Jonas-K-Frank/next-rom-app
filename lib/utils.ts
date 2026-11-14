import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Fjerner EFTERSTILLEDE volumen- og ABV-segmenter fra et produktnavn.
 *  "...Rom 70 cl 40%" → "...Rom". Bevarer midterstal: "El Dorado 15 år",
 *  "Stroh 60" (tal uden enhed røres aldrig). Returnerer originalen,
 *  hvis rensningen ville fjerne alt. */
export function cleanDisplayName(name: string): string {
  const cleaned = name
    .replace(/(\s*\d+([.,]\d+)?\s*(x\s*\d+([.,]\d+)?\s*)?(cl|ml|liter|l)\b)+/gi, "")
    .replace(/(\s*\d+([.,]\d+)?\s*%)+(\s*vol)?/gi, "")
    .replace(/(\s*\d+([.,]\d+)?\s*vol\b)+/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned.length > 0 ? cleaned : name;
}
