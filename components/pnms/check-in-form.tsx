"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { type FieldErrors, useForm } from "react-hook-form";
import { toast } from "sonner";
import { createPnm } from "@/app/actions/pnms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { YEAR_OPTIONS } from "@/lib/constants";
import { cn, getErrorMessage } from "@/lib/utils";
import { checkInSchema, type CheckInValues } from "@/lib/validations/pnms";

const defaultValues: Partial<CheckInValues> = {
  first_name: "",
  last_name: "",
  hometown: "",
  major: "",
  instagram_handle: "",
  phone_number: ""
};

export function CheckInForm() {
  const [yearSelectKey, setYearSelectKey] = useState(0);
  const form = useForm<CheckInValues>({
    resolver: zodResolver(checkInSchema),
    defaultValues
  });

  async function onSubmit(values: CheckInValues) {
    try {
      const result = await createPnm(values);
      if (!result.ok) {
        toast.error("Check-in was not saved", { description: result.error });
        return;
      }
      toast.success("You're checked in");
      form.reset(defaultValues);
      setYearSelectKey((key) => key + 1);
    } catch (error) {
      toast.error("Check-in was not saved", { description: getErrorMessage(error) });
    }
  }

  function onInvalid(errors: FieldErrors<CheckInValues>) {
    const messages = [
      errors.first_name?.message,
      errors.last_name?.message,
      errors.year_of_school?.message,
      errors.major?.message
    ].filter((message): message is string => typeof message === "string");

    toast.error("Check-in was not saved", {
      description: messages.length ? messages.join(". ") : "Please review the required fields and try again"
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="grid gap-4 sm:grid-cols-2">
      <Field label="First Name" error={form.formState.errors.first_name?.message}>
        <Input {...form.register("first_name")} autoComplete="given-name" />
      </Field>
      <Field label="Last Name" error={form.formState.errors.last_name?.message}>
        <Input {...form.register("last_name")} autoComplete="family-name" />
      </Field>
      <Field label="Hometown" error={form.formState.errors.hometown?.message}>
        <Input {...form.register("hometown")} />
      </Field>
      <Field label="Year of School" error={form.formState.errors.year_of_school?.message}>
        <Select
          key={yearSelectKey}
          value={form.watch("year_of_school") ?? ""}
          onValueChange={(value) => form.setValue("year_of_school", value as CheckInValues["year_of_school"], { shouldValidate: true })}
        >
          <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
          <SelectContent>{YEAR_OPTIONS.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="Major" error={form.formState.errors.major?.message}>
        <Input {...form.register("major")} autoComplete="organization-title" />
      </Field>
      <Field label="Instagram (optional)" error={form.formState.errors.instagram_handle?.message}>
        <Input {...form.register("instagram_handle")} placeholder="@username" autoComplete="off" />
      </Field>
      <Field label="Phone Number" error={form.formState.errors.phone_number?.message}>
        <Input {...form.register("phone_number")} type="tel" autoComplete="tel" maxLength={20} />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Check In"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
