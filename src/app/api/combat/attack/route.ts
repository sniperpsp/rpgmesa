import { NextResponse } from "next/server";
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { prisma } from "@/lib/prisma";

interface AttackResult {
    attackerId: string;
    attackerName: string;
    targetId: string;
    targetName: string;
    attackRoll: number;
    attackBonus: number;
    totalAttack: number;
    targetDefense: number;
    hit: boolean;
    critical: boolean;
    damage: number;

    remainingHp: number;
    xpGained?: number;
}

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    try {
        const { encounterId, attackerId, targetId, attackType, attackRoll, hit, damage, isCritical } = await request.json();

        console.log('🎯 Ataque recebido:', { encounterId, attackerId, targetId, attackType, attackRoll, hit, damage });

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

        const attacker = encounter.participants.find(p => p.id === attackerId);
        const target = encounter.participants.find(p => p.id === targetId);

        if (!attacker || !target) {
            return NextResponse.json({ error: "Participante não encontrado" }, { status: 404 });
        }

        let xpGainedByAttacker = 0;

        let newHp = target.hp;
        let finalDamage = 0;

        // Aplicar dano se acertou
        if (hit && damage > 0) {
            finalDamage = damage;
            newHp = Math.max(0, target.hp - damage);

            // Rastrear dano recebido (para distribuição de XP proporcional)
            let damageReceived = (target as any).damageReceived || {};
            if (!attacker.isNPC) {
                // Encontrar o characterRoomId do atacante
                const attackerCharRoom = encounter.room.characterRooms.find(
                    cr => cr.character.name === attacker.name
                );
                if (attackerCharRoom) {
                    const attackerKey = attackerCharRoom.id;
                    damageReceived[attackerKey] = (damageReceived[attackerKey] || 0) + damage;
                }
            }

            await prisma.encounterParticipant.update({
                where: { id: targetId },
                data: {
                    hp: newHp,
                    damageReceived: damageReceived
                }
            });

            console.log('💥 Dano aplicado:', { targetName: target.name, damage, oldHp: target.hp, newHp });

            // Se o NPC morreu (HP <= 0), distribuir XP
            if (newHp <= 0 && target.isNPC) {
                const npcLevel = (target as any).level || 1;
                // FORÇAR CÁLCULO: Ignorar valor do banco se possível, para garantir consistência com UI
                // O valor do banco (xpReward) pode ser 10 (default), então recalculamos.
                const xpReward = npcLevel * npcLevel * 10;


                console.log('💀 NPC morreu! Distribuindo XP:', { npcName: target.name, xpReward, damageReceived });

                // Calcular XP proporcional para cada jogador que causou dano
                const totalDamage = Object.values(damageReceived).reduce((sum: number, d: any) => sum + d, 0) as number;

                // Encontrar o CharRoomId do atacante a partir do nome
                const attackerCharRoom = encounter.room.characterRooms.find(cr => cr.character.name === attacker.name);
                const attackerCharRoomId = attackerCharRoom?.id;

                for (const [charRoomId, dmg] of Object.entries(damageReceived)) {
                    const proportion = (dmg as number) / totalDamage;
                    const xpGrant = Math.floor(xpReward * proportion);

                    if (charRoomId === attackerCharRoomId) {
                        xpGainedByAttacker = xpGrant;
                    }

                    console.log('🎯 Distribuindo XP:', { charRoomId, dmg, proportion, xpGrant });

                    // Buscar stats do jogador e aplicar XP
                    const playerStats = await prisma.characterRoomStats.findFirst({
                        where: { characterRoomId: charRoomId }
                    });

                    if (playerStats && xpGrant > 0) {
                        let newXp = playerStats.xp + xpGrant;
                        let newLevel = playerStats.level;
                        let newXpToNext = playerStats.xpToNextLevel;
                        let newStatPoints = playerStats.statPoints;

                        // Check for level up
                        while (newXp >= newXpToNext) {
                            newXp -= newXpToNext;
                            newLevel++;
                            newXpToNext = newLevel * newLevel * 100;
                            newStatPoints += 3;
                            console.log('🎉 LEVEL UP!', { oldLevel: playerStats.level, newLevel, statPoints: newStatPoints });
                        }

                        await prisma.characterRoomStats.update({
                            where: { id: playerStats.id },
                            data: {
                                xp: newXp,
                                level: newLevel,
                                xpToNextLevel: newXpToNext,
                                statPoints: newStatPoints
                            }
                        });

                        console.log('✅ XP aplicado:', { newXp, newLevel, newStatPoints });
                    }
                }
            }
        }

        const result: AttackResult = {
            attackerId: attacker.id,
            attackerName: attacker.name,
            targetId: target.id,
            targetName: target.name,
            attackRoll: attackRoll || 0,
            attackBonus: 0,
            totalAttack: 0,
            targetDefense: 0,
            hit: hit || false,
            critical: isCritical || false,
            damage: finalDamage,
            remainingHp: newHp,
            xpGained: xpGainedByAttacker
        };

        // Registrar no log de eventos
        await prisma.eventsLog.create({
            data: {
                roomId: encounter.roomId,
                action: 'combat_attack',
                payload: result as any
            }
        });

        console.log('✅ Retornando resultado:', result);

        return NextResponse.json({ result });

    } catch (e) {
        console.error("❌ Erro ao processar ataque:", e);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
