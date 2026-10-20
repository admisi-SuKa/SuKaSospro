export type GasResponse<T = unknown> = { ok: boolean; data?: T; error?: string };

// Google Apps Script Web App kadang membutuhkan waktu cukup lama pada request
// pertama setelah idle (cold start). 15 detik terlalu agresif untuk kondisi ini.
const GAS_TIMEOUT_MS = 45000;

export async function callGas<T>(
  action: string,
  payload: Record<string, unknown> = {},
  admin = false
): Promise<T> {
  const endpoint = (process.env.GAS_ENDPOINT || "").trim();
  if (!endpoint) throw new Error("GAS_ENDPOINT belum dikonfigurasi.");

  const body = {
    action,
    ...payload,
    ...(admin ? { secret: (process.env.GAS_SECRET || "").trim() } : {}),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GAS_TIMEOUT_MS);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
    });

    const raw = await res.text();

    if (!res.ok) {
      throw new Error(`Apps Script merespons HTTP ${res.status}.`);
    }

    let json: GasResponse<T>;
    try {
      json = JSON.parse(raw) as GasResponse<T>;
    } catch {
      const preview = raw.replace(/\s+/g, " ").slice(0, 180);
      throw new Error(
        `Respons Apps Script bukan JSON. Pastikan GAS_ENDPOINT memakai URL Web App /exec. Respons: ${preview || "(kosong)"}`
      );
    }

    if (!json.ok) {
      throw new Error(json.error || "Terjadi kesalahan pada Apps Script.");
    }

    return json.data as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "Apps Script belum merespons setelah 45 detik. Endpoint dapat diakses, tetapi startup Apps Script terlalu lambat. Coba buka kembali halaman admin beberapa saat kemudian."
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
