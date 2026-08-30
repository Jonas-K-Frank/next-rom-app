import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface PricePositionPoint {
  label: string;
  price: number;
}

interface PricePositionBarProps {
  /** Priser der skal plottes langs baren, fx én pr. forhandler. */
  points: PricePositionPoint[];
  /** Overstyrer intervallets bund/top. Udledes ellers fra `points`. */
  min?: number;
  max?: number;
  /** Andel af intervallet (0-1) der tæller som "bedste pris relativt". */
  bestPriceThreshold?: number;
  className?: string;
}

const priceFormatter = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
  maximumFractionDigits: 0,
});

export function pricePosition(price: number, min: number, max: number) {
  if (max <= min) return 0;
  return ((price - min) / (max - min)) * 100;
}

// Bruges både af baren selv og af ProductCard, så prisfarven (accent vs.
// success) og "Bedste pris relativt"-badget bygger på samme tærskel.
export function isBestRelativePrice(
  price: number,
  min: number,
  max: number,
  threshold = 0.15,
) {
  if (max <= min) return false;
  return pricePosition(price, min, max) / 100 < threshold;
}

// Signaturelementet: en tynd bar der viser hvor en pris (eller flere,
// fx én pr. forhandler) ligger i forhold til det billigste/dyreste punkt
// fundet for samme produkt.
export function PricePositionBar({
  points,
  min,
  max,
  bestPriceThreshold = 0.15,
  className,
}: PricePositionBarProps) {
  if (points.length === 0) return null;

  const prices = points.map((point) => point.price);
  const effectiveMin = min ?? Math.min(...prices);
  const effectiveMax = max ?? Math.max(...prices);
  const hasRange = effectiveMax > effectiveMin;

  const cheapest = points.reduce((a, b) => (a.price <= b.price ? a : b));
  const cheapestPosition = hasRange
    ? pricePosition(cheapest.price, effectiveMin, effectiveMax)
    : 0;
  const isBestPrice =
    hasRange && isBestRelativePrice(cheapest.price, effectiveMin, effectiveMax, bestPriceThreshold);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {isBestPrice && (
        <Badge variant="success" className="w-fit">
          Bedste pris relativt
        </Badge>
      )}
      <div className="relative h-1.5 w-full rounded-full bg-border">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-accent"
          style={{ width: `${cheapestPosition}%` }}
        />
        {points.map((point) => {
          const position = hasRange
            ? pricePosition(point.price, effectiveMin, effectiveMax)
            : 0;
          return (
            <div
              key={point.label}
              title={`${point.label}: ${priceFormatter.format(point.price)}`}
              className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-accent"
              style={{ left: `${position}%` }}
            />
          );
        })}
      </div>
      <div className="flex justify-between font-mono text-[11px] font-medium text-muted-foreground">
        <span>{priceFormatter.format(effectiveMin)}</span>
        <span>{priceFormatter.format(effectiveMax)}</span>
      </div>
    </div>
  );
}
