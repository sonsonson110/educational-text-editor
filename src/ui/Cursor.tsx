export function Cursor({
  position,
}: {
  position: { line: number; column: number };
}) {
  return (
    <div
      className="cursor w-px h-5 bg-black absolute"
      style={{
        top: position.line * 20,
        left: position.column * 8,
      }}
    />
  );
}
