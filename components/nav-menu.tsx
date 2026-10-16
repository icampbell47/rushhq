"use client";

import Link from "next/link";
import { ClipboardList, Home, LogOut, Menu, Star, Users } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { logoutAction } from "@/app/actions/auth";

const navItems = [
  { href: "/", label: "Check-in", icon: Home },
  { href: "/rate", label: "Rate a PNM", icon: Star },
  { href: "/pnms", label: "PNM Dashboard", icon: ClipboardList },
  { href: "/brothers", label: "Brother Dashboard", icon: Users }
];

export function NavMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      // Return focus to the toggle so keyboard users are not dropped at the
      // top of the document.
      buttonRef.current?.focus();
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <nav ref={menuRef} aria-label="Main" className="relative z-40">
      <button
        ref={buttonRef}
        type="button"
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-10 items-center justify-center rounded-md border bg-card shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Menu className="h-4 w-4" aria-hidden="true" />
      </button>
      <div id={panelId} hidden={!open} className="absolute right-0 mt-2 w-64 overflow-hidden rounded-lg border bg-card p-1 shadow-lg">
        <ul>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link href={item.href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                  <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <form action={logoutAction} className="border-t">
          <button type="submit" className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
            <LogOut className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span>Log out</span>
          </button>
        </form>
      </div>
    </nav>
  );
}
