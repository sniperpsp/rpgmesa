import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const { encounterId, userId, abilityId, targetId } = await request.json();

        // Buscar encontro
        const encounter = await prisma.encounter.findUnique({
            where: { id: encounterId },
            include: { participants: true }
        });

        if (!encounter) {
            return NextResponse.json({ error: "Encontro não encontrado" }, { status: 404 });
        }

        // Buscar usuário (quem está usando a habilidade)
        const userParticipant = encounter.participants.find(p => p.id === userId);
        if (!userParticipant) {
            return NextResponse.json({ error: "Participante não encontrado" }, { status: 404 });
        }

        // Buscar alvo
        const target = encounter.participants.find(p => p.id === targetId);
        if (!target) {
            return NextResponse.json({ error: "Alvo não encontrado" }, { status: 404 });
        }

        // Buscar habilidade
        const ability = await prisma.characterRoomAbility.findUnique({
            where: { id: abilityId }
        });

        if (!ability) {
            return NextResponse.json({ error: "Habilidade não encontrada" }, { status: 404 });
        }

        // Verificar mana
        if (userParticipant.mana < ability.manaCost) {
            return NextResponse.json({ error: "Mana insuficiente" }, { status: 400 });
        }

        // Consumir mana
        const newMana = Math.max(0, userParticipant.mana - ability.manaCost);
        await prisma.encounterParticipant.update({
            where: { id: userId },
            data: { mana: newMana }
        });

        let message = "";
        let newHp = target.hp;
        let newManaTarget = target.mana;

        // Aplicar efeito baseado no tipo
        switch (ability.abilityType) {
            case 'attack':
                // Dano baseado na inteligência do usuário
                const damage = Math.floor(Math.random() * 6) + 1 + (userParticipant.inteligencia || 3);
                newHp = Math.max(0, target.hp - damage);
                message = `${userParticipant.name} usou ${ability.name} e causou ${damage} de dano em ${target.name}!`;
                break;

            case 'heal':
                // Cura baseada na inteligência
                const healing = Math.floor(Math.random() * 8) + 1 + (userParticipant.inteligencia || 3);
                newHp = Math.min(target.maxHp, target.hp + healing);
                message = `${userParticipant.name} usou ${ability.name} e curou ${healing} HP de ${target.name}!`;
                break;

            case 'buff':
                // Buff temporário (pode ser implementado com status effects no futuro)
                message = `${userParticipant.name} usou ${ability.name} em ${target.name}! ${ability.description || 'Efeito aplicado!'}`;
                break;

            case 'debuff':
                // Debuff temporário
                message = `${userParticipant.name} usou ${ability.name} em ${target.name}! ${ability.description || 'Efeito aplicado!'}`;
                break;

            case 'protection':
                // Proteção temporária
                message = `${userParticipant.name} usou ${ability.name} em ${target.name}! ${ability.description || 'Proteção ativada!'}`;
                break;

            default:
                // Efeito genérico
                message = `${userParticipant.name} usou ${ability.name} em ${target.name}!`;
        }

        // Atualizar HP do alvo se mudou
        if (newHp !== target.hp) {
            await prisma.encounterParticipant.update({
                where: { id: targetId },
                data: { hp: newHp }
            });
        }

        // Criar log de combate
        await prisma.eventsLog.create({
            data: {
                roomId: encounter.roomId,
                action: 'combat_log',
                payload: {
                    encounterId,
                    message,
                    type: ability.abilityType || 'ability'
                }
            }
        });

        return NextResponse.json({
            success: true,
            message,
            result: {
                abilityName: ability.name,
                user: userParticipant.name,
                target: target.name,
                newUserMana: newMana,
                newTargetHp: newHp
            }
        });

    } catch (e) {
        console.error("Erro ao usar habilidade:", e);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
