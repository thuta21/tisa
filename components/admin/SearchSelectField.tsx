"use client";

import { useId } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Check, ChevronDown, X } from "lucide-react";

type Option = { id: string; label: string; searchText?: string };

export default function SearchSelectField({ label, value, options, onChange, disabled = false, hint }: {
  label: string; value: string; options: Option[]; onChange: (id: string) => void; disabled?: boolean; hint?: string;
}) {
  const id = useId();
  return <div className="grid min-w-0 gap-2">
    <label htmlFor={id} className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</label>
    <Combobox.Root items={options} value={options.find(option => option.id === value) ?? null}
      isItemEqualToValue={(item, selected) => item.id === selected.id}
      itemToStringLabel={item => item.label} onValueChange={item => onChange(item?.id ?? "")}
      filter={(item, query) => `${item.label} ${item.searchText ?? ""}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())}
      disabled={disabled} autoHighlight>
      <div className="relative flex min-h-11 items-center rounded-lg border border-border bg-background focus-within:border-primary">
        <Combobox.Input id={id} aria-label={label} placeholder={disabled ? "Choose a league first" : `Search ${label.toLowerCase()}…`}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="h-11 w-full min-w-0 rounded-lg bg-transparent pl-3 pr-20 text-sm font-normal text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50" />
        <div className="absolute right-1 flex items-center">
          <Combobox.Clear aria-label={`Clear ${label}`} className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-40"><X size={14} /></Combobox.Clear>
          <Combobox.Trigger aria-label={`Open ${label} options`} className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-40"><ChevronDown size={16} /></Combobox.Trigger>
        </div>
      </div>
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={6} className="z-[120] outline-none">
          <Combobox.Popup className="max-h-[min(20rem,var(--available-height))] w-[var(--anchor-width)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-background p-1 text-sm shadow-xl outline-none">
            <Combobox.Empty className="p-3 text-muted-foreground">No matching {label.toLowerCase()}.</Combobox.Empty>
            <Combobox.List>{(option: Option) => <Combobox.Item key={option.id} value={option} className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-foreground outline-none data-[highlighted]:bg-primary/10 data-[selected]:font-semibold">
              <span>{option.label}</span><Combobox.ItemIndicator><Check size={16} /></Combobox.ItemIndicator>
            </Combobox.Item>}</Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
    {hint && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>}
  </div>;
}
