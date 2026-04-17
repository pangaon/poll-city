/**
 * RCAE Types — static shape tests
 */

import {
  SEVERITY_RANK,
  URGENCY_RANK,
  STATUS_DISPLAY,
  CATEGORY_DISPLAY,
  SOURCE_DISPLAY,
} from "../../lib/reputation/types";

describe("SEVERITY_RANK", () => {
  it("critical > high > medium > low", () => {
    expect(SEVERITY_RANK.critical).toBeGreaterThan(SEVERITY_RANK.high);
    expect(SEVERITY_RANK.high).toBeGreaterThan(SEVERITY_RANK.medium);
    expect(SEVERITY_RANK.medium).toBeGreaterThan(SEVERITY_RANK.low);
  });
});

describe("URGENCY_RANK", () => {
  it("immediate > within_hour > within_day > this_week > monitor", () => {
    expect(URGENCY_RANK.immediate).toBeGreaterThan(URGENCY_RANK.within_hour);
    expect(URGENCY_RANK.within_hour).toBeGreaterThan(URGENCY_RANK.within_day);
    expect(URGENCY_RANK.within_day).toBeGreaterThan(URGENCY_RANK.this_week);
    expect(URGENCY_RANK.this_week).toBeGreaterThan(URGENCY_RANK.monitor);
  });
});

describe("STATUS_DISPLAY", () => {
  it("has a label for every RepIssueStatus value", () => {
    const statuses = ["open","triaged","in_progress","escalated","resolved","archived"] as const;
    statuses.forEach((s) => expect(STATUS_DISPLAY[s]).toBeTruthy());
  });
});

describe("CATEGORY_DISPLAY", () => {
  it("has a label for every RepIssueCategory value", () => {
    const cats = ["misinformation","policy","personal_attack","media_inquiry","local_controversy","supporter_concern","legal","financial","general"] as const;
    cats.forEach((c) => expect(CATEGORY_DISPLAY[c]).toBeTruthy());
  });
});

describe("SOURCE_DISPLAY", () => {
  it("has a label for every RepAlertSourceType value", () => {
    const types = ["social_media","news","blog","forum","manual","internal_monitoring"] as const;
    types.forEach((t) => expect(SOURCE_DISPLAY[t]).toBeTruthy());
  });
});
