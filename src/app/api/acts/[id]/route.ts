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

    const { id: actId } = await params;

    try {
        const { events } = await request.json();

        const act = await prisma.act.findUnique({
            where: { id: actId },
            include: { story: { include: { room: true } } }
        });

        if (!act || act.story.room.gmUserId !== session.userId) {
            return NextResponse.json({ error: "Permissão negada" }, { status: 403 });
        }

        const updatedAct = await prisma.act.update({
            where: { id: actId },
            data: { events }
        });

        return NextResponse.json({ act: updatedAct });

    } catch (e) {
        console.error("Erro ao atualizar eventos do ato:", e);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
