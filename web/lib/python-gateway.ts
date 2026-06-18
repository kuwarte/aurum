import { NextResponse } from "next/server";

const DEFAULT_PYTHON_API_BASE_URL = "http://127.0.0.1:8000";

function buildTargetUrl(pathname: string, requestUrl: string) {
  const baseUrl =
    process.env.PYTHON_API_BASE_URL ?? DEFAULT_PYTHON_API_BASE_URL;
  const target = new URL(pathname, baseUrl);
  const sourceUrl = new URL(requestUrl);
  target.search = sourceUrl.search;
  return target;
}

async function readRequestBody(request: Request) {
  if (request.method === "GET" || request.method === "HEAD") {
    return undefined;
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const json = await request.json().catch(() => null);
    return json === null ? undefined : JSON.stringify(json);
  }

  const text = await request.text();
  return text.length > 0 ? text : undefined;
}

export async function proxyPythonRequest(request: Request, pathname: string) {
  const targetUrl = buildTargetUrl(pathname, request.url);
  const body = await readRequestBody(request);

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        "content-type": request.headers.get("content-type") ?? "application/json",
      },
      body,
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const payload = await response.json();
      return NextResponse.json(payload, { status: response.status });
    }

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { "content-type": contentType || "text/plain; charset=utf-8" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown proxy failure";

    return NextResponse.json(
      {
        success: false,
        message: `Unable to reach Python service at ${targetUrl.origin}.`,
        error: message,
      },
      { status: 503 },
    );
  }
}
