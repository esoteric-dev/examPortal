import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { withAuth, security } from '@/lib/security';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await withAuth(request);
    if (error) return error;

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user, error } = await withAuth(request);
    if (error) return error;

    const body = await request.json();
    const { name, email } = body;

    // Validate input
    if (name && typeof name !== 'string') {
      return NextResponse.json({ error: 'Name must be a string' }, { status: 400 });
    }

    if (email && !security.validateEmail(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await db.getUserByEmail(email);
      if (existingUser && existingUser.id !== user.id) {
        return NextResponse.json({ error: 'Email already taken' }, { status: 400 });
      }
    }

    // Update user
    const updates: any = {};
    if (name) updates.name = security.sanitizeInput(name);
    if (email) updates.email = email.toLowerCase();

    const updatedUser = await db.updateUser(user.id, updates);
    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
