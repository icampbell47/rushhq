"use client";

import type * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import Cookies from "js-cookie";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { type FieldErrors, useForm } from "react-hook-form";
import { toast } from "sonner";
import { createRating } from "@/app/actions/ratings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Brother, Pnm, Rating } from "@/lib/types/database";
import { fullName } from "@/lib/utils";
import { ratingSchema, type RatingValues } from "@/lib/validations/ratings";

const scoreFields = [
  ["humor_score", "Humor"],
  ["sociability_score", "Sociability"],
  ["genuineness_score", "Genuineness"],
  ["passion_score", "Passion"]
] as const;

export function RatingForm({ pnms, brothers, ratings }: { pnms: Pnm[]; brothers: Brother[]; ratings: Rating[] }) {
  const [pnmQuery, setPnmQuery] = useState("");
  const [brotherQuery, setBrotherQuery] = useState("");
  const [submittedRatings, setSubmittedRatings] = useState(ratings);
  const rememberedBrother = parseInt(Cookies.get("du_last_brother") ?? "0") || 0;
  const form = useForm<RatingValues>({
    resolver: zodResolver(ratingSchema),
    defaultValues: {
      pnm_id: "",
      brother_rollbook_number: rememberedBrother,
      humor_score: 3,
      sociability_score: 3,
      genuineness_score: 3,
      passion_score: 3,
      bid_vote: null,
      comments: "",
      interests_activities: ""
    }
  });

  const selectedPnm = form.watch("pnm_id");
  const selectedBrother = form.watch("brother_rollbook_number");
  const duplicate = submittedRatings.some((rating) =>
    rating.pnm_id === selectedPnm &&
    (rating.submitted_by_rollbook === String(selectedBrother) || rating.brother_rollbook_number === selectedBrother)
  );

  const filteredPnms = useMemo(() => {
    const query = pnmQuery.toLowerCase();
    return pnms.filter((pnm) => `${fullName(pnm.first_name, pnm.last_name)} ${pnm.hometown ?? ""}`.toLowerCase().includes(query));
  }, [pnms, pnmQuery]);

  const filteredBrothers = useMemo(() => {
    if (!brotherQuery.trim()) return [];
    const query = brotherQuery.toLowerCase();
    return brothers.filter((brother) => `${fullName(brother.first_name, brother.last_name)} ${brother.rollbook_number}`.toLowerCase().includes(query));
  }, [brothers, brotherQuery]);

  async function onSubmit(values: RatingValues) {
    try {
      const result = await createRating(values);
      if (!result.ok) {
        toast.error("Rating was not submitted", { description: result.error });
        return;
      }
      Cookies.set("du_last_brother", values.brother_rollbook_number.toString(), { expires: 90 });
      setSubmittedRatings((current) => [...current, result.data]);
      toast.success("Rating submitted");
      form.reset({
        pnm_id: "",
        brother_rollbook_number: values.brother_rollbook_number,
        humor_score: 3,
        sociability_score: 3,
        genuineness_score: 3,
        passion_score: 3,
        bid_vote: null,
        comments: "",
        interests_activities: ""
      });
      setPnmQuery("");
    } catch (error) {
      toast.error("Rating was not submitted", { description: error instanceof Error ? error.message : "An unexpected error occurred" });
    }
  }

  function onInvalid(errors: FieldErrors<RatingValues>) {
    const messages = [
      errors.pnm_id?.message,
      errors.brother_rollbook_number?.message
    ].filter((message): message is string => typeof message === "string" && message.length > 0);

    toast.error("Rating was not submitted", {
      description: messages.length ? messages.join(". ") : "Please review the required fields and try again"
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader><CardTitle>Who are you rating?</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <SearchPicker
            label="PNM"
            query={pnmQuery}
            onQueryChange={setPnmQuery}
            placeholder="Search by name or hometown"
            selected={selectedPnm}
            items={filteredPnms.map((pnm) => ({
              id: pnm.id,
              title: fullName(pnm.first_name, pnm.last_name),
              subtitle: pnm.hometown ?? "No hometown listed"
            }))}
            onSelect={(id) => form.setValue("pnm_id", id, { shouldValidate: true })}
          />
          <SearchPicker
            label="Brother"
            query={brotherQuery}
            onQueryChange={setBrotherQuery}
            placeholder="Search by name or rollbook"
            selected={selectedBrother.toString()}
            items={filteredBrothers.map((brother) => ({
              id: brother.rollbook_number.toString(),
              title: fullName(brother.first_name, brother.last_name),
              subtitle: `Rollbook #${brother.rollbook_number}`
            }))}
            onSelect={(id) => form.setValue("brother_rollbook_number", parseInt(id), { shouldValidate: true })}
            showResults={brotherQuery.trim().length > 0}
          />
          {duplicate ? <p className="rounded-md border border-secondary bg-secondary/15 p-3 text-sm font-medium">This brother has already rated this PNM. You can still submit another rating.</p> : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Scores and notes</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          {scoreFields.map(([name, label]) => (
            <div key={name} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{label}</Label>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((score) => (
                  <Button
                    key={score}
                    type="button"
                    variant={form.watch(name) === score ? "default" : "outline"}
                    className={form.watch(name) === score ? "bg-[#0b6fae] text-white hover:bg-[#095e95]" : "border-[#0b6fae]/35 text-[#0b6fae] hover:bg-[#0b6fae]/10 dark:border-sky-300/40 dark:text-sky-200 dark:hover:bg-sky-300/10"}
                    onClick={() => form.setValue(name, score, { shouldValidate: true })}
                  >
                    {score}
                  </Button>
                ))}
              </div>
            </div>
          ))}
          <div className="grid grid-cols-3 gap-3">
            <Button type="button" size="lg" variant={form.watch("bid_vote") ? "vote_yes" : "outline"} onClick={() => form.setValue("bid_vote", true)}>Bid</Button>
            <Button
              type="button"
              size="lg"
              variant={form.watch("bid_vote") === null ? "secondary" : "outline"}
              className={form.watch("bid_vote") === null ? "bg-[#d7b65d] text-[#172033] hover:bg-[#c9a64c]" : ""}
              onClick={() => form.setValue("bid_vote", null)}
            >
              Not Sure
            </Button>
            <Button type="button" size="lg" variant={form.watch("bid_vote") === false ? "vote_no" : "outline"} onClick={() => form.setValue("bid_vote", false)}>No Bid</Button>
          </div>
          <TextAreaField label="Comments" registration={form.register("comments")} />
          <TextAreaField label="Interests / Activities" registration={form.register("interests_activities")} />
          <Button type="submit" size="lg" variant="default" className="w-full bg-[#0b6fae] text-white hover:bg-[#095e95]" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Submitting..." : "Submit Rating"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}

function SearchPicker({
  label,
  query,
  onQueryChange,
  placeholder,
  selected,
  items,
  onSelect,
  showResults = true
}: {
  label: string;
  query: string;
  onQueryChange: (value: string) => void;
  placeholder: string;
  selected: string;
  items: Array<{ id: string; title: string; subtitle: string }>;
  onSelect: (id: string) => void;
  showResults?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={placeholder} className="pl-9" />
      </div>
      {showResults ? (
        <div className="max-h-44 overflow-auto rounded-md border">
          {items.map((item) => (
            <button key={item.id} type="button" onClick={() => onSelect(item.id)} className={`flex w-full flex-col px-3 py-1.5 text-left text-sm hover:bg-muted ${selected === item.id ? "bg-primary/10" : ""}`}>
              <span className="font-semibold leading-tight">{item.title}</span>
              <span className="text-xs leading-tight text-muted-foreground">{item.subtitle}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TextAreaField({ label, registration, error }: { label: string; registration: ReturnType<ReturnType<typeof useForm<RatingValues>>["register"]>; error?: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea {...registration} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
