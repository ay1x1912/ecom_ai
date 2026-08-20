import { TableCell, TableRow } from "@/components/ui/table";

/** The "nothing here" row, so every table says it the same way. */
export function EmptyRow({
  colSpan,
  message,
  hint,
}: {
  colSpan: number;
  message: string;
  hint?: string;
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-12 text-center">
        <p className="font-medium">{message}</p>
        {hint ? <p className="text-muted-foreground mt-1 text-sm">{hint}</p> : null}
      </TableCell>
    </TableRow>
  );
}
