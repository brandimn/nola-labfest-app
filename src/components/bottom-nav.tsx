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
    { href: "/", label: "Home", icon: Home, color: "#B13E7D" },
    { href: "/vendors", label: "Vendors", icon: Users, color: "#7C3AED" },
    { href: "/schedule", label: "Schedule", icon: Calendar, color: "#0EA5E9" },
    role === "VENDOR"
      ? { href: "/vendor/scan", label: "Scan", icon: QrCode, color: "#0E8C4B" }
      : { href: "/scan", label: "Scan", icon: QrCode, color: "#0E8C4B" },
    role === "ADMIN"
      ? { href: "/admin", label: "Admin", icon: BarChart3, color: "#F59E0B" }
      : { href: "/me", label: "Me", icon: User, color: "#EC4899" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-[#F5A547]/60 bg-white/95 backdrop-blur">
      {/* Mardi Gras ribbon */}
      <div className="h-1 w-full bg-gradient-to-r from-[#7C3AED] via-[#0E8C4B] to-[#F5A547]" />
      <div className="mx-auto flex max-w-2xl items-center justify-around px-2 py-1.5">
        {items.map((it) => {
          const active =
            pathname === it.href || (it.href !== "/" && pathname.startsWith(it.href));
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className="flex flex-col items-center gap-1 px-2 py-1"
            >
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-200",
                  active ? "scale-110 shadow-md" : "scale-100"
                )}
                style={active ? { backgroundColor: it.color } : undefined}
              >
                <Icon
                  className={cn("h-6 w-6", active ? "text-white stroke-[2.5]" : "text-slate-400")}
                />
              </span>
              <span
                className={cn(
                  "text-[11px] font-bold transition-colors",
                  active ? "" : "text-slate-400"
                )}
                style={active ? { color: it.color } : undefined}
              >
                {it.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
