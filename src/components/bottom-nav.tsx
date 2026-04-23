"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Calendar, QrCode, User, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "ATTENDEE" | "VENDOR" | "ADMIN";

export function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname();
  if (pathname === "/login" || pathname === "/register") return null;

  const items = [
    { href: "/", label: "Home", icon: Home },
    { href: "/vendors", label: "Vendors", icon: Users },
    { href: "/schedule", label: "Schedule", icon: Calendar },
    role === "VENDOR"
      ? { href: "/vendor/scan", label: "Scan", icon: QrCode }
      : { href: "/scan", label: "Scan", icon: QrCode },
    role === "ADMIN"
      ? { href: "/admin", label: "Admin", icon: BarChart3 }
      : { href: "/me", label: "Me", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-around px-2 py-1">
        {items.map((it) => {
          const active = pathname === it.href || (it.href !== "/" && pathname.startsWith(it.href));
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 text-xs",
                active ? "text-[#0F172A]" : "text-slate-500"
              )}
            >
              <Icon className={cn("h-6 w-6", active && "stroke-[2.5]")} />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
