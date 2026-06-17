import { createContext, useContext, useState, type ReactNode } from "react";

type MachineScope = "single" | "fleet";

interface MachineScopeContextType {
  scope: MachineScope;
  setScope: (s: MachineScope) => void;
  selectedMachineId: string;
  setSelectedMachineId: (id: string) => void;
}

const MachineScopeContext = createContext<MachineScopeContextType | undefined>(undefined);

export function MachineScopeProvider({ children }: { children: ReactNode }) {
  const [scope, setScope] = useState<MachineScope>("fleet");
  const [selectedMachineId, setSelectedMachineId] = useState<string>("M-101");

  return (
    <MachineScopeContext.Provider value={{ scope, setScope, selectedMachineId, setSelectedMachineId }}>
      {children}
    </MachineScopeContext.Provider>
  );
}

export function useMachineScope() {
  const ctx = useContext(MachineScopeContext);
  if (!ctx) throw new Error("useMachineScope must be used within MachineScopeProvider");
  return ctx;
}
