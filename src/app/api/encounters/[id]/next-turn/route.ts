import { NextResponse } from "next/server";
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { prisma } from "@/lib/prisma";

// POST /api/encounters/[id]/next-turn
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id: encounterId } = await params;

    try {
        const encounter = await prisma.encounter.findUnique({
            where: { id: encounterId },
            include: {
                room: true,
                participants: true
            }
        });

        if (!encounter) {
            return NextResponse.json({ error: "Encontro não encontrado" }, { status: 404 });
        }

        // Verificar se o usuário é GM da sala
        if (encounter.room.gmUserId !== session.userId) {
            return NextResponse.json({ error: "Permissão negada" }, { status: 403 });
        }

        // Ordenar participantes por iniciativa (maior primeiro)
        const sortedParticipants = encounter.participants.sort(
            (a, b) => b.initiative - a.initiative
        );

        // Calcular próximo índice (circular)
        const nextIndex = (encounter.currentTurnIndex + 1) % sortedParticipants.length;

        // Atualizar encontro
        const updated = await prisma.encounter.update({
            where: { id: encounterId },
            data: { currentTurnIndex: nextIndex }
        });

        const currentParticipant = sortedParticipants[nextIndex];

        console.log(`⏭️ Turno avançado para: ${currentParticipant.name} (índice ${nextIndex})`);

        return NextResponse.json({
            encounter: updated,
            currentTurn: {
                index: nextIndex,
                participant: currentParticipant
            }
        });

    } catch (e) {
        console.error("Erro ao avançar turno:", e);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
