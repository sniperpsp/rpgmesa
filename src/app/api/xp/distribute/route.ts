import { NextResponse } from "next/server";
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { prisma } from "@/lib/prisma";

// Atributos que podem receber pontos
const VALID_STATS = ['forca', 'destreza', 'inteligencia', 'defesa', 'velocidade', 'hp', 'mana'];

// POST /api/xp/distribute - Distribuir pontos de atributo
export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    try {
        const { characterRoomId, stat, points = 1 } = await request.json();

        if (!VALID_STATS.includes(stat)) {
            return NextResponse.json({ error: "Atributo inválido" }, { status: 400 });
        }

        if (points < 1) {
            return NextResponse.json({ error: "Pontos devem ser positivos" }, { status: 400 });
        }

        // Buscar stats do personagem
        const stats = await prisma.characterRoomStats.findFirst({
            where: { characterRoomId },
            include: {
                characterRoom: {
                    include: {
                        character: true
                    }
                }
            }
        });

        if (!stats) {
            return NextResponse.json({ error: "Personagem não encontrado" }, { status: 404 });
        }

        // Verificar se pertence ao usuário
        if (stats.characterRoom.character.ownerUserId !== session.userId) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
        }

        // Verificar se tem pontos suficientes
        if (stats.statPoints < points) {
            return NextResponse.json({ error: "Pontos insuficientes" }, { status: 400 });
        }

        // Preparar update
        const updateData: Record<string, number> = {
            statPoints: stats.statPoints - points
        };

        // Adicionar ao atributo escolhido
        // Para HP e Mana, aumentamos o valor base
        if (stat === 'hp') {
            updateData.hp = stats.hp + (points * 5); // +5 HP por ponto
        } else if (stat === 'mana') {
            updateData.mana = stats.mana + (points * 3); // +3 Mana por ponto
        } else {
            updateData[stat] = (stats as any)[stat] + points;
        }

        // Aplicar update
        const updated = await prisma.characterRoomStats.update({
            where: { id: stats.id },
            data: updateData
        });

        return NextResponse.json({
            success: true,
            stat,
            pointsSpent: points,
            remainingPoints: updated.statPoints,
            newValue: stat === 'hp' ? updated.hp : stat === 'mana' ? updated.mana : (updated as any)[stat]
        });

    } catch (e) {
        console.error("Erro ao distribuir pontos:", e);
        return NextResponse.json({ error: "Erro ao distribuir pontos" }, { status: 500 });
    }
}
