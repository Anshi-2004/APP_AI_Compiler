import { NextResponse } from "next/server";

// Redirect /dashboard → /(app)/dashboard
export function GET() {
  return NextResponse.redirect(new URL("/dashboard", "http://localhost:3000"));
}
