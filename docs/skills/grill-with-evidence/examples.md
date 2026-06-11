# Worked transcript

A short interview showing the rhythm: one fork, one recommendation, one piece of
evidence, one counter-argument — then accept the user's one-word answer and move on.

---

**Q (1/3):** The app reads config from both environment variables and a JSON file,
and they sometimes disagree. Pick one source of truth — env vars, or the file?

**Recommended:** Env vars.

**Evidence:** `src/config/load.ts:31` reads the file first, then `:44` overwrites
with values from the process environment — so env already wins in practice for
every overlapping key. The
file is only authoritative for keys env never sets. Making env the single source
matches the code's actual precedence and removes a class of "why didn't my override
apply?" bugs. The 12-factor guidance also favors env config for deploy-time values
(<https://12factor.net/config>).

**Counter:** if non-developers edit config, a checked-in file is friendlier than
asking them to set env vars — keep the file primary for those keys.

**Your call: env or file?**

> **User:** env

**Q (2/3):** Should the loader *fail loudly* on an unknown config key, or ignore it?

**Recommended:** Fail loudly in development, ignore in production.

**Evidence:** `logs/staging-2024-09.txt` line 88 shows a typo'd key (`TIMOUT`) silently
ignored for three days before anyone noticed the timeout never changed. A dev-time
throw would have caught it on first run; a prod-time throw risks taking the service
down over a harmless stray key.

**Counter:** if your deploy pipeline already validates config before release, a hard
prod failure is safe and even cleaner — no split behavior to reason about.

**Your call: split behavior, or always-throw?**

> **User:** split

**Q (3/3):** … (continue until the tree bottoms out or the user says "go")
