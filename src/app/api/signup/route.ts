import { NextResponse } from "next/server";
import { readUsers } from "@/lib/auth";
import { encodeSession } from "@/lib/session";
import fs from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();
    
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 });
    }

    // Check if user already exists
    const users = await readUsers();
    const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
    }

    // Create new user
    const newUser = {
      email: email.toLowerCase(),
      password: password, // In production, hash this password
      role: "student" as const,
      name: name.trim()
    };

    // Add to users array
    const updatedUsers = [...users, newUser];

    // Write back to file
    const dataDir = path.join(process.cwd(), "data");
    const usersFile = path.join(dataDir, "users.json");
    await fs.writeFile(usersFile, JSON.stringify(updatedUsers, null, 2));

    // Auto-login the user
    const token = encodeSession({ email: newUser.email, role: newUser.role });
    const res = NextResponse.json({ 
      ok: true, 
      role: newUser.role,
      message: "Account created successfully" 
    });
    res.headers.set("Set-Cookie", `session=${token}; Path=/; HttpOnly; SameSite=Lax`);
    
    return res;
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
