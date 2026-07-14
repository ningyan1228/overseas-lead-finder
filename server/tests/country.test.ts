import { describe, expect, it } from "vitest";
import { countriesMatch, knownCountryIn } from "../src/utils/country.js";

describe("country verification", () => {
  it("matches country aliases", () => {
    expect(countriesMatch("Germany", "DE")).toBe(true);
    expect(countriesMatch("Turkey", "T\u00fcrkiye")).toBe(true);
    expect(countriesMatch("德国", "Germany")).toBe(true);
    expect(countriesMatch("美国", "United States of America")).toBe(true);
  });

  it("detects a conflicting country in an official address", () => {
    expect(knownCountryIn("Changzhou, Jiangsu, China")).toBe("china");
  });
});
