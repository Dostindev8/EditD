const API = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const isForm = init?.body instanceof FormData;
  const res = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    headers: isForm
      ? { ...(init?.headers ?? {}) }
      : { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (res.status === 401 && !path.includes("/auth/login") && !path.includes("/auth/register")) {
    const refresh = await fetch(`${API}/api/auth/refresh`, { method: "POST", credentials: "include" });
    if (refresh.ok) {
      const retry = await fetch(`${API}${path}`, {
        ...init,
        credentials: "include",
        headers: isForm
          ? { ...(init?.headers ?? {}) }
          : { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      });
      if (!retry.ok) throw new Error(await readErr(retry));
      return retry.json() as Promise<T>;
    }
  }
  if (!res.ok) throw new Error(await readErr(res));
  return res.json() as Promise<T>;
}

async function readErr(res: Response) {
  try {
    const j = await res.json();
    const msg = j.message;
    if (Array.isArray(msg)) return msg.join(", ");
    return (msg as string) || res.statusText;
  } catch {
    return res.statusText;
  }
}

export type User = { id: string; email: string; name: string };
export type Workspace = { id: string; name: string; slug: string; monthlyBudgetCents?: number };
export type Project = { id: string; workspaceId: string; name: string };

export type VideoOption = {
  id: string;
  title: string;
  description: string;
  aspectRatio: "9:16" | "1:1" | "16:9";
  durationSec: number;
  style: string;
  cameraMovement: string;
  platform: string;
  estimatedCostCents: number;
  prompt: string;
};

export type ChatMsg = {
  id: string;
  role: string;
  content: string;
  assetId?: string;
  toolTrace?: {
    videoOptions?: VideoOption[];
    selectedOption?: VideoOption;
    generationJob?: GenerationJob;
    estimatedCostCents?: number;
    hasImage?: boolean;
    budget?: { freeTier?: boolean; reason?: string; allowed?: boolean };
    error?: string;
  };
};

export type GenerationJob = {
  id: string;
  workspaceId: string;
  projectId: string;
  status: string;
  progress: number;
  provider: string;
  costCents: number;
  outputUrl?: string;
  errorMessage?: string;
};

export type Asset = {
  id: string;
  filename: string;
  mimeType: string;
  url: string;
  sizeBytes?: number;
};

export async function uploadAsset(
  workspaceId: string,
  projectId: string,
  file: File,
): Promise<Asset> {
  const fd = new FormData();
  fd.append("file", file);
  return api<Asset>(`/api/workspaces/${workspaceId}/projects/${projectId}/assets/upload`, {
    method: "POST",
    body: fd,
  });
}

export function assetUrl(url: string) {
  return url.startsWith("http") ? url : `${API}${url}`;
}
