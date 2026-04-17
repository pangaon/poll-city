import { buildOutreachEmail } from "../outreach-sequences";

describe("buildOutreachEmail", () => {
  const params = { vendorName: "Canteen Co.", campaignName: "Smith for Ward 5", contactName: "Alex" };

  it("interpolates campaign name in subject", () => {
    const { subject } = buildOutreachEmail("initial", params);
    expect(subject).toContain("Smith for Ward 5");
  });

  it("uses contactName when provided", () => {
    const { html } = buildOutreachEmail("initial", params);
    expect(html).toContain("Alex");
  });

  it("falls back to vendorName when contactName is null", () => {
    const { html } = buildOutreachEmail("initial", { ...params, contactName: null });
    expect(html).toContain("Canteen Co.");
  });

  it("generates follow_up_1 with different copy from initial", () => {
    const initial = buildOutreachEmail("initial", params);
    const followUp = buildOutreachEmail("follow_up_1", params);
    expect(initial.html).not.toBe(followUp.html);
    expect(initial.subject).not.toBe(followUp.subject);
  });

  it("generates follow_up_2 as final check-in", () => {
    const { html } = buildOutreachEmail("follow_up_2", params);
    expect(html.toLowerCase()).toContain("final");
  });

  it("all steps produce non-empty subject and html", () => {
    for (const step of ["initial", "follow_up_1", "follow_up_2"] as const) {
      const { subject, html } = buildOutreachEmail(step, params);
      expect(subject.length).toBeGreaterThan(0);
      expect(html.length).toBeGreaterThan(0);
    }
  });
});
