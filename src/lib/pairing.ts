import "server-only";
import { execFile } from "node:child_process";
import { chmod, copyFile, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { GameLite, PlayerLite } from "./chess-types";
import { buildTrf, parsePairingOutput, type PreBye } from "./trf";

const run = promisify(execFile);
const BUNDLED = path.join(process.cwd(), "bin", "bbpPairings");

/** On serverless hosts the bundled file may not keep its exec bit; copy it to /tmp once. */
async function engineBinary(): Promise<string> {
  const target = path.join(tmpdir(), "bbpPairings");
  try {
    await stat(target);
    return target;
  } catch {
    await copyFile(BUNDLED, target);
    await chmod(target, 0o755);
    return target;
  }
}

export type NewPairing = { board: number; kind: "game" | "pab" | "half_bye" | "zero_bye"; whiteId: string; blackId: string | null };

/** Pairs `nextRound` with the FIDE Dutch system. Throws with the engine's message if no pairing exists. */
export async function pairDutch(opts: {
  name: string;
  totalRounds: number;
  nextRound: number;
  players: PlayerLite[];
  games: GameLite[];
  preByes: PreBye[];
}): Promise<NewPairing[]> {
  const trf = buildTrf(opts);
  const dir = await mkdtemp(path.join(tmpdir(), "pair-"));
  try {
    const input = path.join(dir, "in.trf");
    const output = path.join(dir, "out.txt");
    await writeFile(input, trf);
    try {
      await run(await engineBinary(), ["--dutch", input, "-p", output], { timeout: 20_000 });
    } catch (e) {
      const err = e as { stderr?: string; code?: number };
      throw new PairingError(err.stderr?.trim() || `Pairing engine failed (code ${err.code})`);
    }
    const pairs = parsePairingOutput(await readFile(output, "utf8"));
    const byRank = new Map(opts.players.map((p) => [p.startRank!, p.id]));
    const result: NewPairing[] = [];
    let board = 0;
    for (const p of pairs) {
      if (p.black === null) continue;
      result.push({ board: ++board, kind: "game", whiteId: byRank.get(p.white)!, blackId: byRank.get(p.black)! });
    }
    for (const p of pairs.filter((x) => x.black === null)) {
      result.push({ board: ++board, kind: "pab", whiteId: byRank.get(p.white)!, blackId: null });
    }
    for (const b of opts.preByes) {
      result.push({ board: ++board, kind: b.kind, whiteId: b.playerId, blackId: null });
    }
    return result;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export class PairingError extends Error {}
