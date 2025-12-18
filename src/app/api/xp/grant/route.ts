import { NextResponse } from "next/server";
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { prisma } from "@/lib/prisma";

// Calcula XP necessário para o próximo nível
function calculateXpToNextLevel(level: number): number {
    return level * level * 100; // 100, 400, 900, 1600...
}

// POST /api/xp/grant - Concede XP proporcionalmente aos jogadores
export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    try {
        const { encounterId, npcParticipantId, roomCode } = await request.json();

        // Buscar o participante NPC morto
        const npc = await prisma.encounterParticipant.findUnique({
            where: { id: npcParticipantId },
            include: { encounter: true }
        });

        if (!npc || !npc.isNPC) {
            return NextResponse.json({ error: "NPC não encontrado" }, { status: 404 });
        }

        // Buscar a sala e os personagens dos jogadores
        const room = await prisma.room.findUnique({
            where: { joinCode: roomCode.toUpperCase() },
            include: {
                characterRooms: {
                    include: {
                        roomStats: true,
                        character: true
                    }
                }
            }
        });

        if (!room) {
            return NextResponse.json({ error: "Sala não encontrada" }, { status: 404 });
        }

        // Calcular XP total do NPC
        const xpReward = (npc as any).xpReward || (npc as any).level * (npc as any).level * 10;
        const damageReceived = (npc as any).damageReceived || {};

        // Calcular dano total recebido
        const totalDamage = Object.values(damageReceived).reduce((sum: number, dmg: any) => sum + (dmg || 0), 0) as number;

        // Se não houver registro de dano, dividir igualmente entre todos os jogadores participantes
        const xpGrants: Array<{ characterRoomId: string, xp: number, name: string }> = [];

        if (totalDamage === 0) {
            // Dividir XP igualmente
            const playerCount = room.characterRooms.length;
            const xpPerPlayer = Math.floor(xpReward / playerCount);

            for (const cr of room.characterRooms) {
                if (cr.roomStats) {
                    xpGrants.push({
                        characterRoomId: cr.id,
                        xp: xpPerPlayer,
                        name: cr.character.name
                    });
                }
            }
        } else {
            // Dividir XP proporcionalmente ao dano
            for (const [participantId, damage] of Object.entries(damageReceived)) {
                const proportion = (damage as number) / totalDamage;
                const xp = Math.floor(xpReward * proportion);

                // Encontrar o characterRoom correspondente ao participante
                // O participantId pode ser o id do characterRoom ou do próprio participant
                const cr = room.characterRooms.find(c => c.id === participantId);
                if (cr && cr.roomStats) {
                    xpGrants.push({
                        characterRoomId: cr.id,
                        xp,
                        name: cr.character.name
                    });
                }
            }
        }

        // Aplicar XP e verificar level up
        const levelUps: Array<{ name: string, newLevel: number, statPoints: number }> = [];

        for (const grant of xpGrants) {
            const stats = await prisma.characterRoomStats.findFirst({
                where: { characterRoomId: grant.characterRoomId }
            });

            if (stats) {
                let newXp = stats.xp + grant.xp;
                let newLevel = stats.level;
                let newXpToNext = stats.xpToNextLevel;
                let newStatPoints = stats.statPoints;

                // Check for level up
                while (newXp >= newXpToNext) {
                    newXp -= newXpToNext;
                    newLevel++;
                    newXpToNext = calculateXpToNextLevel(newLevel);
                    newStatPoints += 3; // +3 pontos por level

                    levelUps.push({
                        name: grant.name,
                        newLevel,
                        statPoints: 3
                    });
                }

                await prisma.characterRoomStats.update({
                    where: { id: stats.id },
                    data: {
                        xp: newXp,
                        level: newLevel,
                        xpToNextLevel: newXpToNext,
                        statPoints: newStatPoints
                    }
                });
            }
        }

        return NextResponse.json({
            success: true,
            xpGranted: xpGrants,
            levelUps,
            totalXp: xpReward
        });

    } catch (e) {
        console.error("Erro ao conceder XP:", e);
        return NextResponse.json({ error: "Erro ao conceder XP" }, { status: 500 });
    }
}
