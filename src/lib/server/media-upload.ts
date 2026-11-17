import "server-only";

import { ApiProblem } from "@/lib/server/studio";

type AllowedType = { mimeType: string; maxSize: number };

function detectType(bytes: Uint8Array): AllowedType | null {
  if (bytes.length >= 8 && bytes.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index])) return { mimeType: "image/png", maxSize: 15_000_000 };
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return { mimeType: "image/jpeg", maxSize: 15_000_000 };
  const head = new TextDecoder("ascii").decode(bytes.slice(0, 16));
  if (head.startsWith("GIF87a") || head.startsWith("GIF89a")) return { mimeType: "image/gif", maxSize: 15_000_000 };
  if (head.startsWith("RIFF") && head.slice(8, 12) === "WEBP") return { mimeType: "image/webp", maxSize: 15_000_000 };
  if (head.slice(4, 12).startsWith("ftypavif") || head.slice(4, 12).startsWith("ftypavis")) return { mimeType: "image/avif", maxSize: 15_000_000 };
  if (head.slice(4, 8) === "ftyp") return { mimeType: "video/mp4", maxSize: 50_000_000 };
  if ([26, 69, 223, 163].every((value, index) => bytes[index] === value)) return { mimeType: "video/webm", maxSize: 50_000_000 };
  return null;
}

export async function readMediaUpload(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 52_000_000) throw new ApiProblem(413, "Upload too large");
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiProblem(400, "Upload a file in the file field");
  if (file.size > 50_000_000 || file.size === 0) throw new ApiProblem(413, "File must be 50 MB or smaller");
  const data = Buffer.from(await file.arrayBuffer());
  const detected = detectType(data);
  if (!detected || data.length > detected.maxSize) throw new ApiProblem(415, "Unsupported file type or size");
  return { form, file, data, mimeType: detected.mimeType };
}
