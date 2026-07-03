import Link from "next/link";
import { Receipt } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatPeso } from "@/lib/format";
import type { Payment } from "@/lib/types";

const methodLabels: Record<Payment["method"], string> = {
  gcash: "GCash",
  qrph: "QR Ph",
  card: "Card",
  cash: "Cash",
  other: "Other",
};

const statusStyles: Record<Payment["status"], string> = {
  paid: "border-neon-green/50 bg-neon-green/10 text-neon-green",
  pending: "border-amber-400/50 bg-amber-400/10 text-amber-300",
  failed: "border-destructive/50 bg-destructive/10 text-destructive",
};

export function PaymentHistoryTable({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No payments yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead className="hidden sm:table-cell">Method</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Receipt</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="whitespace-nowrap">{formatDate(p.paid_at)}</TableCell>
            <TableCell className="font-medium">{formatPeso(p.amount)}</TableCell>
            <TableCell className="hidden sm:table-cell">{methodLabels[p.method]}</TableCell>
            <TableCell>
              <Badge variant="outline" className={statusStyles[p.status]}>
                {p.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              {p.status === "paid" ? (
                <Link
                  href={`/receipt/${p.id}`}
                  className="inline-flex items-center gap-1 text-neon-cyan hover:underline"
                >
                  <Receipt className="size-3.5" /> View
                </Link>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
