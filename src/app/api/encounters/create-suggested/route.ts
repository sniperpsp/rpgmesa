import { NextResponse } from "next/server";
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { prisma } from "@/lib/prisma";

const HP_MULTIPLIER = 2.5;
const MANA_MULTIPLIER = 2.5;

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    try {
        const { roomId, name, monsters, addPlayers } = await request.json();

        const room = await prisma.room.findUnique({
            where: { id: roomId },
            include: {
                characterRooms: {
                    include: {
                        character: true,
                        roomStats: true
                    }
                }
            }
        });

        if (!room || room.gmUserId !== session.userId) {
            return NextResponse.json({ error: "Permissão negada" }, { status: 403 });
        }

        // Criar participantes NPCs (monstros)
        const npcParticipants = monsters.map((m: any) => ({
            name: m.name,
            hp: m.count ? m.count * 15 : 20,
            maxHp: m.count ? m.count * 15 : 20,
            mana: 0,
            maxMana: 0,
            initiative: 0,
            isNPC: true,
            statusEffects: []
        }));

        // Adicionar jogadores se solicitado
        const playerParticipants = addPlayers ? room.characterRooms.map(cr => ({
            name: cr.character.name,
            hp: cr.roomStats ? Math.round(cr.roomStats.hp * HP_MULTIPLIER) : 25,
            maxHp: cr.roomStats ? Math.round(cr.roomStats.hp * HP_MULTIPLIER) : 25,
            mana: cr.roomStats ? Math.round(cr.roomStats.mana * MANA_MULTIPLIER) : 12,
            maxMana: cr.roomStats ? Math.round(cr.roomStats.mana * MANA_MULTIPLIER) : 12,
            initiative: 0,
            isNPC: false,
            statusEffects: []
        })) : [];

        const encounter = await prisma.encounter.create({
            data: {
                roomId,
                name: name || "Encontro Gerado",
                isActive: false,
                participants: {
                    create: [...npcParticipants, ...playerParticipants]
                }
            },
            include: { participants: true }
        });

        return NextResponse.json({ encounter });

    } catch (e) {
        console.error("Erro ao criar encontro sugerido:", e);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
