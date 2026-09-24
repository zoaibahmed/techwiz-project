import { createContext, useContext } from "react";

export const CompanionContext = createContext<() => void>(() => {});
export const useCompanion = () => useContext(CompanionContext);
