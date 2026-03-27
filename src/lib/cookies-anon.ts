import { cookies } from "next/headers";

export const ANON_COOKIE = "nexora_sid";

export async function getAnonSessionIdFromCookie(): Promise<string | undefined> {
  const c = await cookies();
  return c.get(ANON_COOKIE)?.value;
}

export async function setAnonCookie(sessionId: string) {
  const c = await cookies();
  c.set(ANON_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
    secure: process.env.NODE_ENV === "production",
  });
}
