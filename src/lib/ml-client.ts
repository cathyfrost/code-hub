const ML_SERVICE_URL =
  process.env.ML_SERVICE_URL || "http://localhost:8000";

interface PredictResult {
  isJunk: boolean;
  tags: string[];
  clusterId: number | null;
  clusterName: string | null;
  confidence: number;
  keywords: string[];
}

export async function predictTags(text: string): Promise<PredictResult | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[ML] 请求失败: ${res.status}`);
      return null;
    }

    const data = await res.json();

    return {
      isJunk: data.is_junk,
      tags: data.tags || [],
      clusterId: data.cluster_id ?? null,
      clusterName: data.cluster_name ?? null,
      confidence: data.confidence || 0,
      keywords: data.keywords || [],
    };
  } catch (error) {
    console.warn("[ML] 服务不可用，跳过标签预测:", error);
    return null;
  }
}