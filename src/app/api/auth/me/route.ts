import { NextResponse } from "next/server";
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { prisma } from "@/lib/prisma";

// GET /api/auth/me
export async function GET() {
    try {
        const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

        if (!session.isLoggedIn || !session.userId) {
            return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
        }

        // Buscar dados do usuário
        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: {
                id: true,
                email: true,
                displayName: true,
                isAdmin: true,
                createdAt: true,
            }
        });

        if (!user) {
            return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
        }

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.displayName || user.email,
                displayName: user.displayName,
                isAdmin: user.isAdmin,
                createdAt: user.createdAt,
            }
        }, { status: 200 });
    } catch (e) {
        console.error("Erro ao buscar dados do usuário:", e);
        return NextResponse.json({ error: "Erro ao buscar dados do usuário" }, { status: 500 });
    }
}
