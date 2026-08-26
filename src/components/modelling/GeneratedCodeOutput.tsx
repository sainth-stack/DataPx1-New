import { parseKpiGeneratedCode } from "@/lib/analyticsHelpers";

const preClass =
  "text-[11px] bg-muted/40 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed";

export function GeneratedCodeOutput({ raw }: { raw: string }) {
  const { title, code, output } = parseKpiGeneratedCode(raw);

  if (!title && !code && !output) {
    return <p className="text-sm text-muted-foreground">No code or output returned from the API.</p>;
  }

  return (
    <div className="space-y-3 max-h-[480px] overflow-y-auto">
      {title && <p className="text-xs font-semibold capitalize">{title}</p>}
      {code && <pre className={preClass}>{code}</pre>}
      {output && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground">Output</p>
          <pre className={preClass}>{output}</pre>
        </div>
      )}
    </div>
  );
}
