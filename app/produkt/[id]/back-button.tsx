"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Tilbage-knap med UX-hukommelse: Går ét skridt tilbage i browserens
 * historie (bevarer scroll-position og "Vis flere"-tilstand på forsiden).
 * Fallback er en almindelig navigering til forsiden, hvis siden blev
 * åbnet direkte (fx fra Google) og der ikke er noget at gå tilbage til.
 */
export function BackButton() {
  const router = useRouter();

  // Browserens egen tilbage-knap/swipe skal også fortælle forsiden,
  // at den skal genoprette visningstilstanden
  useEffect(() => {
    const onPopState = () => {
      try {
        sessionStorage.setItem("rom-returning", "1");
      } catch {
        // ignorér
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const handleClick = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      // Bed forsiden om at genoprette scroll + "Vis flere"-tilstand
      try {
        sessionStorage.setItem("rom-returning", "1");
      } catch {
        // ignorér
      }
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="-ml-4 px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      ← Tilbage til forsiden
    </button>
  );
}
