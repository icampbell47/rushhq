"use client";

import Link from "next/link";
import { ClipboardList, Home, LogOut, Menu, Star, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  return (
    <div ref={menuRef} className="relative z-40" onMouseEnter={() => setOpen(true)}>
      <button
        type="button"
        aria-label="Open navigation"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-10 items-center justify-center rounded-md border bg-card shadow-sm transition-colors hover:bg-muted"
      >
        <Menu className="h-4 w-4" aria-hidden="true" />
      </button>
      {open ? (
        <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-lg border bg-card p-1 shadow-lg">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-muted">
                <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <form action={logoutAction} className="border-t">
            <button type="submit" className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium hover:bg-muted">
              <LogOut className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span>Log out</span>
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
