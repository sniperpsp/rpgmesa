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
}

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    try {
        const { encounterId, attackerId, targetId, attackType } = await request.json();

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

        if (!encounter || encounter.room.gmUserId !== session.userId) {
            return NextResponse.json({ error: "Permissão negada" }, { status: 403 });
        }

        const attacker = encounter.participants.find(p => p.id === attackerId);
        const target = encounter.participants.find(p => p.id === targetId);

        if (!attacker || !target) {
            return NextResponse.json({ error: "Participante não encontrado" }, { status: 404 });
        }

        // Buscar stats do atacante se for jogador
        let attackerStats = { forca: 3, destreza: 3, defesa: 3 };
        if (!attacker.isNPC) {
            const charRoom = encounter.room.characterRooms.find(cr => cr.character.name === attacker.name);
            if (charRoom?.roomStats) {
                attackerStats = {
                    forca: charRoom.roomStats.forca,
                    destreza: charRoom.roomStats.destreza,
                    defesa: charRoom.roomStats.defesa
                };
            }
        }

        // Buscar stats do alvo se for jogador
        let targetStats = { defesa: 10 };
        if (!target.isNPC) {
            const charRoom = encounter.room.characterRooms.find(cr => cr.character.name === target.name);
            if (charRoom?.roomStats) {
                targetStats = { defesa: charRoom.roomStats.defesa };
            }
        }

        // Rolagem de ataque (d20)
        const attackRoll = Math.floor(Math.random() * 20) + 1;
        const isCritical = attackRoll === 20;
        const isCriticalFail = attackRoll === 1;

        // Bônus de ataque baseado no tipo
        const attackBonus = attackType === 'melee' ? attackerStats.forca : attackerStats.destreza;
        const totalAttack = attackRoll + attackBonus;

        // Defesa do alvo (base 10 + bônus de defesa)
        const targetDefense = 10 + targetStats.defesa;

        // Verificar acerto
        const hit = isCriticalFail ? false : (isCritical || totalAttack >= targetDefense);

        let damage = 0;
        let newHp = target.hp;

        if (hit) {
            // Dano = Força ou Destreza do atacante
            damage = attackBonus;

            // Crítico = dano dobrado
            if (isCritical) {
                damage *= 2;
            }

            // Aplicar dano
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

            // Se o NPC morreu (HP <= 0), distribuir XP
            if (newHp <= 0 && target.isNPC) {
                const npcLevel = (target as any).level || 1;
                const xpReward = (target as any).xpReward || npcLevel * npcLevel * 10;

                // Calcular XP proporcional para cada jogador que causou dano
                const totalDamage = Object.values(damageReceived).reduce((sum: number, d: any) => sum + d, 0) as number;

                for (const [charRoomId, dmg] of Object.entries(damageReceived)) {
                    const proportion = (dmg as number) / totalDamage;
                    const xpGrant = Math.floor(xpReward * proportion);

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
                    }
                }
            }
        }

        const result: AttackResult = {
            attackerId: attacker.id,
            attackerName: attacker.name,
            targetId: target.id,
            targetName: target.name,
            attackRoll,
            attackBonus,
            totalAttack,
            targetDefense,
            hit,
            critical: isCritical,
            damage,
            remainingHp: newHp
        };

        // Registrar no log de eventos
        await prisma.eventsLog.create({
            data: {
                roomId: encounter.roomId,
                action: 'combat_attack',
                payload: result as any
            }
        });

        return NextResponse.json({ result });

    } catch (e) {
        console.error("Erro ao processar ataque:", e);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
