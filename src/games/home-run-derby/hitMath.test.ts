import { describe, expect, test } from "vitest";
import {
  advanceRunners,
  classifySwing,
  type Runners,
} from "./hitMath";

describe("classifySwing", () => {
  const ball = { ballX: 100, ballY: 100, ballRadius: 20 };

  test("dead-center click is a home run", () => {
    expect(classifySwing({ clickX: 100, clickY: 100, ...ball })).toEqual({
      kind: "homerun",
    });
  });

  test("click within 15% of radius is a home run", () => {
    // d = 2/20 = 0.10
    expect(classifySwing({ clickX: 102, clickY: 100, ...ball })).toEqual({
      kind: "homerun",
    });
  });

  test("click at 25% of radius is a triple", () => {
    // d = 5/20 = 0.25
    expect(classifySwing({ clickX: 105, clickY: 100, ...ball })).toEqual({
      kind: "triple",
    });
  });

  test("click at 50% of radius is a double", () => {
    // d = 10/20 = 0.5
    expect(classifySwing({ clickX: 110, clickY: 100, ...ball })).toEqual({
      kind: "double",
    });
  });

  test("click at 75% of radius is a single", () => {
    // d = 15/20 = 0.75
    expect(classifySwing({ clickX: 115, clickY: 100, ...ball })).toEqual({
      kind: "single",
      weak: false,
    });
  });

  test("click at 90% of radius is a weak single", () => {
    // d = 18/20 = 0.90
    expect(classifySwing({ clickX: 118, clickY: 100, ...ball })).toEqual({
      kind: "single",
      weak: true,
    });
  });

  test("click outside the ball (d > 1) is a whiff", () => {
    // d = 25/20 = 1.25
    expect(classifySwing({ clickX: 125, clickY: 100, ...ball })).toEqual({
      kind: "whiff",
    });
  });

  test("diagonal click uses Euclidean distance", () => {
    // dx=3, dy=4, d = 5/20 = 0.25 → triple
    expect(classifySwing({ clickX: 103, clickY: 104, ...ball })).toEqual({
      kind: "triple",
    });
  });
});

describe("advanceRunners", () => {
  const empty: Runners = { first: false, second: false, third: false };

  test("home run with bases empty scores 1 run, clears bases", () => {
    const result = advanceRunners({
      runners: empty,
      hit: { kind: "homerun" },
    });
    expect(result.runsScored).toBe(1);
    expect(result.runners).toEqual({
      first: false,
      second: false,
      third: false,
    });
  });

  test("grand slam scores 4 runs, clears bases", () => {
    const result = advanceRunners({
      runners: { first: true, second: true, third: true },
      hit: { kind: "homerun" },
    });
    expect(result.runsScored).toBe(4);
    expect(result.runners).toEqual({
      first: false,
      second: false,
      third: false,
    });
  });

  test("single with bases empty puts batter on 1B", () => {
    const result = advanceRunners({
      runners: empty,
      hit: { kind: "single", weak: false },
    });
    expect(result.runsScored).toBe(0);
    expect(result.runners).toEqual({
      first: true,
      second: false,
      third: false,
    });
  });

  test("single with runner on 2B scores 1 run (runner crosses home)", () => {
    const result = advanceRunners({
      runners: { first: false, second: true, third: false },
      hit: { kind: "single", weak: false },
    });
    expect(result.runsScored).toBe(1);
    expect(result.runners).toEqual({
      first: true,
      second: false,
      third: false,
    });
  });

  test("weak single with runner on 2B does NOT score (held at 3B)", () => {
    const result = advanceRunners({
      runners: { first: false, second: true, third: false },
      hit: { kind: "single", weak: true },
    });
    expect(result.runsScored).toBe(0);
    expect(result.runners).toEqual({
      first: true,
      second: false,
      third: true,
    });
  });

  test("weak single with runner on 3B still scores (only the 2B exception applies)", () => {
    const result = advanceRunners({
      runners: { first: false, second: false, third: true },
      hit: { kind: "single", weak: true },
    });
    expect(result.runsScored).toBe(1);
    expect(result.runners).toEqual({
      first: true,
      second: false,
      third: false,
    });
  });

  test("double with runner on 1B puts them on 3B (no score)", () => {
    const result = advanceRunners({
      runners: { first: true, second: false, third: false },
      hit: { kind: "double" },
    });
    expect(result.runsScored).toBe(0);
    expect(result.runners).toEqual({
      first: false,
      second: true,
      third: true,
    });
  });

  test("double with runners on 1B and 3B scores 1, leaves 2B and 3B", () => {
    const result = advanceRunners({
      runners: { first: true, second: false, third: true },
      hit: { kind: "double" },
    });
    expect(result.runsScored).toBe(1);
    expect(result.runners).toEqual({
      first: false,
      second: true,
      third: true,
    });
  });

  test("triple with bases loaded scores 3 runs, batter on 3B", () => {
    const result = advanceRunners({
      runners: { first: true, second: true, third: true },
      hit: { kind: "triple" },
    });
    expect(result.runsScored).toBe(3);
    expect(result.runners).toEqual({
      first: false,
      second: false,
      third: true,
    });
  });

  test("whiff does not change runners and scores 0", () => {
    const start: Runners = { first: true, second: false, third: true };
    const result = advanceRunners({
      runners: start,
      hit: { kind: "whiff" },
    });
    expect(result.runsScored).toBe(0);
    expect(result.runners).toEqual(start);
  });
});
