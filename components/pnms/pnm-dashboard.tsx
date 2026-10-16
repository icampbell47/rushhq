"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, CalendarDays, Trash2 } from "lucide-react";
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender, createColumnHelper, type SortingState } from "@tanstack/react-table";
import { toast } from "sonner";
import { deletePnm } from "@/app/actions/pnms";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PnmStatusSelect, useOptimisticStatusUpdate } from "@/components/pnms/pnm-status-select";
import { pnmStatusClasses } from "@/components/pnms/status-styles";
import { PNM_STATUSES } from "@/lib/constants";
import { getDefaultRushDate, isPnmOnRushDate } from "@/lib/rush-day";
import type { PnmTableRow } from "@/lib/types/app";
import type { PnmStatus } from "@/lib/types/database";
import { averageScore } from "@/lib/aggregations";
import { cn, fullName } from "@/lib/utils";

const helper = createColumnHelper<PnmTableRow>();
const statusRank = new Map<PnmStatus, number>(PNM_STATUSES.map((status, index) => [status, index]));

export function PnmDashboard({ rows, initialRushDate }: { rows: PnmTableRow[]; initialRushDate?: string }) {
  const [query, setQuery] = useState("");
  const [localRows, setLocalRows] = useState(rows);
  const { savingId: savingStatusId, saveStatus } = useOptimisticStatusUpdate();
  const [sorting, setSorting] = useState<SortingState>([{ id: "status", desc: false }]);
  const [selectedRushDate, setSelectedRushDate] = useState<string | null>(initialRushDate ?? null);
  const [draftRushDate, setDraftRushDate] = useState(initialRushDate ?? getDefaultRushDate());

  const reviewRows = useMemo(() => {
    if (!selectedRushDate) return localRows;
    return localRows.filter((row) => isPnmOnRushDate(row.created_at, selectedRushDate, row.pnm_checkins));
  }, [localRows, selectedRushDate]);

  const filtered = useMemo(() => {
    const lower = query.toLowerCase();
    return reviewRows.filter((row) => `${fullName(row.first_name, row.last_name)} ${row.phone_number ?? ""} ${row.status}`.toLowerCase().includes(lower));
  }, [reviewRows, query]);

  const summary = useMemo(() => ({
    total: reviewRows.length,
    gettingHot: reviewRows.filter((row) => row.status === "Getting Hot").length,
    outstanding: reviewRows.filter((row) => row.status === "Bidded").length,
    pledge: reviewRows.filter((row) => row.status === "Pledge").length,
    declined: reviewRows.filter((row) => row.status === "Declined").length
  }), [reviewRows]);

  function setRushDateFilter(nextRushDate: string | null) {
    setSelectedRushDate(nextRushDate);
    const nextUrl = nextRushDate ? `/pnms?rushDate=${encodeURIComponent(nextRushDate)}` : "/pnms";
    window.history.replaceState(null, "", nextUrl);
  }

  const getPnmHref = useCallback((id: string) => {
    return selectedRushDate ? `/pnms/${id}?rushDate=${encodeURIComponent(selectedRushDate)}` : `/pnms/${id}`;
  }, [selectedRushDate]);

  const columns = useMemo(() => [
    helper.accessor((row) => fullName(row.first_name, row.last_name), {
      id: "name",
      header: "Name",
      cell: (info) => <Link href={getPnmHref(info.row.original.id)} className="font-semibold hover:text-primary">{info.getValue()}</Link>
    }),
    helper.accessor("status", {
      header: "Status",
      sortingFn: (rowA, rowB, columnId) => {
        const a = statusRank.get(rowA.getValue<PnmStatus>(columnId)) ?? Number.MAX_SAFE_INTEGER;
        const b = statusRank.get(rowB.getValue<PnmStatus>(columnId)) ?? Number.MAX_SAFE_INTEGER;
        return a - b;
      },
      cell: (info) => {
        const { id, status: previousStatus, first_name, last_name } = info.row.original;
        return (
          <PnmStatusSelect
            value={info.getValue()}
            disabled={savingStatusId === id}
            aria-label={`Status for ${fullName(first_name, last_name)}`}
            className="h-8 min-w-36 text-xs"
            onChange={(nextStatus) =>
              void saveStatus(id, nextStatus, previousStatus, (status) =>
                setLocalRows((current) => current.map((row) => (row.id === id ? { ...row, status } : row)))
              )
            }
          />
        );
      }
    }),
    helper.accessor("rating_count", { header: "# Ratings" }),
    helper.accessor("bid_yes_percentage", {
      header: "% Bid Yes",
      cell: (info) => {
        const value = info.getValue();
        return value === null ? "N/A" : `${value}%`;
      }
    }),
    helper.accessor("avg_humor", { header: "Avg Humor", cell: (info) => info.getValue() ?? "N/A" }),
    helper.accessor("avg_sociability", { header: "Avg Sociability", cell: (info) => info.getValue() ?? "N/A" }),
    helper.accessor("avg_genuineness", { header: "Avg Genuineness", cell: (info) => info.getValue() ?? "N/A" }),
    helper.accessor("avg_passion", { header: "Avg Passion", cell: (info) => info.getValue() ?? "N/A" }),
    helper.accessor("phone_number", { header: "Phone", cell: (info) => info.getValue() ?? "N/A" }),
    helper.display({
      id: "delete",
      header: "Delete",
      enableSorting: false,
      cell: (info) => <DeletePnmButton id={info.row.original.id} name={fullName(info.row.original.first_name, info.row.original.last_name)} onDeleted={() => setLocalRows((current) => current.filter((row) => row.id !== info.row.original.id))} />
    })
  ], [getPnmHref, saveStatus, savingStatusId]);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Summary label="Total PNMs" value={summary.total} />
        <Summary label="Getting hot" value={summary.gettingHot} />
        <Summary label="Bids given" value={summary.outstanding + summary.pledge + summary.declined} />
        <Summary label="Confirmed pledges" value={summary.pledge} />
        <Summary label="Declined bids" value={summary.declined} />
        <Summary label="Outstanding bids" value={summary.outstanding} />
      </div>
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
            Rush-day review
          </p>
          <p className="text-sm text-muted-foreground">
            {selectedRushDate ? `Showing PNMs checked in on ${selectedRushDate}.` : "Showing all PNMs."}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input type="date" aria-label="Rush date to review" value={draftRushDate} onChange={(event) => setDraftRushDate(event.target.value)} className="w-full sm:w-44" />
          <Button type="button" onClick={() => setRushDateFilter(draftRushDate)}>Review Date</Button>
          <Button type="button" variant="outline" onClick={() => setRushDateFilter(null)}>All PNMs</Button>
        </div>
      </div>
      <Input type="search" aria-label="Search PNMs" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search PNMs" className="max-w-md" />
      <div className="hidden overflow-x-auto rounded-lg border bg-card md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th key={header.id} className="px-3 py-3 font-semibold">
                    {header.column.getCanSort() ? (
                      <button type="button" onClick={header.column.getToggleSortingHandler()} className="flex items-center gap-1 text-left hover:text-primary">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
                      </button>
                    ) : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t">
                {row.getVisibleCells().map((cell) => <td key={cell.id} className="px-3 py-3">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 md:hidden">
        {table.getRowModel().rows.map((rowModel) => {
          const row = rowModel.original;
          return (
          <Link key={row.id} href={getPnmHref(row.id)} className="block rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">{fullName(row.first_name, row.last_name)}</h2>
              <Badge className={cn("rounded-full", pnmStatusClasses[row.status])}>{row.status}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Avg score: {averageScore([row.avg_humor, row.avg_sociability, row.avg_genuineness, row.avg_passion]) ?? "N/A"} · {row.rating_count} ratings · {row.bid_yes_percentage === null ? "N/A" : `${row.bid_yes_percentage}%`} bid yes
            </p>
          </Link>
          );
        })}
      </div>
      {savingStatusId ? <p className="text-sm text-muted-foreground">Saving status...</p> : null}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">{label}</p><p className="text-3xl font-bold">{value}</p></CardContent></Card>;
}

function DeletePnmButton({ id, name, onDeleted }: { id: string; name: string; onDeleted: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" aria-label={`Delete ${name}`}><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
          <AlertDialogDescription>All ratings for this PNM will be deleted too.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild><Button variant="outline">Cancel</Button></AlertDialogCancel>
          <Button variant="destructive" onClick={async () => {
            const result = await deletePnm(id);
            if (result.ok) {
              onDeleted();
              toast.success("PNM deleted");
              return;
            }
            toast.error(result.error);
          }}>Delete</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
