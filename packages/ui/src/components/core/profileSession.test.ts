import { describe, expect, it } from "bun:test";
import { isPrimaryValue, normalizeProfile, parseImpersonationRecord, pickDefaultProfile, pickRestoredProfile, profileSubtitle } from "./profileSession";

const banpu = {
  personId: "p-1",
  userId: "u-1",
  firstNameEn: "Kavisara",
  lastNameEN: "Thisakobsuk",
  jobTitle: "Section Manager - Application Development",
  companyModel: { name: "Banpu Public Company Limited" },
  businessUnitModel: { name: "Digital" },
  email: "k@banpu.co.th",
};

describe("normalizeProfile", () => {
  it("reads the Banpu shape with the default keys", () => {
    const p = normalizeProfile(banpu);
    expect(p.personId).toBe("p-1");
    expect(p.userId).toBe("u-1");
    expect(p.name).toBe("Kavisara Thisakobsuk");
    expect(p.jobTitle).toBe(banpu.jobTitle);
    expect(p.company).toBe("Banpu Public Company Limited");
    expect(p.department).toBe("Digital");
    expect(profileSubtitle(p)).toBe(`${banpu.jobTitle} · Banpu Public Company Limited · Digital`);
  });

  it("falls back from the template to the name paths, then the email, then the id", () => {
    expect(normalizeProfile({ PersonId: "7", FullNameEN: "Tian Meng" }).name).toBe("Tian Meng");
    expect(normalizeProfile({ personId: "7", email: "t@x.y" }).name).toBe("t@x.y");
    expect(normalizeProfile({ personId: "7" }).name).toBe("7");
    expect(normalizeProfile({ personId: "7" }).userId).toBe("7");
  });

  it("takes custom keys and a custom template", () => {
    const p = normalizeProfile({ id: 9, login: "tm", given: "Tian", family: "Meng", title: "Accountant" }, {
      personId: "id",
      userId: "login",
      nameTemplate: "{{family}}, {{given}}",
      jobTitle: ["position", "title"],
    });
    expect(p).toMatchObject({ personId: "9", userId: "tm", name: "Meng, Tian", jobTitle: "Accountant" });
  });
});

describe("pickRestoredProfile", () => {
  const list = [{ userId: "a" }, { userId: "b" }];
  it("restores the saved profile when it is still listed", () => {
    expect(pickRestoredProfile(list, "b")).toEqual({ userId: "b" });
  });
  it("falls back to the first profile otherwise", () => {
    expect(pickRestoredProfile(list, "gone")).toEqual({ userId: "a" });
    expect(pickRestoredProfile(list, null)).toEqual({ userId: "a" });
    expect(pickRestoredProfile([], "a")).toBeUndefined();
  });
});

describe("parseImpersonationRecord", () => {
  it("accepts only a well-formed record", () => {
    expect(parseImpersonationRecord(JSON.stringify({ original: { userId: "u" }, replacedPersonId: "p" }))).toEqual({ original: { userId: "u" }, replacedPersonId: "p" });
    expect(parseImpersonationRecord(JSON.stringify({ replacedPersonId: "p" }))).toBeNull();
    expect(parseImpersonationRecord(JSON.stringify({ original: {}, replacedPersonId: "" }))).toBeNull();
    expect(parseImpersonationRecord("not json")).toBeNull();
    expect(parseImpersonationRecord(null)).toBeNull();
  });
});

describe("primary assignment", () => {
  it("reads the Banpu flag permissively", () => {
    expect(normalizeProfile({ ...banpu, isPrimaryAssignment: "Y" }).primary).toBe(true);
    expect(normalizeProfile({ ...banpu, isPrimaryAssignment: "true" }).primary).toBe(true);
    expect(normalizeProfile({ ...banpu, isPrimaryAssignment: 1 }).primary).toBe(true);
    expect(normalizeProfile({ ...banpu, isPrimaryAssignment: "N" }).primary).toBe(false);
    expect(normalizeProfile(banpu).primary).toBe(false);
    expect(isPrimaryValue("  y ")).toBe(true);
    expect(isPrimaryValue(0)).toBe(false);
  });

  it("picks the primary profile over the first, and the first without one", () => {
    const a = { userId: "a", primary: false };
    const b = { userId: "b", primary: true };
    expect(pickDefaultProfile([a, b])).toBe(b);
    expect(pickDefaultProfile([a, { userId: "c", primary: false }])).toBe(a);
    expect(pickDefaultProfile([])).toBeUndefined();
  });

  it("lets a saved switch win over the primary flag", () => {
    const a = { userId: "a", primary: false };
    const b = { userId: "b", primary: true };
    expect(pickRestoredProfile([a, b], "a")).toBe(a);
    expect(pickRestoredProfile([a, b], null)).toBe(b);
    expect(pickRestoredProfile([a, b], "gone")).toBe(b);
  });

  it("drops company · department from the subtitle on request", () => {
    const p = normalizeProfile(banpu);
    expect(profileSubtitle(p, false)).toBe(banpu.jobTitle);
  });
});
