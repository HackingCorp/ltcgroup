"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

type LogoMap = Record<string, string>;

const key = (country: string | null | undefined, operator: string) =>
  `${(country || "").toUpperCase()}/${operator.toUpperCase()}`;

// Shared across every component that asks: the operator list changes about
// as often as a country is opened, so fetching it per table would be waste.
let cache: LogoMap | null = null;
let inflight: Promise<LogoMap> | null = null;

async function load(): Promise<LogoMap> {
  if (cache) return cache;
  if (!inflight) {
    inflight = api
      .get("/payments/countries?include_unavailable=true")
      .then((r) => {
        const map: LogoMap = {};
        for (const country of r.data || []) {
          for (const op of country.operators || []) {
            if (op.logo_url) {
              map[key(country.code, op.code)] = op.logo_url;
              // Same operator elsewhere is a better guess than a generic
              // icon when a payment predates the country column.
              map[key("", op.code)] ||= op.logo_url;
            }
          }
        }
        cache = map;
        return map;
      })
      .catch(() => ({}))
      .finally(() => { inflight = null; });
  }
  return inflight;
}

/**
 * Resolve the logo an admin registered for an operator, by country.
 *
 * Returns a lookup that is empty until the operator list arrives — callers
 * pass the result straight to MethodChip, which falls back to its bundled
 * artwork while it is missing.
 */
export function useOperatorLogos() {
  const [logos, setLogos] = useState<LogoMap>(cache || {});

  useEffect(() => {
    let alive = true;
    load().then((map) => { if (alive) setLogos(map); });
    return () => { alive = false; };
  }, []);

  return (country: string | null | undefined, operator: string | null | undefined) =>
    operator ? logos[key(country, operator)] || logos[key("", operator)] : undefined;
}
