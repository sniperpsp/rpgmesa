import { NextResponse } from "next/server";
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { prisma } from "@/lib/prisma";

// Rola dados (XdY)
function rollDice(count: number, sides: number): { rolls: number[], total: number } {
    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
        rolls.push(Math.floor(Math.random() * sides) + 1);
    }
    return {
        rolls,
        total: rolls.reduce((sum, roll) => sum + roll, 0)
    };
}

// POST /api/abilities/use - Usa uma habilidade
export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    try {
        const {
            abilityId,
            casterId,      // ID do participante que está usando
            targetId,      // ID do participante alvo
            encounterId,
            diceCount,     // Quantidade de dados (do UI)
            modifier,      // Modificador (do UI)
            // Dados do ataque (do frontend)
            attackRoll,    // Resultado do d20
            hit,           // Se acertou
            isCritical     // Se foi crítico
        } = await request.json();

        // Buscar habilidade
        const ability = await prisma.characterRoomAbility.findUnique({
            where: { id: abilityId }
        });

        if (!ability) {
            return NextResponse.json({ error: "Habilidade não encontrada" }, { status: 404 });
        }

        // Buscar encontro e participantes
        const encounter = await prisma.encounter.findUnique({
            where: { id: encounterId },
            include: {
                participants: true,
                room: {
                    include: {
                        characterRooms: {
                            include: {
                                roomStats: true,
                                character: true
                            }
                        }
                    }
                }
            }
        });

        if (!encounter) {
            return NextResponse.json({ error: "Encontro não encontrado" }, { status: 404 });
        }

        const caster = encounter.participants.find(p => p.id === casterId);
        const target = encounter.participants.find(p => p.id === targetId);

        if (!caster || !target) {
            return NextResponse.json({ error: "Participante não encontrado" }, { status: 404 });
        }

        // Verificar mana
        if (caster.mana < ability.manaCost) {
            return NextResponse.json({ error: "Mana insuficiente" }, { status: 400 });
        }

        // Rolar dados (usa valores do UI ou da habilidade)
        const finalDiceCount = diceCount || ability.diceCount || 1;
        const diceRoll = rollDice(finalDiceCount, ability.diceType || 6);

        // Calcular modificador baseado no stat
        let statModifier = modifier || 0;
        if (ability.scalingStat && !modifier) {
            const casterCharRoom = encounter.room.characterRooms.find(
                cr => cr.character.name === caster.name
            );
            if (casterCharRoom?.roomStats) {
                statModifier = (casterCharRoom.roomStats as any)[ability.scalingStat] || 0;
            }
        }

        // Calcular dano total
        let totalValue = diceRoll.total + statModifier + (ability.baseDamage || 0);

        // CRÍTICO: Dobrar dano em acerto crítico
        if (isCritical) {
            console.log('🎯 CRÍTICO! Dobrando dano:', { antes: totalValue, depois: totalValue * 2 });
            totalValue *= 2;
        }

        let result: any = {
            abilityName: ability.name,
            casterName: caster.name,
            targetName: target.name,
            diceRolls: diceRoll.rolls,
            diceTotal: diceRoll.total,
            modifier: statModifier,
            baseDamage: ability.baseDamage || 0,
            totalValue,
            effectType: ability.effectType,
            attackRoll,
            hit,
            isCritical
        };

        // Aplicar efeito baseado no tipo
        switch (ability.effectType) {
            case 'DAMAGE':
                // CRÍTICO: Só causar dano se acertou
                if (!hit) {
                    console.log('❌ Ataque errou! Sem dano.');
                    result.damage = 0;
                    result.newHp = target.hp;
                    break;
                }

                const newHp = Math.max(0, target.hp - totalValue);

                // Rastrear dano causado para XP proporcional
                let damageReceived = (target as any).damageReceived || {};
                if (!caster.isNPC) {
                    const casterCharRoom = encounter.room.characterRooms.find(
                        cr => cr.character.name === caster.name
                    );
                    if (casterCharRoom) {
                        damageReceived[casterCharRoom.id] = (damageReceived[casterCharRoom.id] || 0) + totalValue;
                    }
                }

                await prisma.encounterParticipant.update({
                    where: { id: targetId },
                    data: {
                        hp: newHp,
                        damageReceived: damageReceived
                    }
                });

                result.newHp = newHp;
                result.damage = totalValue;

                console.log('💥 Dano aplicado (Habilidade):', { targetName: target.name, damage: totalValue, oldHp: target.hp, newHp, hit, isCritical });

                // Se matou NPC, distribuir XP
                if (newHp <= 0 && target.isNPC) {
                    const npcLevel = (target as any).level || 1;
                    const xpReward = (target as any).xpReward || npcLevel * npcLevel * 10;

                    console.log('💀 NPC morreu! (Habilidade) Distribuindo XP:', { npcName: target.name, xpReward, damageReceived });

                    const totalDamage = Object.values(damageReceived).reduce((sum: number, d: any) => sum + d, 0) as number;

                    for (const [charRoomId, dmg] of Object.entries(damageReceived)) {
                        const proportion = (dmg as number) / totalDamage;
                        const xpGrant = Math.floor(xpReward * proportion);

                        console.log('🎯 Distribuindo XP (Habilidade):', { charRoomId, dmg, proportion, xpGrant });

                        const playerStats = await prisma.characterRoomStats.findFirst({
                            where: { characterRoomId: charRoomId }
                        });

                        if (playerStats && xpGrant > 0) {
                            let newXp = playerStats.xp + xpGrant;
                            let newLevel = playerStats.level;
                            let newXpToNext = playerStats.xpToNextLevel;
                            let newStatPoints = playerStats.statPoints;

                            while (newXp >= newXpToNext) {
                                newXp -= newXpToNext;
                                newLevel++;
                                newXpToNext = newLevel * newLevel * 100;
                                newStatPoints += 3;
                                console.log('🎉 LEVEL UP! (Habilidade)', { oldLevel: playerStats.level, newLevel, statPoints: newStatPoints });
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

                            console.log('✅ XP aplicado (Habilidade):', { newXp, newLevel, newStatPoints });
                        }
                    }
                }
                break;

            case 'HEAL':
                // Curar
                const healedHp = Math.min(target.maxHp, target.hp + totalValue);
                await prisma.encounterParticipant.update({
                    where: { id: targetId },
                    data: { hp: healedHp }
                });
                result.newHp = healedHp;
                result.healing = totalValue;
                break;

            case 'BUFF':
            case 'DEBUFF':
                // Aplicar buff/debuff
                const activeEffects = (target as any).activeEffects || [];
                const newEffect = {
                    name: ability.name,
                    type: ability.effectType,
                    stat: ability.targetStat,
                    value: ability.effectValue,
                    turnsRemaining: ability.duration || 1,
                    sourceId: casterId,
                    sourceName: caster.name
                };
                activeEffects.push(newEffect);

                await prisma.encounterParticipant.update({
                    where: { id: targetId },
                    data: { activeEffects }
                });

                result.effectApplied = newEffect;
                break;
        }

        // Consumir mana
        await prisma.encounterParticipant.update({
            where: { id: casterId },
            data: { mana: caster.mana - ability.manaCost }
        });

        // Registrar no log
        await prisma.eventsLog.create({
            data: {
                roomId: encounter.roomId,
                action: 'ability_used',
                payload: result as any
            }
        });

        return NextResponse.json({ result });

    } catch (e) {
        console.error("Erro ao usar habilidade:", e);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
