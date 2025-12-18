import { NextResponse } from "next/server";
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { prisma } from "@/lib/prisma";

// POST /api/encounters/create-manual
export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    try {
        const { roomId, name, monsters, addPlayers } = await request.json();

        if (!roomId || !name || !monsters || monsters.length === 0) {
            return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
        }

        // Verificar se o usuário é GM da sala
        const room = await prisma.room.findUnique({
            where: { id: roomId },
            include: { characterRooms: { include: { character: true, roomStats: true } } }
        });

        if (!room || room.gmUserId !== session.userId) {
            return NextResponse.json({ error: "Permissão negada" }, { status: 403 });
        }

        // Buscar templates dos monstros
        const templateIds = monsters.map((m: any) => m.templateId);
        const templates = await (prisma as any).monsterTemplate.findMany({
            where: { id: { in: templateIds } }
        });

        // Criar participantes NPCs
        const npcParticipants = [];
        for (const monsterSelection of monsters) {
            const template = templates.find((t: any) => t.id === monsterSelection.templateId);
            if (!template) continue;

            for (let i = 0; i < monsterSelection.count; i++) {
                // Rolar iniciativa: d20
                const initiativeRoll = Math.floor(Math.random() * 20) + 1;

                npcParticipants.push({
                    name: `${template.name} ${i + 1}`,
                    hp: template.hp,
                    maxHp: template.hp,
                    mana: template.mana || 0,
                    maxMana: template.mana || 0,
                    initiative: initiativeRoll,
                    isNPC: true,
                    statusEffects: []
                });
            }
        }

        // Adicionar jogadores se solicitado
        const playerParticipants = addPlayers ? room.characterRooms.map(cr => {
            // Rolar iniciativa: d20 + modificador de destreza
            const dexMod = cr.roomStats ? Math.floor((cr.roomStats.destreza - 10) / 2) : 0;
            const initiativeRoll = Math.floor(Math.random() * 20) + 1 + dexMod;

            return {
                name: cr.character.name,
                hp: cr.roomStats ? cr.roomStats.hp : 25,
                maxHp: cr.roomStats ? cr.roomStats.hp : 25,
                mana: cr.roomStats ? cr.roomStats.mana : 12,
                maxMana: cr.roomStats ? cr.roomStats.mana : 12,
                initiative: initiativeRoll,
                isNPC: false,
                statusEffects: []
            };
        }) : [];

        // Criar encontro
        const encounter = await prisma.encounter.create({
            data: {
                roomId,
                name,
                isActive: false,
                participants: {
                    create: [...npcParticipants, ...playerParticipants]
                }
            },
            include: { participants: true }
        });

        console.log(`⚔️ Encontro manual criado: ${name} com ${npcParticipants.length} NPCs e ${playerParticipants.length} jogadores`);

        return NextResponse.json({ encounter });

    } catch (e) {
        console.error("Erro ao criar encontro manual:", e);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
