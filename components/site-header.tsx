import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="bg-header text-header-foreground">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center px-4">
        <Link href="/" className="text-sm font-medium tracking-wide">
          Rumpriser
        </Link>
      </div>
    </header>
  );
}
