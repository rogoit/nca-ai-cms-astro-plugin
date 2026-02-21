import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getEnvVariable } from "./envUtils.js";

describe("getEnvVariable", () => {
  const TEST_VAR = "TEST_ENV_VARIABLE_FOR_UTILS";

  afterEach(() => {
    delete process.env[TEST_VAR];
  });

  it("returns the value when the environment variable is set", () => {
    process.env[TEST_VAR] = "hello";
    expect(getEnvVariable(TEST_VAR)).toBe("hello");
  });

  it("returns the default value when the variable is not set", () => {
    expect(getEnvVariable(TEST_VAR, "fallback")).toBe("fallback");
  });

  it("returns the default value when the variable is an empty string", () => {
    process.env[TEST_VAR] = "";
    expect(getEnvVariable(TEST_VAR, "fallback")).toBe("fallback");
  });

  it("throws when a required variable is missing and no default is provided", () => {
    expect(() => getEnvVariable(TEST_VAR)).toThrow(
      `Required environment variable "${TEST_VAR}" is not set.`,
    );
  });

  it("prefers the actual env value over the default", () => {
    process.env[TEST_VAR] = "actual";
    expect(getEnvVariable(TEST_VAR, "default")).toBe("actual");
  });

  it("returns the default when the variable is undefined in process.env", () => {
    delete process.env[TEST_VAR];
    expect(getEnvVariable(TEST_VAR, "")).toBe("");
  });
});
