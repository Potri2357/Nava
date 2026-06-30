import { DemoRecruiterApp } from "@/components/features/demo-recruiter-app";
import { demoJobs } from "@/features/demo/data";
import { rankDemoCandidates } from "@/features/demo/ranking";

export default function Home() {
  const initialJob = demoJobs[0];
  const initialRows = rankDemoCandidates(initialJob.id, initialJob.scoring_weights);

  return <DemoRecruiterApp initialRows={initialRows} initialJobs={demoJobs} />;
}
