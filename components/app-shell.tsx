import { NavMenu } from "@/components/nav-menu";
import { CHAPTER_NAME } from "@/lib/branding";

export function AppShell({
  title,
  titleAccessory,
  showNav = true,
  children
}: {
  title: string;
  titleAccessory?: React.ReactNode;
  showNav?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">{CHAPTER_NAME}</p>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="min-w-0 break-words text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            {titleAccessory ? <div className="shrink-0">{titleAccessory}</div> : null}
          </div>
        </div>
        {showNav ? <NavMenu /> : null}
      </header>
      {children}
    </div>
  );
}
