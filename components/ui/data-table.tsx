"use client";

import * as React from "react";
import { Search, ChevronDown, ChevronUp, ChevronsUpDown, MoreHorizontal, Filter } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export type Column<T> = {
  id: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  sortable?: boolean;
  filterOptions?: string[];
  className?: string;
};

export type RowAction<T> = {
  label: string | ((row: T) => string);
  icon?: React.ReactNode | ((row: T) => React.ReactNode);
  onClick: (row: T) => void;
  variant?: "default" | "destructive";
};

export type DataTableProps<T> = {
  data: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  rowActions?: RowAction<T>[];
  bulkActions?: { label: string; icon?: React.ReactNode; onClick: (rows: T[]) => void }[];
  primaryAction?: { label: string; onClick: () => void };
  searchKeys?: (keyof T)[];
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
};

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export function DataTable<T>({
  data,
  columns,
  getRowId,
  onRowClick,
  rowActions,
  bulkActions,
  primaryAction,
  searchKeys,
  pageSize = 10,
  emptyTitle = "No records",
  emptyDescription = "No data to display.",
}: DataTableProps<T>) {
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<{ id: string; dir: "asc" | "desc" } | null>(null);
  const [filters, setFilters] = React.useState<Record<string, string>>({});
  const [page, setPage] = React.useState(0);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    let out = [...data];
    if (search && searchKeys?.length) {
      const q = search.toLowerCase();
      out = out.filter((row) => searchKeys.some((k) => String((row as Record<string, unknown>)[k as string] ?? "").toLowerCase().includes(q)));
    }
    for (const [colId, val] of Object.entries(filters)) {
      if (!val) continue;
      const col = columns.find((c) => c.id === colId);
      if (!col) continue;
      out = out.filter((row) => String(col.accessor(row) ?? "").toLowerCase() === val.toLowerCase() || String((row as Record<string, unknown>)[colId] ?? "").toLowerCase() === val.toLowerCase());
    }
    if (sort) {
      const col = columns.find((c) => c.id === sort.id);
      if (col) {
        out.sort((a, b) => {
          const av = String(col.accessor(a) ?? "");
          const bv = String(col.accessor(b) ?? "");
          const cmp = av.localeCompare(bv, undefined, { numeric: true });
          return sort.dir === "asc" ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [data, search, searchKeys, filters, sort, columns]);

  const paged = React.useMemo(() => {
    const start = page * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  function toggleSort(id: string) {
    setSort((prev) => {
      if (!prev || prev.id !== id) return { id, dir: "asc" };
      if (prev.dir === "asc") return { id, dir: "desc" };
      return null;
    });
  }

  const allSelected = paged.length > 0 && paged.every((r) => selected.has(getRowId(r)));

  return (
    <div className="rounded-xl border bg-card">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 p-4 border-b sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2 max-w-md">
          {searchKeys ? (
            <div className="relative flex-1">
              <Search size={16} className="absolute left-2.5 top-2.5 text-muted-foreground" aria-hidden />
              <Input
                aria-label="Search"
                placeholder="Search…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="pl-8"
              />
            </div>
          ) : null}
          {columns
            .filter((c) => c.filterOptions?.length)
            .map((c) => (
              <label key={c.id} className="flex items-center gap-1.5 text-sm">
                <Filter size={14} className="text-muted-foreground" />
                <select
                  aria-label={`Filter ${c.header}`}
                  value={filters[c.id] ?? ""}
                  onChange={(e) => {
                    setFilters((p) => ({ ...p, [c.id]: e.target.value }));
                    setPage(0);
                  }}
                  className="h-9 rounded-lg border bg-background px-2 text-sm"
                >
                  <option value="">All {c.header}</option>
                  {c.filterOptions!.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
            ))}
        </div>
        <div className="flex items-center gap-2">
          {bulkActions && selected.size > 0 ? (
            <span className="text-sm text-muted-foreground mr-1">{selected.size} selected</span>
          ) : null}
          {bulkActions?.map((a) => (
            <Button key={a.label} variant="outline" size="sm" disabled={selected.size === 0} onClick={() => a.onClick(data.filter((r) => selected.has(getRowId(r))))}>
              {a.icon} {a.label}
            </Button>
          ))}
          {primaryAction ? (
            <Button size="sm" onClick={primaryAction.onClick}>
              {primaryAction.label}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              {bulkActions ? (
                <th className="w-10 px-4 py-2">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allSelected}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) paged.forEach((r) => next.add(getRowId(r)));
                      else paged.forEach((r) => next.delete(getRowId(r)));
                      setSelected(next);
                    }}
                  />
                </th>
              ) : null}
              {columns.map((col) => (
                <th key={col.id} aria-sort={sort?.id === col.id ? (sort.dir === "asc" ? "ascending" : "descending") : undefined} className={cn("px-4 py-2.5 text-left font-medium whitespace-nowrap", col.className)}>
                  {col.sortable ? (
                    <button onClick={() => toggleSort(col.id)} className="inline-flex items-center gap-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded">
                      {col.header}
                      {sort?.id === col.id ? (
                        sort.dir === "asc" ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        )
                      ) : (
                        <ChevronsUpDown size={14} className="opacity-40" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
              {rowActions ? <th className="w-10 px-4 py-2 text-right">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (bulkActions ? 1 : 0) + (rowActions ? 1 : 0)} className="px-4 py-12 text-center">
                  <div role="status" className="flex flex-col items-center gap-1">
                    <p className="font-medium text-sm">{emptyTitle}</p>
                    <p className="text-sm text-muted-foreground">{emptyDescription}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paged.map((row) => {
                const id = getRowId(row);
                return (
                  <tr
                    key={id}
                    role={onRowClick ? "button" : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    onClick={() => onRowClick?.(row)}
                    onKeyDown={(e) => {
                      if (onRowClick && (e.key === "Enter" || e.key === " ")) {
                        // Don't hijack keyboard activation of inner controls
                        // (action menus, checkboxes, links).
                        const target = e.target as HTMLElement | null;
                        if (target && target.closest("button, a, input, select, textarea, [role='menu'], [role='menuitem']")) {
                          return;
                        }
                        e.preventDefault();
                        onRowClick(row);
                      }
                    }}
                    className={cn("hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted", onRowClick ? "cursor-pointer" : undefined)}
                  >
                    {bulkActions ? (
                      <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select row ${id}`}
                          checked={selected.has(id)}
                          onChange={(e) => {
                            const next = new Set(selected);
                            if (e.target.checked) next.add(id);
                            else next.delete(id);
                            setSelected(next);
                          }}
                        />
                      </td>
                    ) : null}
                    {columns.map((col) => (
                      <td key={col.id} className={cn("px-4 py-2", col.className)}>
                        {col.accessor(row)}
                      </td>
                    ))}
                    {rowActions ? (
                      <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-block">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Row actions"
                            aria-expanded={openMenu === id}
                            onClick={() => setOpenMenu((p) => (p === id ? null : id))}
                          >
                            <MoreHorizontal size={16} />
                          </Button>
                          {openMenu === id ? (
                            <div className="absolute right-0 z-10 mt-1 min-w-[160px] rounded-lg border bg-popover p-1 shadow-md">
                              {rowActions.map((a, actionIndex) => {
                                const actionLabel = typeof a.label === "function" ? a.label(row) : a.label;
                                const actionIcon = typeof a.icon === "function" ? a.icon(row) : a.icon;
                                return (
                                  <button
                                    key={`${actionLabel}-${actionIndex}`}
                                    onClick={() => {
                                      setOpenMenu(null);
                                      a.onClick(row);
                                    }}
                                    className={cn(
                                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted text-left",
                                      a.variant === "destructive" ? "text-destructive" : undefined,
                                    )}
                                  >
                                    {actionIcon} {actionLabel}
                                  </button>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between p-4 border-t text-sm">
        <span className="text-muted-foreground">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""} · Page {page + 1} of {totalPages}
        </span>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
