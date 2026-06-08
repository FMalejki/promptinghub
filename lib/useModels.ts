"use client";
import { useEffect, useState } from "react";
import { AI_MODELS } from "./constants";
import type { ModelOption } from "./models";

const FALLBACK: ModelOption[] = AI_MODELS.map((m) => ({ id: m.id, name: m.name, provider: m.provider }));

// Client hook: the live model catalogue from /api/models, with the curated list
// as an instant, offline-safe fallback so the picker is never empty.
export function useModels(): ModelOption[] {
  const [models, setModels] = useState<ModelOption[]>(FALLBACK);
  useEffect(() => {
    let active = true;
    fetch("/api/models")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && Array.isArray(d?.models) && d.models.length) setModels(d.models);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return models;
}
