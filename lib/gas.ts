export type GasResponse<T = unknown> = { ok: boolean; data?: T; error?: string };

// Satu endpoint Apps Script terpadu, digunakan oleh kegiatan dan layanan Admisi.
const GAS_TIMEOUT_MS = 45000;
const MAX_REDIRECTS = 5;

function isRedirect(status: number): boolean {
  return [301, 302, 303, 307, 308].includes(status);
}

/**
 * Apps Script ContentService mengembalikan respons melalui URL sementara
 * di script.googleusercontent.com. Redirect harus dibuka menggunakan GET;
 * mengirim POST lagi ke URL sementara dapat menimbulkan HTTP 405.
 *
 * Jangan lakukan POST ulang otomatis pada kegagalan: operasi pengajuan,
 * presensi, dan pembuatan surat berpotensi sudah tersimpan di Spreadsheet.
 */
async function postToGoogleAppsScript(
  endpoint: string,
  body: Record<string, unknown>,
  signal: AbortSignal
): Promise<Response> {
  let response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
    redirect: "manual",
    signal,
  });

  let currentUrl = endpoint;
  let visited = new Set<string>([endpoint]);

  for (let hop = 0; isRedirect(response.status); hop += 1) {
    if (hop >= MAX_REDIRECTS) {
      throw new Error("Apps Script mengembalikan terlalu banyak pengalihan URL. Periksa deployment Web App.");
    }

    const location = response.headers.get("location");
    if (!location) {
      throw new Error("Pengalihan Apps Script tidak memiliki URL tujuan. Periksa akses deployment.");
    }

    const next = new URL(location, currentUrl);
    if (next.protocol !== "https:") {
      throw new Error("Apps Script mengembalikan pengalihan yang tidak aman.");
    }

    // Jangan ikuti pengalihan ke host yang tidak dikenal. Token dan identitas
    // dokumen di URL tidak boleh diteruskan ke situs lain.
    if (!["script.googleusercontent.com", "script.google.com"].includes(next.hostname)) {
      if (next.hostname === "accounts.google.com") {
        throw new Error("Apps Script meminta login Google. Deploy Web App dengan akses 'Anyone' dan Execute as 'Me'.");
      }
      throw new Error(`Apps Script mengalihkan ke host tak dikenal (${next.hostname}). Periksa URL dan akses deployment.`);
    }

    if (visited.has(next.href)) {
      throw new Error("Apps Script mengalami redirect loop. Periksa URL /exec dan status deployment.");
    }
    visited.add(next.href);
    currentUrl = next.href;

    // ContentService memberi 302 menuju URL sekali pakai; baca dengan GET.
    // Jangan kirim ulang body POST agar tidak menggandakan transaksi.
    response = await fetch(next.href, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      redirect: "manual",
      signal,
    });
  }

  return response;
}

export async function callGas<T>(
  action: string,
  payload: Record<string, unknown> = {},
  admin = false
): Promise<T> {
  const endpoint = (process.env.GAS_ENDPOINT || "").trim();
  if (!endpoint) throw new Error("GAS_ENDPOINT belum dikonfigurasi di Netlify.");

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error("GAS_ENDPOINT bukan URL yang valid. Gunakan alamat deployment Apps Script berakhiran /exec.");
  }
  if (url.protocol !== "https:" || url.hostname !== "script.google.com" || !/^\/macros\/s\/[^/]+\/exec\/?$/.test(url.pathname)) {
    throw new Error("GAS_ENDPOINT harus menggunakan URL Web App https://script.google.com/macros/s/.../exec.");
  }

  const body = {
    action,
    ...payload,
    ...(admin ? { secret: (process.env.GAS_SECRET || "").trim() } : {}),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GAS_TIMEOUT_MS);

  try {
    const res = await postToGoogleAppsScript(endpoint, body, controller.signal);
    const raw = await res.text();

    if (!res.ok) {
      const suffix = res.status === 405
        ? "Periksa akses Web App (Execute as Me, Anyone) dan pastikan GAS_ENDPOINT menunjuk ke URL /exec terbaru."
        : "Periksa status deployment dan log Executions di Apps Script.";
      throw new Error(`Apps Script merespons HTTP ${res.status}. ${suffix}`);
    }

    let json: GasResponse<T>;
    try {
      json = JSON.parse(raw) as GasResponse<T>;
    } catch {
      const preview = raw.replace(/\s+/g, " ").slice(0, 180);
      throw new Error(
        `Respons Apps Script bukan JSON. Pastikan URL Web App /exec dapat diakses publik. Respons: ${preview || "(kosong)"}`
      );
    }

    if (!json.ok) throw new Error(json.error || "Terjadi kesalahan pada Apps Script.");
    return json.data as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Apps Script tidak merespons dalam 45 detik. Periksa Executions Apps Script, kuota, dan akses Web App.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
