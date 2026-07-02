"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewJobPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function createJob(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const company = String(form.get("company") ?? "").trim();
    const raw_description = String(form.get("raw_description") ?? "").trim();

    if (!title || !raw_description) {
      toast.error("Title and job description are required");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, company, raw_description }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message ?? "Could not create job");
      }
      toast.success("Job created. Opening recruiter flow.");
      router.push(`/?job=${payload.data.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create job");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <DashboardShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Job</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Draft the role, then use the landing page recruiter flow to rank candidates.
          </p>
        </div>
        <Link href="/">
          <Button variant="outline">Open recruiter flow</Button>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Job Intake</CardTitle>
            <CardDescription>
              The live API endpoint is ready at `/api/jobs`; this page defines the production form structure.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={createJob}>
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" placeholder="Senior Platform Engineer" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company">Company</Label>
              <Input id="company" name="company" placeholder="Northstar Fintech" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Job description</Label>
              <textarea
                id="description"
                name="raw_description"
                className="min-h-56 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Paste the role description, required skills, seniority, domain, and responsibilities..."
              />
            </div>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save job"}
            </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Parser Output</CardTitle>
            <CardDescription>What Nava extracts before ranking.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {["Required skills", "Nice-to-haves", "Seniority", "Domain", "Years", "Responsibilities", "Scoring weights"].map((item) => (
              <div key={item} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
                <span className="text-sm">{item}</span>
                <Badge variant="outline">Parsed</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
