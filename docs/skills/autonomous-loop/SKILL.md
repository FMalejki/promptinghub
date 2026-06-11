---
name: autonomous-loop
description: Run a long, unattended build/QA session as a self-re-arming /loop — one bounded PR per iteration, exponential backoff when usage runs out, a clock-bounded stop, and a single end-of-run summary. Use for overnight or multi-hour "set it and forget it" work where the human is away and silence is failure.
---

# Skill: Anti-interruption Autonomous Loop

You are running an **unattended** stretch of work (hours, often overnight). The human
is asleep or away. The single worst failure mode is **going quiet** — one giant turn
that stalls, an unhandled rate-limit that ends the session, or an idle stop with work
left on the table. This skill encodes the pattern that survives all three.

## Core invariants (never violate)

1. **Never one giant turn.** Each iteration does *one bounded unit* of work and then
   **re-arms the next iteration** with `ScheduleWakeup`. A turn that tries to "do it all"
   will hit a wall and die silently. Small turns that re-arm cannot.
2. **Always re-arm before the turn ends.** The last action of every iteration is a
   `ScheduleWakeup` call carrying the *same loop prompt verbatim* (prefixed `/loop `).
   Omitting it is how the loop dies — only omit it on a deliberate, announced stop.
3. **One bounded PR per iteration.** Branch → change → gate → merge → deploy → verify →
   mark done → re-arm. Never batch five features into one turn.
4. **A source-of-truth file, not memory.** Keep a checklist/state file (backlog, what's
   done, the backoff counter). Read it at the start of every iteration; update it at the
   end. The loop must be resumable by a cold start that only has this file.
5. **Clock-bounded stop.** Decide the stop time up front (e.g. 08:00). Each wake, check
   the clock: past it → do the final review and **stop with a summary**; otherwise keep going.

## The iteration (run this every wake)

```
1. Read the state file: backlog, DONE list, BACKOFF_STATE, stop-time.
2. Past stop-time? → run the final review, send the summary, STOP (no re-arm).
3. Pick the NEXT single item.
4. Do it as ONE bounded PR:
     branch → implement (TDD any pure logic) → GATE → commit → push
     → open PR → merge → deploy → VERIFY LIVE.
5. Success?  mark item done, BACKOFF_STATE = 0.
   Failure/usage-limit?  BACKOFF_STATE = increment (see backoff.js).
6. Re-arm: ScheduleWakeup(delaySeconds = backoffDelaySeconds(BACKOFF_STATE),
            prompt = the same /loop prompt verbatim).
```

## Exponential backoff (when usage/rate-limit hits)

Don't give up and don't hammer. Track a single integer `BACKOFF_STATE` in the state file:

- On a successful iteration → reset it to `0` (next wake is the base cadence, e.g. 60s).
- On a usage-limit / blocking error → increment it, and wait
  `min(cap, base * 2^BACKOFF_STATE)` seconds before the next wake. With base=60, cap=3600
  that's 60s → 120 → 240 → … → 3600 (1h) ceiling. Limits typically reset within a few
  hours; the backoff rides over the outage and resumes automatically.

See `backoff.js` for the exact, testable formula. **Never abandon the run before the
stop-time** just because usage ran out — back off and let it recover.

## Communication policy (respect the sleeping human)

- **Do not ping per routine PR.** A buzz every 60 seconds at 3 a.m. is its own failure.
- **Ping only for milestones:** a security issue, a major feature landing, a hard blocker
  you can't route around, and the **final end-of-run summary**.
- The end-of-run summary is mandatory: one message listing what shipped, what's deployed,
  and anything that needs a human in the morning.

## Verify, don't assume

Every PR is verified *live* after deploy — hit the real URL / run the real app, don't
trust a green build alone. A feature that built but 500s in production is a silent failure
the human discovers instead of you. If you can't verify (auth wall, no browser), say so
explicitly in the state file and the summary rather than claiming success.

## Anti-patterns (these are what "interruption" actually looks like)

- One mega-turn that does the whole backlog → stalls, dies, hours of silence.
- Catching a rate-limit and stopping → human wakes to a dead session.
- Re-arming but forgetting to pass the prompt verbatim → loop drifts or ends.
- Pinging every iteration → human wakes exhausted, disables the loop.
- "Build passed, done!" with no live check → ships a broken deploy.
- Holding state in your head instead of a file → a compaction wipes the plan.
