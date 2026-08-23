import { hashPassword, verifyPassword } from "../auth.js";

describe("password helpers", () => {
  test("UT-04 hashes passwords and verifies without storing plain text", async () => {
    const hash = await hashPassword("Password123");

    expect(hash).not.toBe("Password123");
    expect(await verifyPassword("Password123", hash)).toBe(true);
    expect(await verifyPassword("WrongPassword", hash)).toBe(false);
  });
});
