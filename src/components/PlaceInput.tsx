"use client";

import { useEffect, useId, useRef, useState } from "react";

type Suggestion = { label: string; secondary: string; value: string };
type Props = {
  id: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  maxLength?: number;
  mode?: "address" | "city";
  required?: boolean;
};

/**
 * Text input with place suggestions from /api/places. Falls back to plain
 * typing if the lookup is unavailable, so the field always works.
 */
export function PlaceInput({ id, name, defaultValue = "", placeholder, maxLength, mode = "address", required }: Props) {
  const [value, setValue] = useState(defaultValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const abort = useRef<AbortController | null>(null);
  const chosen = useRef<string | null>(defaultValue || null);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 3 || q === chosen.current) {
      setItems([]);
      return;
    }
    const t = setTimeout(async () => {
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}&mode=${mode}`, { signal: ctrl.signal });
        const data = (await res.json()) as { suggestions?: Suggestion[] };
        setItems(data.suggestions ?? []);
        setOpen(Boolean(data.suggestions?.length));
        setActive(-1);
      } catch {
        /* aborted or offline: keep typing */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [value, mode]);

  function choose(s: Suggestion) {
    chosen.current = s.value;
    setValue(s.value);
    setItems([]);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        className="input"
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        required={required}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={(e) => { chosen.current = null; setValue(e.target.value); }}
        onFocus={() => items.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, items.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
          else if (e.key === "Enter" && active >= 0) { e.preventDefault(); choose(items[active]); }
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && items.length > 0 && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 w-full rounded-[6px] border border-line bg-white shadow-card overflow-hidden">
          {items.map((s, i) => (
            <li
              key={s.value}
              role="option"
              aria-selected={i === active}
              className={`px-4 py-2.5 cursor-pointer text-sm ${i === active ? "bg-card" : "hover:bg-card"}`}
              onMouseDown={(e) => { e.preventDefault(); choose(s); }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="block text-ink">{s.label}</span>
              {s.secondary && <span className="block text-xs text-body">{s.secondary}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
