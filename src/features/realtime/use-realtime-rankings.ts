"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import type { RankedCandidate, RecruiterJob } from "@/features/recruiter/types";
import { hasSupabaseBrowserConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

export function useLiveJobs(initialJobs: RecruiterJob[]) {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const payload = await getJson<{ data: RecruiterJob[] }>("/api/jobs");
      return payload.data;
    },
    initialData: initialJobs,
  });
}

export function useLiveRankings(jobId: string, initialRows: RankedCandidate[]) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["rankings", jobId],
    queryFn: async () => {
      const payload = await getJson<{ data: RankedCandidate[] }>(`/api/jobs/${jobId}/scores`);
      return payload.data;
    },
    initialData: initialRows,
    enabled: Boolean(jobId),
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!hasSupabaseBrowserConfig() || !jobId) return;

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
