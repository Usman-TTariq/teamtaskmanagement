import type { NextRequest } from "next/server";

export function getRedirectOrigin(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  if (
    forwardedHost &&
    !forwardedHost.startsWith("localhost") &&
    !forwardedHost.startsWith("127.0.0.1")
  ) {
    return `${forwardedProto}://${forwardedHost.split(",")[0]?.trim()}`;
  }

  return request.nextUrl.origin;
}

export function passwordRecoverRedirectUrl(siteUrl: string) {
  return `${siteUrl}/auth/recover`;
}

export function buildPasswordRecoverLink(
  siteUrl: string,
  tokenHash: string,
) {
  const params = new URLSearchParams({
    token_hash: tokenHash,
    type: "recovery",
  });
  return `${siteUrl}/auth/recover?${params.toString()}`;
}
