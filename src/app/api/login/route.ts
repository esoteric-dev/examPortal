import { NextResponse } from "next/server";
import { readUsers } from "@/lib/auth";
import { encodeSession } from "@/lib/session";

export async function POST(request: Request) {
  const { email, password } = await request.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }
  const users = await readUsers();
  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  const token = encodeSession({ email: user.email, role: user.role });
  const res = NextResponse.json({ ok: true, role: user.role });
  res.headers.set("Set-Cookie", `session=${token}; Path=/; HttpOnly; SameSite=Lax`);
  return res;
}


