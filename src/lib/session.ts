export type Role = "student" | "teacher";
export type Session = { email: string; role: Role };

function base64urlEncode(input: string): string {
  const b64 = btoa(unescape(encodeURIComponent(input)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(input: string): string {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '==='.slice((b64.length + 3) % 4);
  const str = atob(padded);
  try {
    return decodeURIComponent(escape(str));
  } catch {
    return str;
  }
}

export function encodeSession(session: Session): string {
  const json = JSON.stringify(session);
  return base64urlEncode(json);
}

export function decodeSession(token: string | undefined | null): Session | null {
  if (!token) return null;
  try {
    const json = base64urlDecode(token);
    const parsed = JSON.parse(json);
    if (typeof parsed?.email === "string" && (parsed?.role === "student" || parsed?.role === "teacher")) {
      return parsed as Session;
    }
  } catch {
    return null;
  }
  return null;
}


