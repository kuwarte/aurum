import { proxyPythonRequest } from "@/lib/python-gateway";

export async function GET(request: Request) {
  return proxyPythonRequest(request, "/cron/monitor");
}

export async function POST(request: Request) {
  return proxyPythonRequest(request, "/cron/monitor");
}
