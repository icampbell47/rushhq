import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { SESSION_TTL_SECONDS, createSessionToken, verifySessionToken } from "@/lib/session";

const secret = "test-secret-that-is-definitely-longer-than-32-chars";
const otherSecret = "another-secret-that-is-also-longer-than-32-chars";
const key = new TextEncoder().encode(secret);

function base64url(value: object) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

describe("session tokens", () => {
  it.each(["brother", "admin"] as const)("round-trips a %s session", async (tier) => {
    const token = await createSessionToken(tier, { secret });
    await expect(verifySessionToken(token, { secret })).resolves.toBe(tier);
  });

  it("rejects the legacy raw cookie values", async () => {
    await expect(verifySessionToken("admin", { secret })).resolves.toBeNull();
    await expect(verifySessionToken("brother", { secret })).resolves.toBeNull();
  });

  it("treats a missing cookie as no session", async () => {
    await expect(verifySessionToken(undefined, { secret })).resolves.toBeNull();
    await expect(verifySessionToken("", { secret })).resolves.toBeNull();
  });

  it("rejects a token whose payload was edited to escalate the tier", async () => {
    const [header, , signature] = (await createSessionToken("brother", { secret })).split(".");
    const now = Math.floor(Date.now() / 1000);
    const forgedPayload = base64url({ tier: "admin", iss: "rushhq", iat: now, exp: now + 3600 });
    await expect(verifySessionToken(`${header}.${forgedPayload}.${signature}`, { secret })).resolves.toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await createSessionToken("admin", { secret: otherSecret });
    await expect(verifySessionToken(token, { secret })).resolves.toBeNull();
  });

  it('rejects an unsigned alg "none" token', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = `${base64url({ alg: "none", typ: "JWT" })}.${base64url({ tier: "admin", iss: "rushhq", iat: now, exp: now + 3600 })}.`;
    await expect(verifySessionToken(token, { secret })).resolves.toBeNull();
  });

  it("only accepts HS256 even when another HMAC algorithm uses the same secret", async () => {
    const token = await new SignJWT({ tier: "admin" })
      .setProtectedHeader({ alg: "HS512" })
      .setIssuer("rushhq")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(key);
    await expect(verifySessionToken(token, { secret })).resolves.toBeNull();
  });

  it("rejects tokens from another issuer", async () => {
    const token = await new SignJWT({ tier: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("someone-else")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(key);
    await expect(verifySessionToken(token, { secret })).resolves.toBeNull();
  });

  it("rejects tokens without an expiry", async () => {
    const token = await new SignJWT({ tier: "admin" }).setProtectedHeader({ alg: "HS256" }).setIssuer("rushhq").setIssuedAt().sign(key);
    await expect(verifySessionToken(token, { secret })).resolves.toBeNull();
  });

  it("rejects an unknown tier claim", async () => {
    const token = await new SignJWT({ tier: "superuser" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("rushhq")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(key);
    await expect(verifySessionToken(token, { secret })).resolves.toBeNull();
  });

  describe("expiry", () => {
    const issuedAt = new Date("2026-09-01T12:00:00Z");
    const secondsLater = (seconds: number) => new Date(issuedAt.getTime() + seconds * 1000);

    it("expires admin sessions after 12 hours", async () => {
      const token = await createSessionToken("admin", { secret, now: issuedAt });
      expect(SESSION_TTL_SECONDS.admin).toBe(12 * 60 * 60);
      await expect(verifySessionToken(token, { secret, now: secondsLater(SESSION_TTL_SECONDS.admin - 60) })).resolves.toBe("admin");
      await expect(verifySessionToken(token, { secret, now: secondsLater(SESSION_TTL_SECONDS.admin + 60) })).resolves.toBeNull();
    });

    it("keeps brother sessions for 30 days", async () => {
      const token = await createSessionToken("brother", { secret, now: issuedAt });
      expect(SESSION_TTL_SECONDS.brother).toBe(30 * 24 * 60 * 60);
      await expect(verifySessionToken(token, { secret, now: secondsLater(SESSION_TTL_SECONDS.brother - 60) })).resolves.toBe("brother");
      await expect(verifySessionToken(token, { secret, now: secondsLater(SESSION_TTL_SECONDS.brother + 60) })).resolves.toBeNull();
    });
  });

  describe("misconfiguration", () => {
    it("refuses to sign or verify without a long enough secret", async () => {
      await expect(createSessionToken("admin", { secret: "short" })).rejects.toThrow(/SESSION_SECRET/);
      await expect(verifySessionToken("anything", { secret: "short" })).rejects.toThrow(/SESSION_SECRET/);
    });

    it("reads SESSION_SECRET from the environment by default", async () => {
      const previous = process.env.SESSION_SECRET;
      try {
        delete process.env.SESSION_SECRET;
        await expect(createSessionToken("admin")).rejects.toThrow(/SESSION_SECRET/);
        process.env.SESSION_SECRET = secret;
        await expect(verifySessionToken(await createSessionToken("admin"))).resolves.toBe("admin");
      } finally {
        if (previous === undefined) delete process.env.SESSION_SECRET;
        else process.env.SESSION_SECRET = previous;
      }
    });
  });
});
