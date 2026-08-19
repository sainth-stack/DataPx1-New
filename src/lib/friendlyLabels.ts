/** Turn snake_case API column names into readable labels for UI. */
export function friendlyColumnName(col: string | null | undefined): string {
  if (!col) return "—";
  return col.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
