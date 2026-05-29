import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** ~0.1s silent MPEG audio – keeps iOS AVAudioSession active when looped. */
const SILENT_MP3_BASE64 =
  "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGluaWZvY28gVjAuMC4xAAAA//uQxAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAABIABISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhIUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQf/xAA=";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "silent.mp3");
writeFileSync(out, Buffer.from(SILENT_MP3_BASE64, "base64"));
console.log("Wrote", out);
