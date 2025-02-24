import type { ComponentProps } from "react";
import type { BankCard } from "./BankCard";

export const BankCards: Record<string, ComponentProps<typeof BankCard>["style"]> = {
  "111": "coral",
  "222": "blueviolet",
  "1*?": "darkcyan",
} as const;
