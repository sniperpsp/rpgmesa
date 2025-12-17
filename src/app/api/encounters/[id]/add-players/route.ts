import { NextResponse } from "next/server";
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { prisma } from "@/lib/prisma";

// POST /api/encounters/[id]/add-players
// Adiciona todos os personagens da sala que ainda não estão no encontro
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
                room: {
                    include: {
                        characterRooms: {
                            include: {
                                character: true,
                                roomStats: true
                            }
                        }
                    }
                },
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

        // Pegar IDs dos participantes já existentes
        const existingParticipantNames = new Set(
            encounter.participants.filter(p => !p.isNPC).map(p => p.name)
        );

        // Adicionar personagens que ainda não estão no encontro
        const newParticipants = [];
        for (const charRoom of encounter.room.characterRooms) {
            if (!existingParticipantNames.has(charRoom.character.name)) {
                const stats = charRoom.roomStats;
                newParticipants.push({
                    encounterId: encounterId,
                    name: charRoom.character.name,
                    hp: stats?.hp || 10,
                    maxHp: stats?.hp || 10,
                    mana: stats?.mana || 5,
                    maxMana: stats?.mana || 5,
                    initiative: 0,
                    isNPC: false
                });
            }
        }

        if (newParticipants.length > 0) {
            await prisma.encounterParticipant.createMany({
                data: newParticipants
            });
        }

        return NextResponse.json({
            success: true,
            addedCount: newParticipants.length,
            message: `${newParticipants.length} jogador(es) adicionado(s) ao encontro`
        });

    } catch (e) {
        console.error("Erro ao adicionar jogadores:", e);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
