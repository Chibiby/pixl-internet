"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { UsageRow } from "@/lib/types";

const CYAN = "oklch(0.82 0.13 210)";
const PURPLE = "oklch(0.7 0.22 305)";

function gb(mb: number) {
  return +(mb / 1024).toFixed(2);
}

export function UsageCharts({ usage }: { usage: UsageRow[] }) {
  const daily = usage.map((u) => ({
    label: new Date(u.date).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
    }),
    download: gb(u.download_mb),
    upload: gb(u.upload_mb),
  }));

  const byMonth = new Map<string, { download: number; upload: number }>();
  for (const u of usage) {
    const key = new Date(u.date).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
    });
    const acc = byMonth.get(key) ?? { download: 0, upload: 0 };
    acc.download += u.download_mb;
    acc.upload += u.upload_mb;
    byMonth.set(key, acc);
  }
  const monthly = [...byMonth.entries()].map(([label, v]) => ({
    label,
    download: gb(v.download),
    upload: gb(v.upload),
  }));

  const tooltipStyle = {
    backgroundColor: "oklch(0.19 0.025 278)",
    border: "1px solid oklch(0.82 0.13 210 / 30%)",
    borderRadius: 8,
    fontSize: 12,
  } as const;

  return (
    <Tabs defaultValue="daily">
      <TabsList className="grid w-full grid-cols-2 sm:w-64">
        <TabsTrigger value="daily">Daily</TabsTrigger>
        <TabsTrigger value="monthly">Monthly</TabsTrigger>
      </TabsList>

      <TabsContent value="daily" className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={daily} margin={{ left: -12, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="dl" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CYAN} stopOpacity={0.5} />
                <stop offset="100%" stopColor={CYAN} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="ul" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PURPLE} stopOpacity={0.5} />
                <stop offset="100%" stopColor={PURPLE} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 8%)" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} unit=" GB" width={64} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => [`${value} GB`]}
            />
            <Area
              type="monotone"
              dataKey="download"
              name="Download"
              stroke={CYAN}
              fill="url(#dl)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="upload"
              name="Upload"
              stroke={PURPLE}
              fill="url(#ul)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </TabsContent>

      <TabsContent value="monthly" className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthly} margin={{ left: -12, right: 8, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 8%)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} unit=" GB" width={64} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: "oklch(1 0 0 / 5%)" }}
              formatter={(value) => [`${value} GB`]}
            />
            <Bar dataKey="download" name="Download" fill={CYAN} radius={[4, 4, 0, 0]} />
            <Bar dataKey="upload" name="Upload" fill={PURPLE} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </TabsContent>
    </Tabs>
  );
}
