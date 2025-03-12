import { createContext } from "react";
import type { Tickers } from "./useTickers";

export const TickersContext = createContext<Tickers>(undefined!);
