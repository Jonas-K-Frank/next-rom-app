import Link from "next/link";
import { Search } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="bg-header text-header-foreground">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-6 px-4">
        <Link href="/" className="text-2xl font-bold">
          Rompriser
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="#" className="hover:text-white/80">
            Alle rom
          </Link>
          <Link href="#" className="hover:text-white/80">
            Prisfald
          </Link>
          <Link href="#" className="hover:text-white/80">
            Forhandlere
          </Link>
        </nav>
        <div className="flex-1" />
        <button className="p-2 hover:bg-background/10 rounded-full transition-colors">
          <Search className="size-5" />
        </button>
      </div>
    </header>
  );
}
