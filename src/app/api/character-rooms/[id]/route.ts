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

    const { id: characterRoomId } = await params;

    try {
        const { stats, abilities } = await request.json();

        const characterRoom = await prisma.characterRoom.findUnique({
            where: { id: characterRoomId },
            include: { room: true }
        });

        if (!characterRoom || characterRoom.room.gmUserId !== session.userId) {
            return NextResponse.json({ error: "Permissão negada" }, { status: 403 });
        }

        // Atualizar stats se fornecido
        if (stats) {
            await prisma.characterRoomStats.upsert({
                where: { characterRoomId },
                create: {
                    characterRoomId,
                    ...stats
                },
                update: stats
            });
        }

        // Atualizar abilities se fornecido
        if (abilities) {
            // Deletar abilities antigas
            await prisma.characterRoomAbility.deleteMany({
                where: { characterRoomId }
            });

            // Criar novas
            if (abilities.length > 0) {
                await prisma.characterRoomAbility.createMany({
                    data: abilities.map((ability: any) => ({
                        characterRoomId,
                        ...ability
                    }))
                });
            }
        }

        return NextResponse.json({ success: true });

    } catch (e) {
        console.error("Erro ao atualizar personagem:", e);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
