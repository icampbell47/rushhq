import { ClipboardCheck } from "lucide-react";
import { CheckInForm } from "@/components/pnms/check-in-form";
import { CHAPTER_NAME } from "@/lib/branding";

export default function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <section className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm sm:h-24 sm:w-24">
            <ClipboardCheck className="h-10 w-10 sm:h-12 sm:w-12" aria-hidden="true" />
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">Welcome to {CHAPTER_NAME}</h1>
          <p className="mt-2 text-muted-foreground">Check in below so brothers can find you tonight.</p>
        </div>
        <div className="rounded-lg border bg-card p-5 shadow-sm sm:p-7">
          <CheckInForm />
        </div>
      </section>
    </div>
  );
}
