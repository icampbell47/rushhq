"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteBrother, upsertBrother } from "@/app/actions/brothers";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { BrotherTableRow } from "@/lib/types/app";

type EditableBrother = {
  rollbook_number: string;
  first_name: string;
  last_name: string;
};

type BrotherSortKey = "rollbook_number" | "first_name" | "last_name" | "bid_percentage" | "rating_count";
type SortDirection = "asc" | "desc";

export function BrotherDashboard({ rows }: { rows: BrotherTableRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<EditableBrother>({ rollbook_number: "", first_name: "", last_name: "" });
  const [newBrother, setNewBrother] = useState<EditableBrother>({ rollbook_number: "", first_name: "", last_name: "" });
  const [sort, setSort] = useState<{ key: BrotherSortKey; direction: SortDirection }>({ key: "rollbook_number", direction: "asc" });

  const filtered = useMemo(() => {
    const lower = query.toLowerCase();
    return rows.filter((row) => `${row.rollbook_number} ${row.first_name} ${row.last_name}`.toLowerCase().includes(lower));
  }, [rows, query]);

  const sortedRows = useMemo(() => {
    return [...filtered].sort((a, b) => compareBrotherRows(a, b, sort.key, sort.direction));
  }, [filtered, sort]);

  const totalRatings = rows.reduce((sum, row) => sum + row.rating_count, 0);
  const selectivityValues = rows.filter((row) => row.bid_percentage !== null).map((row) => row.bid_percentage as number);
  const avgSelectivity = selectivityValues.length ? Math.round(selectivityValues.reduce((sum, value) => sum + value, 0) / selectivityValues.length) : null;

  async function saveBrother(previousRollbook?: number) {
    const payload = previousRollbook ? draft : newBrother;
    const result = await upsertBrother(payload, previousRollbook);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message ?? "Saved");
    setEditing(null);
    setNewBrother({ rollbook_number: "", first_name: "", last_name: "" });
    router.refresh();
  }

  function toggleSort(key: BrotherSortKey) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc"
    }));
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Summary label="Total brothers" value={rows.length} />
        <Summary label="Total ratings" value={totalRatings} />
        <Summary label="Average selectivity" value={avgSelectivity === null ? "N/A" : `${avgSelectivity}%`} />
      </div>
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search brothers" className="max-w-md" />
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <SortableHeader label="Rollbook #" sortKey="rollbook_number" activeSort={sort} onSort={toggleSort} />
              <SortableHeader label="First Name" sortKey="first_name" activeSort={sort} onSort={toggleSort} />
              <SortableHeader label="Last Name" sortKey="last_name" activeSort={sort} onSort={toggleSort} />
              <SortableHeader label="% Bid Votes" sortKey="bid_percentage" activeSort={sort} onSort={toggleSort} />
              <SortableHeader label="# Ratings" sortKey="rating_count" activeSort={sort} onSort={toggleSort} />
              <th className="px-3 py-3">Edit</th>
              <th className="px-3 py-3">Delete</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const isEditing = editing === row.rollbook_number;
              return (
                <tr key={row.rollbook_number} className="border-t">
                  <td className="px-3 py-3">{isEditing ? <Input value={draft.rollbook_number} onChange={(event) => setDraft({ ...draft, rollbook_number: event.target.value })} /> : row.rollbook_number}</td>
                  <td className="px-3 py-3">{isEditing ? <Input value={draft.first_name} onChange={(event) => setDraft({ ...draft, first_name: event.target.value })} /> : row.first_name}</td>
                  <td className="px-3 py-3">{isEditing ? <Input value={draft.last_name} onChange={(event) => setDraft({ ...draft, last_name: event.target.value })} /> : row.last_name}</td>
                  <td className="px-3 py-3">{row.bid_percentage === null ? "N/A" : `${row.bid_percentage}%`}</td>
                  <td className="px-3 py-3">{row.rating_count}</td>
                  <td className="px-3 py-3">
                    <Button variant="outline" size="sm" onClick={() => {
                      if (isEditing) void saveBrother(row.rollbook_number);
                      else {
                        setEditing(row.rollbook_number);
                        setDraft({ rollbook_number: row.rollbook_number.toString(), first_name: row.first_name, last_name: row.last_name });
                      }
                    }}>
                      {isEditing ? <Save className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                      {isEditing ? "Save" : "Edit"}
                    </Button>
                  </td>
                  <td className="px-3 py-3"><DeleteBrotherButton rollbook={row.rollbook_number} onDeleted={() => router.refresh()} /></td>
                </tr>
              );
            })}
            <tr className="border-t bg-muted/30">
              <td className="px-3 py-3"><Input value={newBrother.rollbook_number} onChange={(event) => setNewBrother({ ...newBrother, rollbook_number: event.target.value })} placeholder="Rollbook" /></td>
              <td className="px-3 py-3"><Input value={newBrother.first_name} onChange={(event) => setNewBrother({ ...newBrother, first_name: event.target.value })} placeholder="First" /></td>
              <td className="px-3 py-3"><Input value={newBrother.last_name} onChange={(event) => setNewBrother({ ...newBrother, last_name: event.target.value })} placeholder="Last" /></td>
              <td className="px-3 py-3">N/A</td>
              <td className="px-3 py-3">0</td>
              <td className="px-3 py-3" colSpan={2}><Button onClick={() => void saveBrother()}><Plus className="h-4 w-4" />Add</Button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string | number }) {
  return <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">{label}</p><p className="text-3xl font-bold">{value}</p></CardContent></Card>;
}

function SortableHeader({
  label,
  sortKey,
  activeSort,
  onSort
}: {
  label: string;
  sortKey: BrotherSortKey;
  activeSort: { key: BrotherSortKey; direction: SortDirection };
  onSort: (key: BrotherSortKey) => void;
}) {
  const isActive = activeSort.key === sortKey;
  return (
    <th className="px-3 py-3">
      <button type="button" onClick={() => onSort(sortKey)} className="flex items-center gap-1 font-semibold hover:text-primary">
        {label}
        <ArrowUpDown className={`h-3.5 w-3.5 ${isActive ? "opacity-100" : "opacity-50"}`} aria-hidden="true" />
      </button>
    </th>
  );
}

function compareBrotherRows(a: BrotherTableRow, b: BrotherTableRow, key: BrotherSortKey, direction: SortDirection) {
  const directionMultiplier = direction === "asc" ? 1 : -1;
  const aValue = a[key];
  const bValue = b[key];

  if (typeof aValue === "string" && typeof bValue === "string") {
    return aValue.localeCompare(bValue, undefined, { sensitivity: "base" }) * directionMultiplier;
  }

  const aNumber = typeof aValue === "number" ? aValue : direction === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  const bNumber = typeof bValue === "number" ? bValue : direction === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  return (aNumber - bNumber) * directionMultiplier;
}

function DeleteBrotherButton({ rollbook, onDeleted }: { rollbook: number; onDeleted: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" aria-label={`Delete ${rollbook}`}><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete brother #{rollbook}?</AlertDialogTitle>
          <AlertDialogDescription>Their historical ratings remain, and future displays will show Anonymous if no brother record is attached.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild><Button variant="outline">Cancel</Button></AlertDialogCancel>
          <Button variant="destructive" onClick={async () => {
            const result = await deleteBrother(rollbook);
            if (result.ok) {
              toast.success("Brother deleted");
              onDeleted();
              return;
            }
            toast.error(result.error);
          }}>Delete</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
