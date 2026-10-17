"use client";

import { useId, useState } from "react";
import { Check } from "lucide-react";
import { playerVersionSizeChart } from "@/lib/size-guide";

export default function ResponsiveSizeChart({ availableSizes = [] }: { availableSizes?: string[] }) {
  const [selected, setSelected] = useState<string>("M");
  const id = useId();
  const row = playerVersionSizeChart.find(item => item.size === selected)!;
  return <>
    <div className="sm:hidden">
      <p id={`${id}-label`} className="text-sm font-medium">Choose a size to see measurements</p>
      <div role="group" aria-labelledby={`${id}-label`} className="mt-3 grid grid-cols-3 gap-2">
        {playerVersionSizeChart.map(item => <button key={item.size} type="button" aria-pressed={selected === item.size} onClick={() => setSelected(item.size)} className={`flex min-h-11 items-center justify-center gap-1 rounded-xl border px-3 text-sm font-semibold ${selected === item.size ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white"}`}>{item.size}{availableSizes.includes(item.size) && <Check size={13} aria-label="In stock" />}</button>)}
      </div>
      <div aria-live="polite" aria-atomic="true" className="mt-4 rounded-2xl border border-border bg-white/80 p-4">
        <p className="text-sm font-semibold">Size {row.size}</p>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-5">
          {[["Length", `${row.length} cm`], ["Chest width", `${row.chest} cm`], ["Height guide", `${row.height} cm`], ["Weight guide", `${row.weight} kg`]].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-base font-semibold tabular-nums">{value}</dd></div>)}
        </dl>
      </div>
    </div>
    <div className="hidden overflow-x-auto rounded-2xl border border-border bg-white/80 sm:block">
      <table className="w-full min-w-[520px] text-left text-sm"><caption className="sr-only">Player Version jersey measurements</caption>
        <thead className="bg-black/5"><tr>{["Size", "Length (cm)", "Chest width (cm)", "Height (cm)", "Weight (kg)"].map(label => <th key={label} scope="col" className="px-3 py-4 font-semibold">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-border">{playerVersionSizeChart.map(item => <tr key={item.size} className={availableSizes.includes(item.size) ? "bg-primary/5" : ""}><th scope="row" className="px-3 py-4 font-semibold"><span className="inline-flex items-center gap-1">{item.size}{availableSizes.includes(item.size) && <Check size={14} aria-label="In stock" />}</span></th><td className="px-3 py-4">{item.length}</td><td className="px-3 py-4">{item.chest}</td><td className="px-3 py-4">{item.height}</td><td className="px-3 py-4">{item.weight}</td></tr>)}</tbody>
      </table>
    </div>
    {availableSizes.length > 0 && <p className="mt-3 text-xs text-muted-foreground">Marked sizes are in stock for the selected kit.</p>}
  </>;
}
