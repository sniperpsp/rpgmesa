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

    const { id: encounterId } = await params;

    try {
        const { isActive } = await request.json();

        const encounter = await prisma.encounter.findUnique({
            where: { id: encounterId },
            include: { room: true }
        });

        if (!encounter || encounter.room.gmUserId !== session.userId) {
            return NextResponse.json({ error: "Permissão negada" }, { status: 403 });
        }

        // Se ativando, desativar outros encontros da sala
        if (isActive) {
            await prisma.encounter.updateMany({
                where: {
                    roomId: encounter.roomId,
                    id: { not: encounterId }
                },
                data: { isActive: false }
            });
        }

        const updated = await prisma.encounter.update({
            where: { id: encounterId },
            data: { isActive }
        });

        return NextResponse.json({ encounter: updated });

    } catch (e) {
        console.error("Erro ao atualizar encontro:", e);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id: encounterId } = await params;

    try {
        const encounter = await prisma.encounter.findUnique({
            where: { id: encounterId },
            include: { room: true }
        });

        if (!encounter || encounter.room.gmUserId !== session.userId) {
            return NextResponse.json({ error: "Permissão negada" }, { status: 403 });
        }

        // Não permitir deletar encontro ativo
        if (encounter.isActive) {
            return NextResponse.json({ error: "Não é possível deletar um encontro ativo" }, { status: 400 });
        }

        await prisma.encounter.delete({
            where: { id: encounterId }
        });

        return NextResponse.json({ success: true });

    } catch (e) {
        console.error("Erro ao deletar encontro:", e);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
