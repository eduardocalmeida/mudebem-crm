import { NextResponse } from "next/server";
import { municipiosDaUf } from "@/server/municipios-publico";

export const dynamic = "force-dynamic";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: Request) {
  const uf = new URL(req.url).searchParams.get("uf") || "";
  const municipios = await municipiosDaUf(uf);
  return NextResponse.json({ municipios }, { headers: CORS });
}
