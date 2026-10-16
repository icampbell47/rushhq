import { CheckInForm } from "@/components/pnms/check-in-form";

export default function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <section className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <div className="mb-2 h-[20vh] w-full bg-none">
            <img src="https://cdn.zephyrcms.com/35146ff3-d430-49f5-b529-ff9ce2aafc1f/-/progressive/yes/-/inline/no/coatof-arms-2015-color-2.png" alt="Delta Upsilon logo" className="mx-auto h-full rounded-md object-contain" />
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">Welcome to GT Delta Upsilon</h1>
        </div>
        <div className="rounded-lg border bg-card p-5 shadow-sm sm:p-7">
          <CheckInForm />
        </div>
      </section>
    </div>
  );
}
