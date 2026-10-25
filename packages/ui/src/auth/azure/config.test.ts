import { describe, expect, test } from "bun:test";
import { authInitials, profileLoad, readKeyPath, resolveAzureEnv, type AzureAuthConfig } from "./config";

const base: AzureAuthConfig = { provider: "azure" };

describe("resolveAzureEnv", () => {
  test("reads the default var names and defaults the redirect URI to the origin", () => {
    const r = resolveAzureEnv(base, { AZURE_TENANT_ID: "t", AZURE_CLIENT_ID: "c", AZURE_API_SCOPE: "api://x/.default" }, "https://app.test");
    expect(r).toEqual({ tenantId: "t", clientId: "c", scope: "api://x/.default", redirectUri: "https://app.test", missing: [] });
  });

  test("honours configured var names and lists the blank required ones by name", () => {
    const r = resolveAzureEnv({ ...base, env: { tenantId: "TENANT", scope: "SCOPE" } }, { TENANT: " t ", AZURE_CLIENT_ID: "" }, "o");
    expect(r.tenantId).toBe("t");
    expect(r.missing).toEqual(["AZURE_CLIENT_ID", "SCOPE"]);
  });

  test("an explicit redirect var wins over the origin", () => {
    const r = resolveAzureEnv(base, { AZURE_REDIRECT_URL: "https://x/cb" }, "https://app.test");
    expect(r.redirectUri).toBe("https://x/cb");
  });
});

describe("profileLoad", () => {
  const withProfile = (emailParam: string, stateKey?: string): AzureAuthConfig => ({
    ...base,
    profile: { api: { name: "profileByEmail", paths: ["data"], query: { x: { type: "value", key: "none", value: 1 } } }, emailParam, stateKey },
  });

  test("nothing without a profile", () => {
    expect(profileLoad(base, "/x")).toBeUndefined();
  });

  test("puts the email into params when it is a URL :param, chained on the auth slice", () => {
    const load = profileLoad(withProfile("email"), "/collection/profiles/:email")!;
    expect(load.key).toBe("me");
    expect(load.loading).toBe("none");
    expect(load.api.params).toEqual({ email: { type: "state", key: "auth", path: "email" } });
    expect(load.api.query).toEqual({ x: { type: "value", key: "none", value: 1 } });
  });

  test("puts the email into the query otherwise and keeps the configured state key", () => {
    const load = profileLoad(withProfile("email", "whoami"), "/collection/profiles/email")!;
    expect(load.key).toBe("whoami");
    expect(load.api.query?.email).toEqual({ type: "state", key: "auth", path: "email" });
    expect(load.api.params).toEqual({});
  });
});

describe("readKeyPath", () => {
  const profile = { firstNameEn: "Chanwit", lastNameEN: "Yimneam", jobTitle: "", companyModel: { name: "Gummy" }, avatar: null };

  test("a lodash path", () => {
    expect(readKeyPath(profile, "companyModel.name")).toBe("Gummy");
  });

  test("a template joins the parts and collapses blanks", () => {
    expect(readKeyPath(profile, "{{firstNameEn}} {{lastNameEN}}")).toBe("Chanwit Yimneam");
    expect(readKeyPath({ firstNameEn: "Solo" }, "{{firstNameEn}} {{lastNameEN}}")).toBe("Solo");
  });

  test("a list takes the first non-empty value", () => {
    expect(readKeyPath(profile, ["jobTitle", "avatar", "companyModel.name"])).toBe("Gummy");
    expect(readKeyPath(profile, ["jobTitle", "avatar"])).toBe("");
  });

  test("empty without a source or key", () => {
    expect(readKeyPath(undefined, "x")).toBe("");
    expect(readKeyPath(profile, undefined)).toBe("");
  });
});

describe("authInitials", () => {
  test("two initials from a name, one from an email, ? when blank", () => {
    expect(authInitials("Chanwit Yimneam")).toBe("CY");
    expect(authInitials("chanwit_y@gummay.co.th")).toBe("CY");
    expect(authInitials("")).toBe("?");
  });
});
