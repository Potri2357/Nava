"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  Gauge,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { href: "/ats", label: "ATS", Icon: LayoutDashboard },
  { href: "/roles", label: "Roles", Icon: BriefcaseBusiness },
  { href: "/candidates", label: "Candidates", Icon: Users },
  { href: "/intelligence", label: "Intelligence", Icon: Sparkles },
  { href: "/interviews", label: "Interviews", Icon: ClipboardList },
  { href: "/insights", label: "Insights", Icon: BarChart3 },
  { href: "/trust", label: "Trust", Icon: ShieldCheck },
  { href: "/settings", label: "Settings", Icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 lg:flex-row lg:items-center">
      {navItems.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition ${
              active
                ? "bg-slate-950 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            }`}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 lg:px-6">
          <Sheet>
            <SheetTrigger
              render={
                <Button variant="outline" size="icon" className="shrink-0 lg:hidden" />
              }
            >
              <Menu className="size-4" />
              <span className="sr-only">Open navigation</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <div className="mb-6 flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-md bg-slate-950 text-white">
                  <Gauge className="size-5" />
                </div>
                <div>
                  <div className="font-semibold">Nava</div>
                  <div className="text-xs text-slate-500">Hiring Intelligence</div>
                </div>
              </div>
              <NavLinks />
            </SheetContent>
          </Sheet>

          <Link href="/ats" className="flex min-w-fit items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-md bg-slate-950 text-white">
              <Gauge className="size-5" />
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-semibold leading-4">Nava</div>
              <div className="text-xs text-slate-500">Hiring Intelligence</div>
            </div>
          </Link>

          <div className="hidden flex-1 justify-center lg:flex">
            <NavLinks />
          </div>

          <div className="ml-auto hidden max-w-xs flex-1 items-center gap-2 xl:flex">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input className="h-9 pl-9" placeholder="Search roles, candidates, signals..." />
            </div>
          </div>

          <Badge variant="outline" className="hidden gap-1 bg-emerald-50 text-emerald-800 md:flex">
            <CheckCircle2 className="size-3" />
            Human-controlled AI
          </Badge>
          <Link href="/ats">
            <Button size="sm">
              <Upload className="size-4" />
              Upload
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-5 lg:px-6">
        {children}
      </main>
    </div>
  );
}
