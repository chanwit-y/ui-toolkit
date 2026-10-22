import { describe, expect, it } from "bun:test";
import { normalizeProfile, parseImpersonationRecord, pickRestoredProfile, profileSubtitle } from "./profileSession";

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
