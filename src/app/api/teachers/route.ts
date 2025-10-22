import { NextResponse } from "next/server";
import { readUsers } from "@/lib/auth";
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

    // Create new teacher
    const newTeacher = {
      email: email.toLowerCase(),
      password: password, // In production, hash this password
      role: "teacher" as const,
      name: name.trim()
    };

    // Add to users array
    const updatedUsers = [...users, newTeacher];

    // Write back to file
    const dataDir = path.join(process.cwd(), "data");
    const usersFile = path.join(dataDir, "users.json");
    await fs.writeFile(usersFile, JSON.stringify(updatedUsers, null, 2));

    return NextResponse.json({ 
      ok: true, 
      message: "Teacher added successfully",
      teacher: {
        name: newTeacher.name,
        email: newTeacher.email,
        role: newTeacher.role
      }
    });
  } catch (error) {
    console.error("Add teacher error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
