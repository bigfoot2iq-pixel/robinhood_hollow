import { NextRequest, NextResponse } from "next/server";

const INDEXER_URL = "https://app.katana.network/api/indexer-proxy";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[indexer-proxy] Forwarding request, variables:", JSON.stringify(body.variables));

    const res = await fetch(INDEXER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "*/*",
        "Origin": "https://app.katana.network",
        "Referer": "https://app.katana.network/stake",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
      },
      body: JSON.stringify(body),
    });

    console.log("[indexer-proxy] Response status:", res.status);

    const text = await res.text();
    console.log("[indexer-proxy] Raw response (first 500 chars):", text.slice(0, 500));

    if (!res.ok) {
      console.error("[indexer-proxy] Non-OK response:", res.status, text.slice(0, 300));
      return NextResponse.json(
        { error: "Indexer request failed", status: res.status, detail: text.slice(0, 300) },
        { status: res.status }
      );
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.error("[indexer-proxy] JSON parse error:", parseErr, "| text:", text.slice(0, 300));
      return NextResponse.json({ error: "Invalid JSON from indexer" }, { status: 502 });
    }

    console.log("[indexer-proxy] Token count:", data?.data?.Token?.length ?? "no Token field");
    return NextResponse.json(data);
  } catch (err) {
    console.error("[indexer-proxy] Unexpected error:", err);
    return NextResponse.json(
      { error: "Failed to proxy indexer request", detail: String(err) },
      { status: 500 }
    );
  }
}
