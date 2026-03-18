const QANALYZER_BASE =
  process.env.QANALYZER_URL || "http://localhost:8080";

export interface AnalyzeResponse {
  job_id: string;
  status: string;
}

export interface JobStatus {
  job_id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  failure?: { code: string; message: string };
}

export interface AnalysisSection {
  start: number;
  end: number;
  tempo_bpm: number | null;
  tempo_bpm_rounded: number | null;
  key: string | null;
  mode: string | null;
  confidence: number;
  tuning: number | null;
  tuning_rounded: number | null;
}

export interface AnalysisResult {
  job_id: string;
  status: string;
  result: {
    global: {
      swing: boolean;
      no_drums: boolean;
      no_tempo: boolean;
      no_key: boolean;
      bars_percussion: number;
      bars_percussion_rounded: number;
    };
    sections: AnalysisSection[];
    track: {
      title: string | null;
      artist: string | null;
      source_url: string;
    };
  };
}

export async function submitAnalysis(
  youtubeUrl: string
): Promise<AnalyzeResponse> {
  const res = await fetch(`${QANALYZER_BASE}/v1/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source_type: "youtube",
      source: youtubeUrl,
    }),
  });
  if (!res.ok) throw new Error(`QAnalyzer submit failed: ${res.status}`);
  return res.json();
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const res = await fetch(`${QANALYZER_BASE}/v1/jobs/${jobId}`);
  if (!res.ok) throw new Error(`QAnalyzer job status failed: ${res.status}`);
  return res.json();
}

export async function getJobResult(jobId: string): Promise<AnalysisResult> {
  const res = await fetch(`${QANALYZER_BASE}/v1/results/${jobId}`);
  if (!res.ok) throw new Error(`QAnalyzer results failed: ${res.status}`);
  return res.json();
}
