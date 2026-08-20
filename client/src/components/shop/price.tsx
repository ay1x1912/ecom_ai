import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Price display.
 *
 * `finalPrice` is computed by the backend, so the discounted figure shown here is
 * the same number the order will be priced at — the client never multiplies
 * anything out itself.
 */
export function Price({
  price,
  finalPrice,
  discountPercentage,
  className,
}: {
  price: number;
  finalPrice: number;
  discountPercentage: number;
  className?: string;
}) {
  const discounted = discountPercentage > 0 && finalPrice < price;

  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span className="font-semibold tabular-nums">{formatMoney(finalPrice)}</span>
      {discounted ? (
        <>
          <span className="text-muted-foreground text-sm line-through tabular-nums">
            {formatMoney(price)}
          </span>
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-500">
            -{discountPercentage}%
          </span>
        </>
      ) : null}
    </div>
  );
}
