export type Role = "student" | "teacher";
export type Session = { email: string; role: Role };

export function encodeSession(session: Session): string {
  const json = JSON.stringify(session);
  return Buffer.from(json, "utf-8").toString("base64url");
}

export function decodeSession(token: string | undefined | null): Session | null {
  if (!token) return null;
  try {
    const json = Buffer.from(token, "base64url").toString("utf-8");
    const parsed = JSON.parse(json);
    if (typeof parsed?.email === "string" && (parsed?.role === "student" || parsed?.role === "teacher")) {
      return parsed as Session;
    }
  } catch {
    return null;
  }
  return null;
}


