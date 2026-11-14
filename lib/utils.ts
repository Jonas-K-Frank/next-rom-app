import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Renser produktnavn ved at fjerne trailing volumen- og ABV-segmenter.
 * Kun fjerner fra slutningen af strengen, så midterstal som "El Dorado 15 år"
 * og "Dos Maderas 5+5" bevares.
 * 
 * Volumen-mønstre: 70 cl, 700 ml, 1 liter, 1 l, 6x70 cl, etc.
 * ABV-mønstre: 40%, 40 %, 40.5%, 40 vol, etc.
 * 
 * Edge-cases:
 * - "Stroh 60" bevares (tal uden enhed/% fjernes ikke)
 * - Hvis rensning gør navnet tomt, returneres originalen
 */
export function cleanDisplayName(name: string): string {
  if (!name) return name;

  // Gentag indtil ingen ændring - for at håndtere multi-packs som "6x70 cl 40%"
  let cleaned = name;
  let previous: string;
  
  do {
    previous = cleaned;
    // Fjern trailing volumen og ABV mønstre, inkl. eventuelle følgende ord (f.eks. "Rom" i "50 cl Rom")
    // og ikke-alfanumeriske tegn (f.eks. komma i "42%, ")
    // Volumen: \d+\s*[xX]\s*\d+\s*(cl|ml), \d+[.,]?\d*\s*(cl|ml|liter|l), etc.
    // ABV: \d+[.,]?\d*%, \d+[.,]?\d*\s*vol
    cleaned = previous.replace(
      /(\s*(?:\d+\s*[xX]\s*\d+\s*(?:cl|ml)|\d+[.,]?\d*\s*(?:cl|ml|liter|l\b)|\d+[.,]?\d*%|\d+[.,]?\d*\s*vol)\D*\s*(?:\S*\s*)*)+$/i,
      ""
    );
  } while (cleaned !== previous);

  // Trim whitespace
  cleaned = cleaned.trim();
  
  // Collapse multiple spaces
  cleaned = cleaned.replace(/\s+/g, " ");
  
  // Fjern eventuelle trailing kommaer
  cleaned = cleaned.replace(/,$/, "");
  
  // Edge-case: returner originalen hvis navnet bliver tomt
  if (!cleaned) {
    return name;
  }

  return cleaned;
}
