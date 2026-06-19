import { proxyPythonRequest } from "@/lib/python-gateway";

// The backend oracle query endpoint is GET with query params + payment proof header.
// We proxy it as GET, passing all headers through including X-402-Payment-Proof.
export async function GET(request: Request) {
  return proxyPythonRequest(request, "/oracle/query");
}

// Keep POST for backwards compatibility
export async function POST(request: Request) {
  return proxyPythonRequest(request, "/oracle/query");
}
