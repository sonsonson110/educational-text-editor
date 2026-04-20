import clsx from "clsx";

/**
 * A dedicated, VSCode-like status bar at the bottom of the editor.
 *
 * Currently serves as a placeholder layout for future indicators
 * (e.g., cursor position, connection status, file type).
 */
export function BottomBar() {
  return (
    <div
      className={clsx(
        "h-5 w-full shrink-0",
        "bg-neutral-800 text-neutral-300",
        "flex items-center px-2 text-xs",
        "border-t border-neutral-700 select-none",
      )}
    >
      {/* Future item indicators go here */}
    </div>
  );
}
