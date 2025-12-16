import { NextResponse } from "next/server";
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id: participantId } = await params;

    try {
        const { hp, mana, statusEffects } = await request.json();

        const participant = await prisma.encounterParticipant.findUnique({
            where: { id: participantId },
            include: { encounter: { include: { room: true } } }
        });

        if (!participant || participant.encounter.room.gmUserId !== session.userId) {
            return NextResponse.json({ error: "Permissão negada" }, { status: 403 });
        }

        const updated = await prisma.encounterParticipant.update({
            where: { id: participantId },
            data: {
                ...(hp !== undefined && { hp }),
                ...(mana !== undefined && { mana }),
                ...(statusEffects !== undefined && { statusEffects })
            }
        });

        return NextResponse.json({ participant: updated });

    } catch (e) {
        console.error("Erro ao atualizar participante:", e);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
