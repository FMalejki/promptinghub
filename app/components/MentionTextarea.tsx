"use client";

import { useEffect, useRef, useState } from "react";

type Suggestion = { handle: string; name: string; image: string | null };

type Props = {
  value: string;
  onChange: (v: string) => void;
  className?: string;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange" | "className">;

// A <textarea> with @mention autocomplete. As you type "@" followed by letters,
// it queries /api/mentions/search and shows a dropdown of matching users; picking
// one inserts the correct @handle (which is what makes mentions actually resolve —
// the handle often differs from the display name, e.g. @filipmalejki vs "FMalejki").
export function MentionTextarea({ value, onChange, className, ...rest }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(0);
  const [token, setToken] = useState<{ text: string; start: number } | null>(null);

  // Find an @token whose end is exactly at the caret.
  function detect(text: string, caret: number): { text: string; start: number } | null {
    const upto = text.slice(0, caret);
    const m = upto.match(/(?:^|[^a-zA-Z0-9_])@([a-zA-Z0-9_-]*)$/);
    if (!m) return null;
    return { text: m[1], start: caret - m[1].length - 1 };
  }

  useEffect(() => {
    if (!token || token.text.length < 1) {
      setOpen(false);
      setItems([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/mentions/search?q=${encodeURIComponent(token.text)}`);
        if (!r.ok || cancelled) return;
        const d = await r.json();
        if (cancelled) return;
        const users: Suggestion[] = d.users || [];
        setItems(users);
        setActive(0);
        setOpen(users.length > 0);
      } catch {
        /* best-effort typeahead */
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [token?.text]);

  function onInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    onChange(text);
    setToken(detect(text, e.target.selectionStart ?? text.length));
  }

  function pick(s: Suggestion) {
    const el = ref.current;
    if (!el || !token) return;
    const caret = el.selectionStart ?? value.length;
    const before = value.slice(0, token.start);
    const after = value.slice(caret);
    const insert = `@${s.handle} `;
    onChange(before + insert + after);
    setOpen(false);
    setToken(null);
    requestAnimationFrame(() => {
      const pos = before.length + insert.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + items.length) % items.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      pick(items[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={onInput}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className={className}
        {...rest}
      />
      {open && items.length > 0 && (
        <ul className="absolute left-0 top-full z-20 mt-1 w-72 max-w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
          {items.map((s, i) => (
            <li key={s.handle}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                  i === active ? "bg-blue-50 dark:bg-gray-700" : "hover:bg-gray-50 dark:hover:bg-gray-700/60"
                }`}
              >
                <span className="truncate font-medium text-gray-900 dark:text-white">{s.name}</span>
                <span className="truncate text-gray-400">@{s.handle}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
