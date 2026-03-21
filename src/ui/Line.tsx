type ViewLine = {
  lineNumber: number;
  content: string;
};

export function Line({ line }: { line: ViewLine }) {
  return (
    <div className="line">
      {/* keep empty lines visible */}
      {line.content || "\u00A0"}
    </div>
  );
}
