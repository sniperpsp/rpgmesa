import { NextResponse } from "next/server";
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { prisma } from "@/lib/prisma";

// GET /api/rooms/available
// Retorna todas as salas onde o usuário NÃO é membro ainda
export async function GET() {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    try {
        // Buscar todas as salas onde o usuário NÃO é membro
        const rooms = await prisma.room.findMany({
            where: {
                members: {
                    none: {
                        userId: session.userId
                    }
                }
            },
            include: {
                gm: {
                    select: {
                        id: true,
                        displayName: true,
                        email: true,
                    }
                },
                _count: {
                    select: {
                        members: true,
                        characterRooms: true,
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            },
            take: 20 // Limitar a 20 salas mais recentes
        });

        return NextResponse.json({ rooms }, { status: 200 });
    } catch (e) {
        console.error("Erro ao buscar salas disponíveis:", e);
        return NextResponse.json({ error: "Erro ao buscar salas" }, { status: 500 });
    }
}
