import { proxyPythonRequest } from "@/lib/python-gateway";

export async function GET(request: Request) {
  return proxyPythonRequest(request, "/oracle/payment-info");
}
