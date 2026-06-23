import React, { useState, useMemo, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Skeleton,
  Box,
  Typography,
  Tooltip,
  Checkbox,
} from "@mui/material";
import TableRowsOutlinedIcon from "@mui/icons-material/TableRowsOutlined";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ColumnDef<T = Record<string, unknown>> {
  /** Unique key — used for sort and as React key */
  key: string;
  /** Column header label */
  header: React.ReactNode;
  /**
   * Custom cell renderer.
   * `value` = row[key]; `row` = full row object; `index` = row index in current page.
   */
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  width?: number | string;
  minWidth?: number | string;
  align?: "left" | "center" | "right";
  /** Enable client-side or server-side sorting for this column */
  sortable?: boolean;
  /** Tooltip text on the header */
  headerTooltip?: string;
}

export interface DataTablePagination {
  /** 0-indexed page number */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export interface SelectionConfig<T> {
  selectedKeys: Set<string | number>;
  getKey: (row: T) => string | number;
  onToggle: (key: string | number, row: T) => void;
  onToggleAll: (allKeys: Array<string | number>) => void;
}

export interface DataTableProps<T = Record<string, unknown>> {
  columns: ColumnDef<T>[];
  rows: T[];
  loading?: boolean;
  /** Number of skeleton rows shown while loading */
  skeletonRows?: number;
  emptyMessage?: string;
  emptyDescription?: string;
  onRowClick?: (row: T, index: number) => void;
  /** Pin the header when the table scrolls vertically */
  stickyHeader?: boolean;
  /** Cap the table height for vertical scroll */
  maxHeight?: number | string;
  pagination?: DataTablePagination;
  /** Return a stable key for each row (defaults to index) */
  getRowKey?: (row: T, index: number) => string | number;
  /** Extra CSS class per row (Tailwind ok — passed straight to className) */
  rowClassName?: (row: T, index: number) => string | undefined;
  /** Optional row-selection config */
  selection?: SelectionConfig<T>;
  /** Caption shown below the table */
  caption?: string;
  className?: string;
  /** Called when a sortable header is clicked (for server-side sort) */
  onSortChange?: (key: string, dir: "asc" | "desc") => void;
  /** Controlled sort state (pair with onSortChange for server-side) */
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

// ─── CSS-variable helpers ─────────────────────────────────────────────────────
// We read the project's CSS custom properties so the component respects
// the existing light / dark theme automatically.

const hsl = (v: string) => `hsl(var(${v}))`;

const token = {
  bg: hsl("--card"),
  fg: hsl("--card-foreground"),
  muted: hsl("--muted"),
  mutedFg: hsl("--muted-foreground"),
  border: hsl("--border"),
  accent: hsl("--accent"),
  accentFg: hsl("--accent-foreground"),
  primary: hsl("--primary"),
  hover: "hsl(var(--muted) / 0.6)",
  radius: "var(--radius-card)",
};

// ─── Component ────────────────────────────────────────────────────────────────

function DataTableInner<T = Record<string, unknown>>(
  props: DataTableProps<T>,
  _ref: React.Ref<HTMLTableElement>,
) {
  const {
    columns,
    rows,
    loading = false,
    skeletonRows = 6,
    emptyMessage = "No data available",
    emptyDescription,
    onRowClick,
    stickyHeader = true,
    maxHeight,
    pagination,
    getRowKey,
    rowClassName,
    selection,
    caption,
    onSortChange,
    sortBy: controlledSortBy,
    sortDir: controlledSortDir,
  } = props;

  // ── Sort state (uncontrolled) ──────────────────────────────────────────────
  const [localSortBy, setLocalSortBy] = useState<string>("");
  const [localSortDir, setLocalSortDir] = useState<"asc" | "desc">("asc");

  const sortBy = controlledSortBy !== undefined ? controlledSortBy : localSortBy;
  const sortDir = controlledSortDir !== undefined ? controlledSortDir : localSortDir;

  const handleSort = useCallback(
    (key: string) => {
      const nextDir = sortBy === key && sortDir === "asc" ? "desc" : "asc";
      if (onSortChange) {
        onSortChange(key, nextDir);
      } else {
        setLocalSortBy(key);
        setLocalSortDir(nextDir);
      }
    },
    [sortBy, sortDir, onSortChange],
  );

  // ── Client-side sort (only when no external handler) ───────────────────────
  const sortedRows = useMemo(() => {
    if (!localSortBy || onSortChange) return rows;
    const col = columns.find((c) => c.key === localSortBy);
    if (!col) return rows;
    return [...rows].sort((a, b) => {
      const av = (a as Record<string, unknown>)[localSortBy];
      const bv = (b as Record<string, unknown>)[localSortBy];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return localSortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, localSortBy, localSortDir, columns, onSortChange]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const totalCols = columns.length + (selection ? 1 : 0);

  const allKeys = useMemo(
    () => sortedRows.map((r, i) => (selection ? selection.getKey(r) : i)),
    [sortedRows, selection],
  );

  const allSelected =
    selection && allKeys.length > 0 && allKeys.every((k) => selection.selectedKeys.has(k));
  const someSelected =
    selection && !allSelected && allKeys.some((k) => selection.selectedKeys.has(k));

  // ── Shared cell / head sx ──────────────────────────────────────────────────
  const headCellSx = {
    fontFamily: "inherit",
    fontSize: "0.6875rem",
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
    color: token.mutedFg,
    backgroundColor: token.muted,
    borderBottom: `1px solid ${token.border}`,
    whiteSpace: "nowrap" as const,
    padding: "10px 16px",
    lineHeight: 1.4,
  };

  const bodyCellSx = {
    fontFamily: "inherit",
    fontSize: "0.8125rem",
    color: token.fg,
    borderBottom: `1px solid ${token.border}`,
    padding: "11px 16px",
    lineHeight: 1.5,
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        width: "100%",
        borderRadius: token.radius,
        border: `1px solid ${token.border}`,
        overflow: "hidden",
        backgroundColor: token.bg,
        boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
      }}
    >
      <TableContainer
        sx={{
          maxHeight: maxHeight,
          overflowX: "auto",
          overflowY: maxHeight ? "auto" : "visible",
          "&::-webkit-scrollbar": { height: 6, width: 6 },
          "&::-webkit-scrollbar-track": { background: "transparent" },
          "&::-webkit-scrollbar-thumb": {
            background: token.border,
            borderRadius: 3,
          },
          "&::-webkit-scrollbar-thumb:hover": { background: token.mutedFg },
        }}
      >
        <Table
          stickyHeader={stickyHeader && !!maxHeight}
          sx={{ minWidth: "max-content", width: "100%", borderCollapse: "separate", borderSpacing: 0 }}
        >
          {caption && (
            <caption style={{ captionSide: "bottom", padding: "8px 16px", fontSize: "0.75rem", color: token.mutedFg }}>
              {caption}
            </caption>
          )}

          {/* ── Header ── */}
          <TableHead>
            <TableRow>
              {/* Selection checkbox header */}
              {selection && (
                <TableCell padding="checkbox" sx={{ ...headCellSx, width: 48, minWidth: 48 }}>
                  <Checkbox
                    size="small"
                    indeterminate={someSelected}
                    checked={!!allSelected}
                    onChange={() => selection.onToggleAll(allKeys)}
                    sx={{ color: token.mutedFg, "&.Mui-checked, &.MuiCheckbox-indeterminate": { color: token.accent } }}
                  />
                </TableCell>
              )}

              {columns.map((col) => {
                const cell = (
                  <TableCell
                    key={col.key}
                    align={col.align ?? "left"}
                    sortDirection={sortBy === col.key ? sortDir : false}
                    sx={{
                      ...headCellSx,
                      width: col.width,
                      minWidth: col.minWidth,
                      ...(stickyHeader && !!maxHeight
                        ? { position: "sticky", top: 0, zIndex: 2, backgroundColor: token.muted }
                        : {}),
                    }}
                  >
                    {col.sortable ? (
                      <TableSortLabel
                        active={sortBy === col.key}
                        direction={sortBy === col.key ? sortDir : "asc"}
                        onClick={() => handleSort(col.key)}
                        sx={{
                          color: `${token.mutedFg} !important`,
                          "&.Mui-active": { color: `${token.accent} !important` },
                          "& .MuiTableSortLabel-icon": { color: `${token.accent} !important` },
                          fontSize: "inherit",
                          letterSpacing: "inherit",
                          textTransform: "inherit",
                          fontWeight: "inherit",
                        }}
                      >
                        {col.header}
                      </TableSortLabel>
                    ) : (
                      col.header
                    )}
                  </TableCell>
                );

                return col.headerTooltip ? (
                  <Tooltip key={col.key} title={col.headerTooltip} arrow placement="top">
                    {cell}
                  </Tooltip>
                ) : (
                  cell
                );
              })}
            </TableRow>
          </TableHead>

          {/* ── Body ── */}
          <TableBody>
            {/* Loading skeletons */}
            {loading &&
              Array.from({ length: skeletonRows }).map((_, si) => (
                <TableRow key={`skel-${si}`}>
                  {selection && (
                    <TableCell sx={bodyCellSx} padding="checkbox">
                      <Skeleton variant="rectangular" width={18} height={18} sx={{ borderRadius: 0.5 }} />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={col.key} align={col.align ?? "left"} sx={bodyCellSx}>
                      <Skeleton variant="text" width="60%" height={18} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {/* Empty state */}
            {!loading && sortedRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={totalCols} sx={{ ...bodyCellSx, border: "none" }}>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      py: 6,
                      gap: 1,
                      color: token.mutedFg,
                    }}
                  >
                    <TableRowsOutlinedIcon sx={{ fontSize: 36, opacity: 0.4 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500, color: "inherit", fontFamily: "inherit" }}>
                      {emptyMessage}
                    </Typography>
                    {emptyDescription && (
                      <Typography variant="caption" sx={{ color: "inherit", opacity: 0.7, fontFamily: "inherit" }}>
                        {emptyDescription}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            )}

            {/* Data rows */}
            {!loading &&
              sortedRows.map((row, i) => {
                const key = getRowKey ? getRowKey(row, i) : i;
                const rowKey = selection ? selection.getKey(row) : key;
                const isSelected = selection ? selection.selectedKeys.has(rowKey) : false;
                const extraClass = rowClassName ? rowClassName(row, i) : undefined;

                return (
                  <TableRow
                    key={key}
                    hover={!!onRowClick}
                    selected={isSelected}
                    onClick={onRowClick ? () => onRowClick(row, i) : undefined}
                    className={extraClass}
                    sx={{
                      cursor: onRowClick ? "pointer" : "default",
                      transition: "background-color 120ms ease",
                      "&:last-child td": { borderBottom: "none" },
                      "&:hover td": onRowClick
                        ? { backgroundColor: token.hover }
                        : {},
                      "&.Mui-selected td": {
                        backgroundColor: `hsl(var(--accent) / 0.07)`,
                      },
                      "&.Mui-selected:hover td": {
                        backgroundColor: `hsl(var(--accent) / 0.12)`,
                      },
                    }}
                  >
                    {/* Selection checkbox */}
                    {selection && (
                      <TableCell
                        padding="checkbox"
                        sx={{ ...bodyCellSx }}
                        onClick={(e) => {
                          e.stopPropagation();
                          selection.onToggle(rowKey, row);
                        }}
                      >
                        <Checkbox
                          size="small"
                          checked={isSelected}
                          sx={{ color: token.mutedFg, "&.Mui-checked": { color: token.accent } }}
                        />
                      </TableCell>
                    )}

                    {columns.map((col) => {
                      const raw = (row as Record<string, unknown>)[col.key];
                      const content = col.render ? col.render(raw, row, i) : raw != null ? String(raw) : "";
                      return (
                        <TableCell
                          key={col.key}
                          align={col.align ?? "left"}
                          sx={{
                            ...bodyCellSx,
                            width: col.width,
                            minWidth: col.minWidth,
                          }}
                        >
                          {content as React.ReactNode}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Pagination ── */}
      {pagination && !loading && (
        <Box
          sx={{
            borderTop: `1px solid ${token.border}`,
            backgroundColor: token.bg,
          }}
        >
          <TablePagination
            component="div"
            count={pagination.total}
            page={pagination.page}
            rowsPerPage={pagination.pageSize}
            rowsPerPageOptions={pagination.pageSizeOptions ?? [10, 25, 50, 100]}
            onPageChange={(_, p) => pagination.onPageChange(p)}
            onRowsPerPageChange={
              pagination.onPageSizeChange
                ? (e) => pagination.onPageSizeChange!(Number(e.target.value))
                : undefined
            }
            sx={{
              fontFamily: "inherit",
              fontSize: "0.8125rem",
              color: token.fg,
              "& .MuiTablePagination-toolbar": { minHeight: 44, paddingX: 2 },
              "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
                fontFamily: "inherit",
                fontSize: "0.8125rem",
                margin: 0,
                color: token.mutedFg,
              },
              "& .MuiTablePagination-select": {
                fontFamily: "inherit",
                fontSize: "0.8125rem",
                color: token.fg,
              },
              "& .MuiTablePagination-actions button": {
                color: token.fg,
                "&:disabled": { opacity: 0.35 },
              },
              "& .MuiSelect-icon": { color: token.mutedFg },
            }}
          />
        </Box>
      )}
    </Box>
  );
}

// Re-export with generic forwarded ref
const DataTable = React.forwardRef(DataTableInner) as <T = Record<string, unknown>>(
  props: DataTableProps<T> & { ref?: React.Ref<HTMLTableElement> },
) => React.ReactElement;

export { DataTable };
export type { DataTableProps as DataTablePropsType };
