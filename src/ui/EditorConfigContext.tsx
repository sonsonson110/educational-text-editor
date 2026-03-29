import { createContext, useContext } from "react";

export interface IEditorConfig {
  charWidth: number;
}

export const EditorConfigContext = createContext<IEditorConfig | null>(null);

export function useEditorConfig(): IEditorConfig {
  const context = useContext(EditorConfigContext);
  if (!context) {
    throw new Error(
      "useEditorConfig must be used within an EditorSetup or EditorConfigContext.Provider"
    );
  }
  return context;
}
