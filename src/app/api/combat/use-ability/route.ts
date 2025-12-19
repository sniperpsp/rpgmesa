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

// POST /api/combat/use-ability - Usa uma habilidade em combate
export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    try {
        const { encounterId, userId, abilityId, targetId } = await request.json();

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

        const caster = encounter.participants.find(p => p.id === userId);
        const target = encounter.participants.find(p => p.id === targetId);

        if (!caster || !target) {
            return NextResponse.json({ error: "Participante não encontrado" }, { status: 404 });
        }

        // Buscar habilidade
        const ability = await prisma.characterRoomAbility.findUnique({
            where: { id: abilityId }
        });

        if (!ability) {
            return NextResponse.json({ error: "Habilidade não encontrada" }, { status: 404 });
        }

        // Verificar mana
        if (caster.mana < ability.manaCost) {
            return NextResponse.json({ error: "Mana insuficiente" }, { status: 400 });
        }

        // Rolar dados
        const diceCount = ability.diceCount || 1;
        const diceType = ability.diceType || 6;
        const diceRoll = rollDice(diceCount, diceType);

        // Calcular modificador baseado no stat
        let statModifier = 0;
        if (ability.scalingStat) {
            const casterCharRoom = encounter.room.characterRooms.find(
                cr => cr.character.name === caster.name
            );
            if (casterCharRoom?.roomStats) {
                statModifier = (casterCharRoom.roomStats as any)[ability.scalingStat] || 0;
            }
        }

        const totalValue = diceRoll.total + statModifier + (ability.baseDamage || 0);

        let result: any = {
            abilityName: ability.name,
            casterName: caster.name,
            targetName: target.name,
            diceRolls: diceRoll.rolls,
            diceTotal: diceRoll.total,
            modifier: statModifier,
            baseDamage: ability.baseDamage || 0,
            totalValue,
            effectType: ability.effectType
        };

        // Aplicar efeito baseado no effectType (NOVO SISTEMA)
        switch (ability.effectType) {
            case 'DAMAGE':
                const newHp = Math.max(0, target.hp - totalValue);
                await prisma.encounterParticipant.update({
                    where: { id: targetId },
                    data: { hp: newHp }
                });
                result.newHp = newHp;
                result.damage = totalValue;
                break;

            case 'HEAL':
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
                const activeEffects = (target as any).activeEffects || [];
                const newEffect = {
                    name: ability.name,
                    type: ability.effectType,
                    stat: ability.targetStat,
                    value: ability.effectValue,
                    turnsRemaining: ability.duration || 1,
                    sourceId: userId,
                    sourceName: caster.name
                };
                activeEffects.push(newEffect);

                await prisma.encounterParticipant.update({
                    where: { id: targetId },
                    data: { activeEffects }
                });

                result.effectApplied = newEffect;
                break;

            default:
                // Sem effectType definido - não faz nada
                result.message = "Habilidade sem efeito configurado (effectType)";
                break;
        }

        // Consumir mana
        await prisma.encounterParticipant.update({
            where: { id: userId },
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

        return NextResponse.json({ success: true, result });

    } catch (e) {
        console.error("Erro ao usar habilidade:", e);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
