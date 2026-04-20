import React from "react";
import { BottomBar } from "@/ui/components";

/**
 * The root layout for the application.
 *
 * Renders the children (editor environment) in a flexible full-height container
 * with a persistent BottomBar (status bar) at the very bottom.
 */
export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 min-h-0">
        {children}
      </div>
      <BottomBar />
    </div>
  );
}
