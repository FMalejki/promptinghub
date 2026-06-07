// Minimal LCS-based line diff. Pure + dependency-free so it runs in tests and
// in the client. Produces an ordered list of segments; replacements come out as
// a deletion followed by an addition.

export type DiffSegment = { type: "ctx" | "add" | "del"; text: string };

export function diffLines(oldText: string, newText: string): DiffSegment[] {
  if (oldText === "" && newText === "") return [{ type: "ctx", text: "" }];
  const o = oldText === "" ? [] : oldText.split("\n");
  const n = newText === "" ? [] : newText.split("\n");
  const m = o.length;
  const k = n.length;

  // dp[i][j] = length of the LCS of o[i:] and n[j:]
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(k + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = k - 1; j >= 0; j--) {
      dp[i][j] = o[i] === n[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out: DiffSegment[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < k) {
    if (o[i] === n[j]) {
      out.push({ type: "ctx", text: o[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: "del", text: o[i] });
      i++;
    } else {
      out.push({ type: "add", text: n[j] });
      j++;
    }
  }
  while (i < m) out.push({ type: "del", text: o[i++] });
  while (j < k) out.push({ type: "add", text: n[j++] });
  return out;
}

export function diffStats(oldText: string, newText: string): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const s of diffLines(oldText, newText)) {
    if (s.type === "add") added++;
    else if (s.type === "del") removed++;
  }
  return { added, removed };
}
