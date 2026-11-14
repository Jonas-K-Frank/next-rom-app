import { PencilFrame } from "@/components/pencil-frame";

export function SearchField({ searchQuery, onSearchChange }: { searchQuery: string; onSearchChange: (value: string) => void }) {
  return (
    <div className="group relative max-w-[640px] -rotate-[0.3deg]">
      {/* Grafit-streg: synlig i hvile, fader ud ved fokus.
          withFill=false, feltet skal være gennemsigtigt. */}
      <div className="absolute inset-0 opacity-65 transition-opacity duration-200 group-focus-within:opacity-0">
        <PencilFrame color="#262626" withFill={false} />
      </div>
      {/* Orange streg: usynlig i hvile, fader ind ved fokus.
          Uden krus-streger, så fokus-tilstanden står renere. */}
      <div className="absolute inset-0 opacity-0 transition-opacity duration-200 group-focus-within:opacity-90">
        <PencilFrame color="#c2410c" withFill={false} showCrumble={false} />
      </div>

      <form className="relative z-10 flex items-center" onSubmit={(e) => e.preventDefault()}>
        <input
          type="search"
          name="q"
          placeholder="Søg efter rom eller mærke..."
          aria-label="Søg efter rom eller mærke"
          className="h-[52px] w-full bg-transparent px-4 text-base text-foreground outline-none placeholder:text-muted-foreground"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <button
          type="submit"
          className="mr-2.5 flex h-[38px] items-center rounded-[2px] bg-foreground px-4 text-sm text-background transition-colors group-focus-within:bg-[#c2410c] hover:bg-[#c2410c]"
        >
          Søg
        </button>
      </form>
    </div>
  );
}
