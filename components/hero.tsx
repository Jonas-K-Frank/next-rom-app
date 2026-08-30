import Image from "next/image";

export function Hero() {
  return (
    <div className="relative h-64 w-full overflow-hidden rounded-2xl sm:h-80">
      <Image
        src="/images/hero-beach.jpg"
        alt="Par nyder et glas rom på stranden ved solnedgang"
        fill
        priority
        sizes="(min-width: 1024px) 1024px, 100vw"
        className="object-cover"
      />
      {/* Mørk gradient bag teksten, så den hvide overskrift er læsbar
          uanset hvor lyst billedet er på det tidspunkt. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="absolute inset-0 flex items-end p-6 sm:p-10">
        <h1 className="max-w-sm text-2xl font-semibold text-white sm:max-w-md sm:text-4xl">
          Find din nye yndlingsrom til din yndlingspris
        </h1>
      </div>
    </div>
  );
}
