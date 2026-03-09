import { NextRequest, NextResponse } from "next/server";

/**
 * CSP violation report endpoint.
 * Browsers POST here when a Content-Security-Policy directive is violated.
 * Reports are logged server-side for monitoring; no auth required.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const report = body["csp-report"] ?? body;

    console.warn("[CSP Violation]", JSON.stringify({
      blockedUri: report["blocked-uri"],
      violatedDirective: report["violated-directive"],
      effectiveDirective: report["effective-directive"],
      documentUri: report["document-uri"],
      sourceFile: report["source-file"],
      lineNumber: report["line-number"],
    }));
  } catch {
    // Malformed report — ignore
  }

  return new NextResponse(null, { status: 204 });
}
