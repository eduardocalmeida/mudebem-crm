import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, lerSessao } from "@/lib/token";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const publico =
    pathname === "/login" ||
    pathname === "/orcamento" ||
    pathname === "/formulario.js" ||
    pathname.startsWith("/api/publico/") ||
    pathname.startsWith("/api/webmania/");
  const sessao = await lerSessao(req.cookies.get(COOKIE_SESSAO)?.value);

  if (!sessao && !publico) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    const resposta = NextResponse.redirect(url);
    resposta.cookies.delete(COOKIE_SESSAO);
    return resposta;
  }

  if (sessao && publico) {
    const url = req.nextUrl.clone();
    url.pathname = "/painel";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|api/v1|api/health|api/whatsapp/webhook).*)"],
};
