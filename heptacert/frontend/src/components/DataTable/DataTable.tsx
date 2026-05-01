"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from "@tanstack/react-table";
import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Search,
  ArrowUpDown,
  Eye,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  onSelectionChange?: (selected: TData[]) => void;
  enableColumnVisibility?: boolean;
  pageSize?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  enableExport?: boolean;
  exportFileName?: string;
}

export function DataTable<TData extends Record<string, any>>({
  columns,
  data,
  onSelectionChange,
  enableColumnVisibility = true,
  pageSize = 10,
  searchable = true,
  searchPlaceholder = "Search...",
  enableExport = true,
  exportFileName = "export.csv",
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const toast = useToast();

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
  });

  // Track selection changes
  useEffect(() => {
    if (onSelectionChange) {
      const selected = table.getFilteredSelectedRowModel().rows.map((row) => row.original);
      onSelectionChange(selected);
    }
  }, [rowSelection, onSelectionChange]);

  const visibleColumns = table.getVisibleLeafColumns();
  const selectedRows = table.getFilteredSelectedRowModel().rows;

  const handleExportCSV = () => {
    try {
      const headers = visibleColumns.map((col) => col.columnDef.header).join(",");
      const rows = selectedRows.length > 0 ? selectedRows : table.getRowModel().rows;

      const csvContent = [
        headers,
        ...rows.map((row) =>
          visibleColumns
            .map((col) => {
              const value = row.getValue(col.id);
              const stringValue = String(value ?? "");
              // Escape quotes and wrap in quotes if contains comma
              return stringValue.includes(",") ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
            })
            .join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", exportFileName);
      link.click();

      toast.success(`${rows.length} row(s) exported successfully`);
    } catch (err) {
      toast.error("Export failed");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="toolbar-surface flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        {searchable && (
          <div className="relative min-w-0 flex-1">
            <label htmlFor="table-search" className="sr-only">
              Search table
            </label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
            <input
              id="table-search"
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="input-field py-2 pl-10 pr-4"
              aria-label="Search table content"
              aria-describedby="table-search-help"
            />
            <p id="table-search-help" className="sr-only">
              Type to filter table rows by any column
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {selectedRows.length > 0 && (
            <div
              className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900 dark:text-brand-300"
              role="status"
              aria-live="polite"
            >
              {selectedRows.length} selected
            </div>
          )}

          {enableExport && (
            <button
              onClick={handleExportCSV}
              className="btn-secondary min-h-0 px-3 py-2 text-xs"
              aria-label={selectedRows.length > 0 ? "Export selected rows as CSV" : "Export all rows as CSV"}
            >
              <Download className="h-4 w-4 text-gray-600 dark:text-gray-400" aria-hidden="true" />
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Export</span>
            </button>
          )}

          {enableColumnVisibility && (
            <details className="relative group">
              <summary
                className="btn-secondary min-h-0 cursor-pointer px-3 py-2 text-xs"
                aria-label="Toggle column visibility menu"
              >
                <Eye className="h-4 w-4 text-gray-600 dark:text-gray-400" aria-hidden="true" />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Columns</span>
              </summary>

              <div
                className="absolute right-0 top-full z-10 mt-2 min-w-48 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800"
                role="menu"
              >
                {table.getAllLeafColumns().map((column) => (
                  <label key={column.id} className="flex cursor-pointer items-center gap-2 rounded p-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                    <input
                      type="checkbox"
                      checked={column.getIsVisible()}
                      onChange={column.getToggleVisibilityHandler()}
                      className="cursor-pointer"
                    />
                    <span className="text-gray-700 dark:text-gray-300">{String(column.columnDef.header)}</span>
                  </label>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="table-shell scrollbar-polished overflow-x-auto dark:border-gray-700 dark:bg-gray-800">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="whitespace-nowrap px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                    {header.isPlaceholder ? null : (
                      <div
                        onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                        className={`flex items-center gap-2 ${header.column.getCanSort() ? "cursor-pointer rounded px-2 py-1 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:hover:text-brand-400" : ""}`}
                        role={header.column.getCanSort() ? "button" : undefined}
                        tabIndex={header.column.getCanSort() ? 0 : undefined}
                        onKeyDown={(e) => {
                          if (header.column.getCanSort() && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            header.column.getToggleSortingHandler?.();
                          }
                        }}
                        aria-label={header.column.getCanSort() ? `Sort by ${flexRender(header.column.columnDef.header, header.getContext())}` : ""}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <ArrowUpDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50/80 dark:border-gray-700 dark:hover:bg-gray-700">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-6 py-4 text-gray-800 dark:text-gray-200">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {table.getRowModel().rows.length === 0 && (
          <div
            className="p-10 text-center text-sm font-medium text-gray-500 dark:text-gray-400"
            role="status"
            aria-live="polite"
          >
            Sonuç bulunamadı
          </div>
        )}
      </div>

      {/* Pagination */}
      <div
        className="flex flex-col items-center justify-between gap-4 rounded-lg border border-surface-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-soft dark:text-gray-400 sm:flex-row"
        role="region"
        aria-label="Table pagination"
      >
        <div className="font-medium">
          {table.getFilteredRowModel().rows.length === 0
            ? "Kayıt yok"
            : `${table.getState().pagination.pageIndex * pageSize + 1} - ${Math.min(
                (table.getState().pagination.pageIndex + 1) * pageSize,
                table.getFilteredRowModel().rows.length
              )} / ${table.getFilteredRowModel().rows.length} kayıt`}
        </div>

        <div className="flex gap-2" role="group" aria-label="Pagination controls">
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="rounded-lg border border-gray-200 p-2 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
            aria-label="Go to first page"
          >
            <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="rounded-lg border border-gray-200 p-2 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
            aria-label="Go to previous page"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-1">
            <label htmlFor="page-input" className="sr-only">Page number</label>
            <span>Page</span>
            <input
              id="page-input"
              type="number"
              value={table.getState().pagination.pageIndex + 1}
              onChange={(e) => {
                const page = e.target.value ? Number(e.target.value) - 1 : 0;
                table.setPageIndex(page);
              }}
              min={1}
              max={table.getPageCount()}
              className="w-12 rounded border border-gray-200 px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              aria-label="Current page"
            />
            <span>/ {table.getPageCount()}</span>
          </div>

          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value));
            }}
            className="rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            aria-label="Select number of rows per page"
          >
            {[5, 10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} / sayfa
              </option>
            ))}
          </select>

          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="rounded-lg border border-gray-200 p-2 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
            aria-label="Go to next page"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="rounded-lg border border-gray-200 p-2 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
            aria-label="Go to last page"
          >
            <ChevronsRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
