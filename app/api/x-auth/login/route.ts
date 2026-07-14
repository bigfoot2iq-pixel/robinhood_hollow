import { NextRequest, NextResponse } from "next/server";

const clientId = process.env.TWITTER_CLIENT_ID;
const clientSecret = process.env.TWITTER_CLIENT_SECRET;
const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://robinhood-raffles.vercel.app').replace(/\/+$/, '');
const redirectUri = `${appUrl}/api/x-auth/callback`;

function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function generateCodeChallengeS256(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return btoa(String.fromCharCode(...hashArray))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function GET(request: NextRequest) {
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Twitter OAuth not configured" },
      { status: 500 }
    );
  }

  const state = generateRandomString(32);
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallengeS256(codeVerifier);

  const authUrl = new URL("https://twitter.com/i/oauth2/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "tweet.read users.read offline.access");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  const response = NextResponse.json({ authUrl: authUrl.toString(), state });

  response.cookies.set("x_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  return response;
}
