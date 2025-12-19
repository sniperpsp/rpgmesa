import { NextResponse } from "next/server";
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET /api/rooms/[code]/status - Endpoint LEVE para polling
export async function GET(
    request: Request,
    { params }: { params: Promise<{ code: string }> }
) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    try {
        const { code } = await params;

        // Consulta LEVE - apenas dados essenciais para combat sync
        const room = await prisma.room.findUnique({
            where: { joinCode: code.toUpperCase() },
            include: {
                encounters: {
                    where: { isActive: true },
                    include: {
                        participants: {
                            orderBy: [
                                { initiative: 'desc' },
                                { name: 'asc' }
                            ]
                        }
                    }
                }
            }
        });

        if (!room) {
            return NextResponse.json({ error: "Sala não encontrada" }, { status: 404 });
        }

        // Verificar se há combate ativo
        const activeEncounter = room.encounters[0] || null;

        return NextResponse.json({
            roomId: room.id,
            roomName: room.name,
            isGM: room.gmUserId === session.userId,
            activeEncounter: activeEncounter ? {
                id: activeEncounter.id,
                name: activeEncounter.name,
                currentTurnIndex: activeEncounter.currentTurnIndex,
                participants: activeEncounter.participants.map(p => ({
                    id: p.id,
                    name: p.name,
                    hp: p.hp,
                    maxHp: p.maxHp,
                    mana: p.mana,
                    maxMana: p.maxMana,
                    initiative: p.initiative,
                    isNPC: p.isNPC,
                    statusEffects: p.statusEffects
                }))
            } : null,
            timestamp: Date.now()
        });

    } catch (e) {
        console.error("Erro ao buscar status:", e);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
