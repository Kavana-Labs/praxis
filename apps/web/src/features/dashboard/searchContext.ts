import { createContext, useContext } from "react";

/** Live top-bar search query, provided by the dashboard shell. */
export const DashboardSearchContext = createContext<string>("");
export const useDashboardSearch = () => useContext(DashboardSearchContext);
