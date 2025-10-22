import path from "path";
import fs from "fs/promises";

export type Role = "student" | "teacher";

export type User = {
  email: string;
  password: string; // plain for demo only
  role: Role;
  isPremium?: boolean;
  premiumExpiresAt?: string;
};

const dataDir = path.join(process.cwd(), "data");
const usersFile = path.join(dataDir, "users.json");

async function ensureUsers(): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(usersFile);
  } catch {
    const seed: User[] = [
      { email: "student@example.com", password: "student123", role: "student" },
      { email: "teacher@example.com", password: "teacher123", role: "teacher" },
    ];
    await fs.writeFile(usersFile, JSON.stringify(seed, null, 2));
  }
}

export async function readUsers(): Promise<User[]> {
  await ensureUsers();
  const raw = await fs.readFile(usersFile, "utf-8");
  return JSON.parse(raw) as User[];
}

export type Session = { email: string; role: Role };

// duplicate kept for backward compat; use session.ts helpers if needed


