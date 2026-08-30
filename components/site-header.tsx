import Link from "next/link";
import { Input } from "@/components/ui/input";

// Søgefeltet er rent visuelt for nu — filtrering af produkter kommer i et
// separat step.
export function SiteHeader() {
  return (
    <header className="bg-header text-header-foreground">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
        <Link href="/" className="text-sm font-medium tracking-wide">
          Rumpriser
        </Link>
        <Input
          type="search"
          placeholder="Søg efter rom…"
          className="h-8 max-w-56 border-transparent bg-white/10 text-header-foreground placeholder:text-white/50 focus-visible:border-white/30 focus-visible:ring-white/20"
        />
      </div>
    </header>
  );
}
