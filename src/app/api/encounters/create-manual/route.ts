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

                // Calcular Scaling de Level
                // Se o usuário definiu um level específico, usa ele. Se não, usa o do template.
                const baseLevel = template.level || 1;
                const targetLevel = monsterSelection.level ? parseInt(monsterSelection.level) : baseLevel;

                // Fator de crescimento: 20% (0.2) por level de diferença
                // Se Target = 2 e Base = 1, diferença = 1 -> Aumento de 20%
                const levelDiff = Math.max(0, targetLevel - baseLevel);
                const scalingFactor = 1 + (levelDiff * 0.20);

                const finalHp = Math.floor(template.hp * scalingFactor);
                const finalMana = Math.floor((template.mana || 0) * scalingFactor);

                // Escalar atributos
                const finalForca = Math.floor((template.forca || 0) * scalingFactor);
                const finalDestreza = Math.floor((template.destreza || 0) * scalingFactor);
                const finalInteligencia = Math.floor((template.inteligencia || 0) * scalingFactor);
                const finalDefesa = Math.floor((template.defense || 0) * scalingFactor);
                const finalVelocidade = Math.floor((template.velocidade || 0) * scalingFactor);

                // Calcular XP Reward baseada no nível final
                const xpReward = targetLevel * targetLevel * 10;

                npcParticipants.push({
                    name: `${template.name} ${i + 1}`,
                    hp: finalHp,
                    maxHp: finalHp,
                    mana: finalMana,
                    maxMana: finalMana,
                    initiative: initiativeRoll,
                    isNPC: true,
                    statusEffects: [],
                    // CRÍTICO: Usar o level alvo para cálculo de XP
                    level: targetLevel,
                    // Stats Escalados
                    forca: finalForca,
                    destreza: finalDestreza,
                    inteligencia: finalInteligencia,
                    defesa: finalDefesa,
                    velocidade: finalVelocidade,
                    xpReward: xpReward // Salvar XP no banco
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
