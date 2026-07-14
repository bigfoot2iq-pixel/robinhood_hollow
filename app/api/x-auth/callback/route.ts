import { NextRequest, NextResponse } from "next/server";

const clientId = process.env.TWITTER_CLIENT_ID;
const clientSecret = process.env.TWITTER_CLIENT_SECRET;
const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://robinhood-raffles.vercel.app').replace(/\/+$/, '');
const redirectUri = `${appUrl}/api/x-auth/callback`;

export async function GET(request: NextRequest) {
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/waitlist?x_auth_error=not_configured`);
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const redirectBase = `${appUrl}/waitlist`;

  if (error) {
    return NextResponse.redirect(`${redirectBase}?x_auth_error=${error}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${redirectBase}?x_auth_error=missing_params`);
  }

  const codeVerifier = request.cookies.get("x_code_verifier")?.value;

  if (!codeVerifier) {
    return NextResponse.redirect(`${redirectBase}?x_auth_error=missing_verifier`);
  }

  try {
    const tokenResponse = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange error:", errorData);
      return NextResponse.redirect(`${redirectBase}?x_auth_error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    const userResponse = await fetch(
      "https://api.twitter.com/2/users/me?user.fields=id,username,name,profile_image_url,verified",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!userResponse.ok) {
      const errorData = await userResponse.text();
      console.error("User fetch error:", errorData);
      return NextResponse.redirect(`${redirectBase}?x_auth_error=user_fetch_failed`);
    }

    const userData = await userResponse.json();
    const twitterUser = userData.data;

    const userDataEncoded = Buffer.from(
      JSON.stringify({
        id: twitterUser.id,
        username: twitterUser.username,
        name: twitterUser.name,
        profile_image_url: twitterUser.profile_image_url,
        verified: twitterUser.verified,
      })
    ).toString("base64");

    return NextResponse.redirect(
      `${redirectBase}?x_auth_success=true&x_user_data=${userDataEncoded}&x_state=${state}`
    );
  } catch (error) {
    console.error("X Auth callback error:", error);
    return NextResponse.redirect(`${redirectBase}?x_auth_error=server_error`);
  }
}
