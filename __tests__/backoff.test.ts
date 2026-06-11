import { backoffDelaySeconds, nextBackoffState } from "../lib/backoff";

describe("backoffDelaySeconds", () => {
  it("returns the base delay at zero failures", () => {
    expect(backoffDelaySeconds(0)).toBe(60);
  });

  it("doubles each consecutive failure", () => {
    expect(backoffDelaySeconds(1)).toBe(120);
    expect(backoffDelaySeconds(2)).toBe(240);
    expect(backoffDelaySeconds(3)).toBe(480);
    expect(backoffDelaySeconds(4)).toBe(960);
    expect(backoffDelaySeconds(5)).toBe(1920);
  });

  it("clamps to the 3600s cap once doubling would exceed it", () => {
    expect(backoffDelaySeconds(6)).toBe(3600); // 60*2^6 = 3840 → capped
    expect(backoffDelaySeconds(7)).toBe(3600);
    expect(backoffDelaySeconds(100)).toBe(3600); // no overflow at huge counts
  });

  it("honours custom base and cap", () => {
    expect(backoffDelaySeconds(0, { baseSeconds: 30 })).toBe(30);
    expect(backoffDelaySeconds(3, { baseSeconds: 30, capSeconds: 200 })).toBe(200); // 30*8=240 → cap 200
    expect(backoffDelaySeconds(2, { baseSeconds: 10, capSeconds: 10000 })).toBe(40);
  });

  it("floors fractional / negative failure counts to zero-or-more", () => {
    expect(backoffDelaySeconds(-5)).toBe(60);
    expect(backoffDelaySeconds(1.9)).toBe(120); // floor(1.9)=1
    // @ts-expect-error guard against NaN/undefined at runtime
    expect(backoffDelaySeconds(undefined)).toBe(60);
  });
});

describe("nextBackoffState", () => {
  it("resets to 0 on success regardless of prior count", () => {
    expect(nextBackoffState(0, "success")).toBe(0);
    expect(nextBackoffState(7, "success")).toBe(0);
  });

  it("increments on failure", () => {
    expect(nextBackoffState(0, "failure")).toBe(1);
    expect(nextBackoffState(3, "failure")).toBe(4);
  });

  it("keeps the counter non-negative and integral", () => {
    expect(nextBackoffState(-2, "failure")).toBe(1);
    expect(nextBackoffState(2.8, "failure")).toBe(3);
  });
});
