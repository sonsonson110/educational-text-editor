import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { EditorConfigContext } from "./EditorConfigContext";

interface Props {
  children: ReactNode;
}

export function EditorSetup({ children }: Props) {
  const [charWidth, setCharWidth] = useState<number | null>(null);
  const measureRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (measureRef.current) {
      // DOM-based measurement guarantees exact fractional sub-pixel layout width
      const width = measureRef.current.getBoundingClientRect().width;
      setCharWidth(width || 8); // fallback to 8 if something goes wrong
    }
  }, []);

  if (charWidth === null) {
    return (
      <div className="editor">
        {/* Render a single character invisibly to measure its accurate width */}
        <span
          ref={measureRef}
          style={{
            position: "absolute",
            visibility: "hidden",
            whiteSpace: "pre",
          }}
        >
          M
        </span>
        <span style={{ color: "#888", padding: "0.5em" }}>Loading…</span>
      </div>
    );
  }

  return (
    <EditorConfigContext.Provider value={{ charWidth }}>
      {children}
    </EditorConfigContext.Provider>
  );
}
