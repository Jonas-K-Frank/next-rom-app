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
					color="var(--pencil-accent)"
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
				<div className="relative shrink-0 -rotate-[1.2deg]">
					{/* Lys blyantstreg oven på knappen, med krus-streger til ekstra
      kornet tekstur: mere "hånd" i stregen på den lille flade. */}
					<div className="pointer-events-none absolute inset-0 z-20">
						<PencilFrame
							color="#FBFBF2"
							withFill={false}
							showCrumble={true}
							strokeWidthH={10}
							strokeWidthV={6}
							crumbleWidthH={4}
							crumbleWidthV={0.9}
						/>
					</div>

					<button
						type="submit"
						className="flex h-[42px] items-center bg-[#5f5f5c] px-8 text-base text-background tracking-wide transition-colors hover:bg-pencil-accent group-hover:bg-pencil-accent group-focus-within:bg-pencil-accent"
					>
						Søg
					</button>
				</div>
			</form>
		</div>
	);
}
