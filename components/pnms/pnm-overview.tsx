"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { updatePnm } from "@/app/actions/pnms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isYearOfSchool, YEAR_OPTIONS } from "@/lib/constants";
import type { PnmWithRatings } from "@/lib/types/app";
import { averageScore } from "@/lib/aggregations";
import { formatDate, fullName } from "@/lib/utils";
import type { PnmUpdateValues } from "@/lib/validations/pnms";

const scoreColors = ["#005f9e", "#f4c430", "#2f8f83", "#c2410c"];

export function PnmOverview({ pnm }: { pnm: PnmWithRatings }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PnmUpdateValues>({
    first_name: pnm.first_name,
    last_name: pnm.last_name,
    hometown: pnm.hometown,
    year_of_school: isYearOfSchool(pnm.year_of_school) ? pnm.year_of_school : "Freshman",
    major: pnm.major ?? "",
    instagram_handle: pnm.instagram_handle ?? "",
    email: pnm.email,
    phone_number: pnm.phone_number
  });

  const avgHumor = averageScore(pnm.ratings.map((rating) => rating.humor_score));
  const avgSociability = averageScore(pnm.ratings.map((rating) => rating.sociability_score));
  const avgGenuineness = averageScore(pnm.ratings.map((rating) => rating.genuineness_score));
  const avgPassion = averageScore(pnm.ratings.map((rating) => rating.passion_score));
  const chartData = useMemo(() => [
    { category: "Humor", average: avgHumor ?? 0 },
    { category: "Sociability", average: avgSociability ?? 0 },
    { category: "Genuineness", average: avgGenuineness ?? 0 },
    { category: "Passion", average: avgPassion ?? 0 }
  ], [avgGenuineness, avgHumor, avgPassion, avgSociability]);

  const bidVotes = pnm.ratings.filter((rating) => rating.bid_vote === true);
  const notSureVotes = pnm.ratings.filter((rating) => rating.bid_vote === null);
  const noBidVotes = pnm.ratings.filter((rating) => rating.bid_vote === false);

  async function save() {
    const result = await updatePnm(pnm.id, draft);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("PNM updated");
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Bio</CardTitle>
          {editing ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </div>
          ) : <Button variant="outline" onClick={() => setEditing(true)}>Edit</Button>}
        </CardHeader>
        <CardContent className="space-y-4">
          <Editable label="First Name" value={draft.first_name ?? ""} editing={editing} onChange={(value) => setDraft({ ...draft, first_name: value })} />
          <Editable label="Last Name" value={draft.last_name ?? ""} editing={editing} onChange={(value) => setDraft({ ...draft, last_name: value })} />
          <Editable label="Hometown" value={draft.hometown ?? ""} editing={editing} onChange={(value) => setDraft({ ...draft, hometown: value })} />
          <Editable label="Major" value={draft.major ?? ""} editing={editing} onChange={(value) => setDraft({ ...draft, major: value })} />
          {editing ? (
            <FormField label="Year">
              {(control) => (
                <Select value={draft.year_of_school ?? "Freshman"} onValueChange={(value) => setDraft({ ...draft, year_of_school: value as PnmUpdateValues["year_of_school"] })}>
                  <SelectTrigger {...control}><SelectValue /></SelectTrigger>
                  <SelectContent>{YEAR_OPTIONS.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </FormField>
          ) : <ReadOnlyField label="Year" value={pnm.year_of_school ?? "N/A"} />}
          <Editable label="Instagram" value={draft.instagram_handle ?? ""} editing={editing} onChange={(value) => setDraft({ ...draft, instagram_handle: value })} />
          <Editable label="Email (Legacy)" value={draft.email ?? ""} editing={editing} onChange={(value) => setDraft({ ...draft, email: value })} />
          <Editable label="Phone" value={draft.phone_number ?? ""} editing={editing} onChange={(value) => setDraft({ ...draft, phone_number: value })} />
          <div className="space-y-2">
            <p className="text-sm font-bold leading-none">Interests / Activities</p>
            <div className="space-y-2">
              {pnm.ratings.filter((rating) => rating.interests_activities).map((rating) => (
                <p key={rating.id} className="rounded-md bg-muted p-3 text-sm">{rating.interests_activities}</p>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="space-y-5">
        <Card>
          <CardHeader><CardTitle>PNM Scores ({pnm.ratings.length} Ratings)</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Bar dataKey="average" barSize={30} radius={[4, 4, 0, 0]} label={{ position: "top" }}>
                  {chartData.map((entry, index) => <Cell key={entry.category} fill={scoreColors[index]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <div className="grid gap-5 sm:grid-cols-3">
          <VoteColumn title="Bid" ratings={bidVotes} />
          <VoteColumn title="Not Sure" ratings={notSureVotes} />
          <VoteColumn title="No Bid" ratings={noBidVotes} />
        </div>
        <Card>
          <CardHeader><CardTitle>Comments</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {pnm.ratings.filter((rating) => rating.comments).map((rating) => (
              <div key={rating.id} className="rounded-md border p-3">
                <p className="text-sm">{rating.comments}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {rating.brothers ? fullName(rating.brothers.first_name, rating.brothers.last_name) : "Anonymous"} · {formatDate(rating.submitted_at)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Editable({ label, value, editing, onChange }: { label: string; value: string; editing: boolean; onChange: (value: string) => void }) {
  if (!editing) return <ReadOnlyField label={label} value={value || "N/A"} />;
  return (
    <FormField label={label}>
      {(control) => <Input value={value} onChange={(event) => onChange(event.target.value)} {...control} />}
    </FormField>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-bold leading-none">{label}</p>
      <p>{value}</p>
    </div>
  );
}

function VoteColumn({ title, ratings }: { title: string; ratings: PnmWithRatings["ratings"] }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {ratings.length ? ratings.map((rating) => <p key={rating.id} className="text-sm">{rating.brothers ? fullName(rating.brothers.first_name, rating.brothers.last_name) : "Anonymous"}</p>) : <p className="text-sm text-muted-foreground">No votes</p>}
      </CardContent>
    </Card>
  );
}
