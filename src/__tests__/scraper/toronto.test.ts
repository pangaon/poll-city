import { parseCsvLine, mapColumns, extractWardNumber } from "../../../scripts/scraper/toronto";

describe("parseCsvLine", () => {
  it("splits a simple line", () => {
    expect(parseCsvLine("Alice,Mayor,Ward 1")).toEqual(["Alice", "Mayor", "Ward 1"]);
  });

  it("handles quoted fields with commas", () => {
    expect(parseCsvLine('"Smith, John",Councillor,Ward 2')).toEqual([
      "Smith, John",
      "Councillor",
      "Ward 2",
    ]);
  });

  it("handles escaped double-quotes inside quoted fields", () => {
    expect(parseCsvLine('"O""Brien",Mayor,')).toEqual(["O\"Brien", "Mayor", ""]);
  });

  it("trims whitespace from fields", () => {
    expect(parseCsvLine(" Alice , Mayor , Ward 1 ")).toEqual(["Alice", "Mayor", "Ward 1"]);
  });

  it("handles empty fields", () => {
    expect(parseCsvLine("Alice,,Ward 1")).toEqual(["Alice", "", "Ward 1"]);
  });

  it("handles a single field", () => {
    expect(parseCsvLine("Alice")).toEqual(["Alice"]);
  });

  it("handles quoted empty field", () => {
    expect(parseCsvLine('"",Mayor,')).toEqual(["", "Mayor", ""]);
  });
});

describe("mapColumns", () => {
  it("normalizes headers to snake_case", () => {
    const map = mapColumns(["Candidate Name", "Office", "Ward"]);
    expect(map["candidate_name"]).toBe(0);
    expect(map["office"]).toBe(1);
    expect(map["ward"]).toBe(2);
  });

  it("handles special characters", () => {
    const map = mapColumns(["Contest/Office Name", "Ward #"]);
    expect(map["contest_office_name"]).toBe(0);
    expect(map["ward"]).toBe(1);
  });

  it("handles already-normalized headers", () => {
    const map = mapColumns(["candidate_name", "office"]);
    expect(map["candidate_name"]).toBe(0);
    expect(map["office"]).toBe(1);
  });
});

describe("extractWardNumber", () => {
  it("extracts number from 'Ward 5'", () => {
    expect(extractWardNumber("Ward 5")).toBe(5);
  });

  it("extracts number from 'ward 12' (lowercase)", () => {
    expect(extractWardNumber("ward 12")).toBe(12);
  });

  it("extracts number from 'WARD 3' (uppercase)", () => {
    expect(extractWardNumber("WARD 3")).toBe(3);
  });

  it("extracts bare number string", () => {
    expect(extractWardNumber("7")).toBe(7);
  });

  it("returns null for null", () => {
    expect(extractWardNumber(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(extractWardNumber(undefined)).toBeNull();
  });

  it("returns null for non-matching string", () => {
    expect(extractWardNumber("At Large")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractWardNumber("")).toBeNull();
  });
});

describe("CSV row integration", () => {
  it("parses a realistic candidate row end-to-end", () => {
    const header = "Candidate Name,Office,Ward";
    const row = '"Smith, Jane",City Councillor,Ward 3';
    const headers = parseCsvLine(header);
    const cols = mapColumns(headers);
    const fields = parseCsvLine(row);

    expect(fields[cols["candidate_name"]]).toBe("Smith, Jane");
    expect(fields[cols["office"]]).toBe("City Councillor");
    expect(extractWardNumber(fields[cols["ward"]])).toBe(3);
  });
});
