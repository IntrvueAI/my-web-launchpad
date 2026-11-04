import { describe, expect, it } from "vitest";
import { connectionLevel, gradeSample, levelDb, looksLikeEcho, looksLikeMishearing, nextTip, TIPS } from "@/lib/callQuality";

const sample = (over: Partial<Parameters<typeof gradeSample>[0]> = {}) => ({ rttMs: 60, lossPercent: 0, fps: 25, froze: false, online: true, ...over });

describe("Connection quality", () => {
  it("grades round trip, packet loss, frame rate and freezes", () => {
    expect(gradeSample(sample())).toBe("strong");
    expect(gradeSample(sample({ rttMs: 250 }))).toBe("ok");
    expect(gradeSample(sample({ lossPercent: 2 }))).toBe("ok");
    expect(gradeSample(sample({ rttMs: 650 }))).toBe("weak");
    expect(gradeSample(sample({ lossPercent: 8 }))).toBe("weak");
    expect(gradeSample(sample({ fps: 6 }))).toBe("weak");
    expect(gradeSample(sample({ froze: true }))).toBe("weak");
    expect(gradeSample(sample({ online: false }))).toBe("offline");
    expect(gradeSample(sample({ rttMs: null, lossPercent: null, fps: null }))).toBe("unknown");
  });
  it("doesn't flash a warning for one slow moment, but shows a sustained problem and going offline at once", () => {
    expect(connectionLevel(["strong", "weak"])).toBe("strong");
    expect(connectionLevel(["weak", "weak"])).toBe("weak");
    expect(connectionLevel(["strong", "offline"])).toBe("offline");
    expect(connectionLevel(["unknown", "ok"])).toBe("ok");
    expect(connectionLevel([])).toBe("unknown");
  });
});

describe("Microphone and transcript checks", () => {
  it("measures level in dBFS and peaks", () => {
    expect(levelDb(new Float32Array(100)).rmsDb).toBe(-100);
    const loud = new Float32Array(100).fill(0.5);
    expect(Math.round(levelDb(loud).rmsDb)).toBe(-6);
    expect(levelDb(Float32Array.from([0.1, -0.99, 0.2])).peak).toBeCloseTo(0.99);
  });
  it("spots Clara's own words coming back through the student's microphone", () => {
    const clara = "Tell me about a time you worked in a team and it didn't go well.";
    expect(looksLikeEcho("tell me about a time you worked in a team", clara)).toBe(true);
    expect(looksLikeEcho("I worked in a team at a charity shop and we disagreed about rotas", clara)).toBe(false);
    expect(looksLikeEcho("yes", clara)).toBe(false);
  });
  it("spots answers repeatedly coming through as a word or two", () => {
    expect(looksLikeMishearing(["I think the", "um", "yes", "no"])).toBe(true);
    expect(looksLikeMishearing(["Well I would first make sure the patient is safe", "um", "yes"])).toBe(false);
    expect(looksLikeMishearing(["yes", "no"])).toBe(false);
  });
});

describe("Tips", () => {
  it("shows one at a time, each once per interview, most urgent first, with a gap between", () => {
    const shown = new Set<keyof typeof TIPS>();
    expect(nextTip(["quiet", "no_audio"], shown, null, 0)).toBe("no_audio");
    shown.add("no_audio");
    expect(nextTip(["no_audio", "quiet"], shown, 0, 10_000)).toBeNull();
    expect(nextTip(["no_audio", "quiet"], shown, 0, 60_000)).toBe("quiet");
    expect(nextTip(["no_audio"], shown, 0, 60_000)).toBeNull();
  });
  it("never blames the student for the service and offers typing for microphone trouble", () => {
    for (const tip of Object.values(TIPS)) expect(tip.text.length).toBeGreaterThan(20);
    expect(TIPS.no_audio.action).toBe("type");
    expect(TIPS.mishearing.action).toBe("type");
    expect(TIPS.weak_connection.text).toMatch(/Wi-Fi/);
  });
});
