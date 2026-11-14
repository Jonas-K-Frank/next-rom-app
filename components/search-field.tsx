import { PencilFrame } from "@/components/pencil-frame";

export function SearchField({
	searchQuery,
	onSearchChange,
}: {
	searchQuery: string;
	onSearchChange: (value: string) => void;
}) {
	return (
		<div className="group relative w-full -rotate-[0.3deg]">
			{/* Grafit-streg: synlig i hvile, fader ud ved fokus.
          withFill=false, feltet skal være gennemsigtigt. */}
			{/* Grafit-streg: tydeligere tryk kun på søgefeltet */}
			{/* Grafit-streg: tykke vandrette, slankere lodrette */}
			<div className="absolute inset-0 opacity-80 transition-opacity duration-200 ">
				<PencilFrame
					color="#262626"
					withFill={false}
					strokeWidthH={8}
					strokeWidthV={1.4}
					crumbleWidthH={2.4}
					crumbleWidthV={0.9}
				/>
			</div>

			{/* Orange fokus-streg */}
			<div className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
				<PencilFrame
					color="#c2410c"
					withFill={false}
					showCrumble={false}
					strokeWidthH={8}
					strokeWidthV={1.4}
				/>
			</div>

			<form
				className="relative z-10 flex items-center gap-3 py-2 pl-6 pr-8"
				onSubmit={(e) => e.preventDefault()}
			>
				<input
					type="search"
					name="q"
					placeholder="Find din nye yndlings rom... eller en gammel klassiker..."
					aria-label="Søg efter din nye yndlings rom eller en gammel klassiker"
					className="h-[52px] w-full bg-transparent pl-6 text-base text-foreground outline-none placeholder:text-muted-foreground"
					value={searchQuery}
					onChange={(e) => onSearchChange(e.target.value)}
				/>
				<button
					type="submit"
					className="flex h-[38px] shrink-0 items-center rounded-[2px] bg-foreground px-4 text-sm text-background transition-colors group-hover:bg-[#c2410c] hover:bg-[#c2410c] group-focus-within:bg-[#c2410c]"
				>
					Søg
				</button>
			</form>
		</div>
	);
}
