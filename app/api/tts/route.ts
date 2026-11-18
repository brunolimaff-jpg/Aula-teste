import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs";
import path from "path";

interface CharacterVoiceProfile {
  voiceName: "Puck" | "Charon" | "Kore" | "Fenrir" | "Zephyr";
  style: string;
}

const CHARACTER_VOICES: Record<string, CharacterVoiceProfile> = {
  "Dr. Augusto": {
    voiceName: "Charon",
    style:
      "Diretor-presidente veterano de usina sucroenergética no interior de São Paulo, Brasil. Voz grave, pausada, firme e autoritária, português brasileiro natural.",
  },
  Valdemar: {
    voiceName: "Fenrir",
    style:
      "Gerente de operações e segurança de usina com 28 anos de chão de fábrica no Brasil. Voz ríspida, direta, séria e disciplinadora.",
  },
  Helena: {
    voiceName: "Kore",
    style:
      "Gerente agrícola experiente de usina no Brasil às 5h30 da manhã. Voz firme, inteligente, prática e sob pressão para fechar o plano da safra.",
  },
  Caio: {
    voiceName: "Puck",
    style:
      "Jovem engenheiro agrônomo de campo no interior do Brasil. Voz preocupada, técnica, ágil e franca olhando o canavial.",
  },
  Marta: {
    voiceName: "Zephyr",
    style:
      "Encarregada de frente de colheita de cana com onze safras de experiência no Brasil. Voz forte, enérgica, direta e sem rodeios.",
  },
  "Seu Tião": {
    voiceName: "Charon",
    style:
      "Líder de manutenção e mecânico-chefe veterano do interior paulista. Voz grave, calma, bem-humorada e calejada de oficina.",
  },
  Rui: {
    voiceName: "Puck",
    style:
      "Analista de balança de usina com fila de caminhões na portaria. Voz rápida, atenta e um pouco tensa procurando contratos.",
  },
  Sílvia: {
    voiceName: "Kore",
    style:
      "Gerente industrial de usina de açúcar e etanol no Brasil. Voz firme, analítica e projetada acima do ruído da moenda.",
  },
  Jonas: {
    voiceName: "Fenrir",
    style:
      "Coordenador de expedição e pátio de armazém no Brasil. Voz pragmática, bem-humorada e despachada.",
  },
  Paula: {
    voiceName: "Zephyr",
    style:
      "Controller financeira de agroindústria no Brasil. Voz precisa, executiva, tensa com o fechamento de custos do mês.",
  },
  Rodrigo: {
    voiceName: "Puck",
    style:
      "Analista de integração de TI sobrecarregado atendendo dois telefones. Voz rápida, irônica e sincera.",
  },
  André: {
    voiceName: "Fenrir",
    style:
      "Trader de açúcar e etanol no terminal portuário. Voz dinâmica, confiante, rápida e focada em risco e mercado.",
  },
  Você: {
    voiceName: "Puck",
    style:
      "Executivo consultivo sênior de contas agro no Brasil. Voz clara, empática, segura e investigativa.",
  },
};

const audioCache = new Map<string, { audioBase64: string; voiceName: string; audioUrl?: string }>();
const MAX_CACHE = 160;

const VOICES_DIR = path.join(process.cwd(), "public", "assets", "voices");
const MANIFEST_PATH = path.join(VOICES_DIR, "manifest.json");

function ensureVoicesDir() {
  try {
    if (!fs.existsSync(VOICES_DIR)) {
      fs.mkdirSync(VOICES_DIR, { recursive: true });
    }
  } catch {}
}

function normalizeSpeaker(speaker: string): string {
  return String(speaker || "Narrador").split(",")[0].trim();
}

function normalizeText(text: string): string {
  return String(text || "")
    .replace(/^[“"'\s]+|[”"'\s]+$/g, "")
    .trim()
    .slice(0, 650);
}

function computeVoiceHash(speaker: string, text: string): string {
  const normSpeaker = normalizeSpeaker(speaker);
  const normText = normalizeText(text);
  return crypto
    .createHash("sha1")
    .update(`${normSpeaker}::${normText}`)
    .digest("hex")
    .slice(0, 16);
}

function readManifest(): Record<string, { file: string; speaker: string; voiceName: string; durationMs?: number }> {
  try {
    if (fs.existsSync(MANIFEST_PATH)) {
      return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
    }
  } catch {}
  return {};
}

function updateManifest(key: string, entry: { file: string; speaker: string; voiceName: string; durationMs?: number }) {
  try {
    ensureVoicesDir();
    const manifest = readManifest();
    manifest[key] = entry;
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
  } catch {}
}

function estimateWavDurationMs(buf: Buffer): number {
  if (buf.length > 44 && buf.toString("ascii", 0, 4) === "RIFF") {
    const byteRate = buf.readUInt32LE(28);
    if (byteRate > 0) {
      return Math.round(((buf.length - 44) / byteRate) * 1000);
    }
  }
  return Math.max(600, Math.round(((buf.length - 44) / 48000) * 1000));
}

function resolveProfile(speaker: string): CharacterVoiceProfile {
  const clean = normalizeSpeaker(speaker);
  for (const [key, profile] of Object.entries(CHARACTER_VOICES)) {
    if (clean.toLowerCase().includes(key.toLowerCase())) {
      return profile;
    }
  }
  return {
    voiceName: "Kore",
    style:
      "Profissional de agroindústria brasileira falando português do Brasil com naturalidade e emoção cinematográfica.",
  };
}

async function synthesizeAndPersist(speaker: string, rawText: string) {
  const text = normalizeText(rawText);
  const cleanSpeaker = normalizeSpeaker(speaker);
  const profile = resolveProfile(cleanSpeaker);
  const hash = computeVoiceHash(cleanSpeaker, text);
  const manifestKey = `${cleanSpeaker}::${text.slice(0, 260)}`;
  const wavFilename = `${hash}.wav`;
  const wavFilePath = path.join(VOICES_DIR, wavFilename);
  const audioUrl = `/assets/voices/${wavFilename}`;

  const memCached = audioCache.get(hash);
  if (memCached) {
    return {
      ok: true,
      audioBase64: memCached.audioBase64,
      audioUrl: memCached.audioUrl || audioUrl,
      voiceName: memCached.voiceName,
      cached: true,
      hash,
    };
  }

  // 1. Verifica se o arquivo WAV já está pré-salvo em disco (public/assets/voices/)
  try {
    if (fs.existsSync(wavFilePath)) {
      const buf = fs.readFileSync(wavFilePath);
      if (buf.length > 100) {
        const b64 = buf.toString("base64");
        const durationMs = estimateWavDurationMs(buf);
        audioCache.set(hash, { audioBase64: b64, voiceName: profile.voiceName, audioUrl });
        return {
          ok: true,
          audioBase64: b64,
          audioUrl,
          voiceName: profile.voiceName,
          durationMs,
          cached: true,
          preSaved: true,
          hash,
        };
      }
    }
  } catch {}

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      fallback: true,
      reason: "missing_api_key",
      reasonCode: "missing_api_key",
      voiceName: profile.voiceName,
    };
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  let base64Audio: string | undefined;
  let lastErr: unknown = null;
  const ttsModels = [
    { id: "gemini-3.8-flash-lite-tts", useSpeechMeta: true },
    { id: "gemini-2.5-flash-preview-tts", useSpeechMeta: false },
    { id: "gemini-2.5-pro-preview-tts", useSpeechMeta: false },
  ];

  for (const m of ttsModels) {
    try {
      const response = await ai.models.generateContent({
        model: m.id,
        contents: [
          {
            role: "user",
            parts: [
              m.useSpeechMeta
                ? ({
                    text,
                    speechMetadata: { style: profile.style },
                  } as Record<string, unknown>)
                : { text: `${profile.style}: "${text}"` },
            ],
          },
        ],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: profile.voiceName,
              },
            },
          },
        },
      });
      base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) break;
    } catch (e) {
      lastErr = e;
    }
  }

  if (!base64Audio) {
    if (lastErr) throw lastErr;
    return {
      ok: false,
      fallback: true,
      reason: "empty_audio",
      reasonCode: "empty_audio",
      voiceName: profile.voiceName,
    };
  }

  // Salva permanentemente em public/assets/voices/<hash>.wav e atualiza o manifest.json
  let durationMs = 1800;
  try {
    ensureVoicesDir();
    const buf = Buffer.from(base64Audio, "base64");
    durationMs = estimateWavDurationMs(buf);
    fs.writeFileSync(wavFilePath, buf);
    updateManifest(manifestKey, {
      file: audioUrl,
      speaker: cleanSpeaker,
      voiceName: profile.voiceName,
      durationMs,
    });
  } catch {}

  if (audioCache.size >= MAX_CACHE) {
    const firstKey = audioCache.keys().next().value;
    if (firstKey) audioCache.delete(firstKey);
  }
  audioCache.set(hash, {
    audioBase64: base64Audio,
    voiceName: profile.voiceName,
    audioUrl,
  });

  return {
    ok: true,
    audioBase64: base64Audio,
    audioUrl,
    voiceName: profile.voiceName,
    durationMs,
    cached: false,
    preSaved: true,
    hash,
  };
}

export async function GET() {
  ensureVoicesDir();
  const manifest = readManifest();
  return NextResponse.json({
    count: Object.keys(manifest).length,
    voices: manifest,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Suporte a pré-salvamento em lote das falas base (batch prewarm)
    if (Array.isArray(body?.items)) {
      const results = [];
      for (const item of body.items.slice(0, 25)) {
        const sp = String(item?.speaker || "Narrador");
        const tx = String(item?.text || "");
        if (!tx.trim()) continue;
        try {
          const r = await synthesizeAndPersist(sp, tx);
          results.push({ speaker: sp, hash: r.hash, ok: r.ok, audioUrl: r.audioUrl, cached: r.cached, reasonCode: r.reasonCode });
        } catch (e: unknown) {
          results.push({ speaker: sp, ok: false, error: e instanceof Error ? e.message : String(e) });
        }
      }
      return NextResponse.json({ batch: true, results, manifest: readManifest() });
    }

    const text = normalizeText(body?.text || "");
    const speaker = normalizeSpeaker(body?.speaker || "Narrador");

    if (!text) {
      return NextResponse.json({ error: "Texto vazio" }, { status: 400 });
    }

    const res = await synthesizeAndPersist(speaker, text);
    if (!res.ok) {
      return NextResponse.json({
        fallback: true,
        reason: res.reason,
        reasonCode: res.reasonCode,
        voiceName: res.voiceName,
      });
    }

    return NextResponse.json({
      audioBase64: res.audioBase64,
      audioUrl: res.audioUrl,
      mimeType: "audio/wav",
      voiceName: res.voiceName,
      durationMs: res.durationMs,
      cached: res.cached,
      preSaved: res.preSaved,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const reasonCode = /API_KEY_INVALID/i.test(message)
      ? "API_KEY_INVALID"
      : /PERMISSION_DENIED/i.test(message)
        ? "PERMISSION_DENIED"
        : /RESOURCE_EXHAUSTED/i.test(message)
          ? "RESOURCE_EXHAUSTED"
          : "tts_error";
    return NextResponse.json({
      fallback: true,
      reason: message.slice(0, 200),
      reasonCode,
    });
  }
}

