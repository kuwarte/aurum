import { proxyPythonRequest } from "@/lib/python-gateway";

export async function POST(request: Request) {
  return proxyPythonRequest(request, "/oracle/query");
}
