"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import type { DemoJob } from "@/features/demo/data";
import type { DemoRankedCandidate } from "@/features/demo/ranking";
import { hasSupabaseBrowserConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

export function useLiveJobs(initialJobs: DemoJob[]) {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const payload = await getJson<{ data: DemoJob[] }>("/api/jobs");
      return payload.data;
    },
    initialData: initialJobs,
  });
}

export function useLiveRankings(jobId: string, initialRows: DemoRankedCandidate[]) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["rankings", jobId],
    queryFn: async () => {
      const payload = await getJson<{ data: DemoRankedCandidate[] }>(`/api/jobs/${jobId}/scores`);
      return payload.data;
    },
    initialData: initialRows,
  });

  useEffect(() => {
    if (!hasSupabaseBrowserConfig()) return;

    let supabase;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    const channel = supabase
      .channel(`rankings:${jobId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scores", filter: `job_id=eq.${jobId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["rankings", jobId] });
          toast.info("Ranking updated from Supabase");
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "candidates" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["rankings", jobId] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jobs" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["jobs"] });
          queryClient.invalidateQueries({ queryKey: ["rankings", jobId] });
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          toast.success("Realtime Supabase channel connected");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, queryClient]);

  return query;
}
