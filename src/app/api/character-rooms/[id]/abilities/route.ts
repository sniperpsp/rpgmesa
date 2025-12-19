import { NextResponse } from "next/server";
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { prisma } from "@/lib/prisma";

// POST /api/character-rooms/[id]/abilities - Criar habilidade para personagem
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id: characterRoomId } = await params;

    try {
        const body = await request.json();
        const {
            name,
            description,
            manaCost,
            effectType,
            baseDamage,
            diceCount,
            diceType,
            scalingStat,
            targetStat,
            effectValue,
            duration,
            rarity,
            school,
            color
        } = body;

        // Criar habilidade
        const ability = await prisma.characterRoomAbility.create({
            data: {
                characterRoomId,
                name,
                description,
                manaCost: manaCost || 0,
                effectType,
                baseDamage: baseDamage || 0,
                diceCount: diceCount || 1,
                diceType: diceType || 6,
                scalingStat,
                targetStat,
                effectValue,
                duration,
                rarity,
                school,
                color
            }
        });

        console.log('✅ Habilidade criada:', ability.name);

        return NextResponse.json({ ability });

    } catch (e) {
        console.error('Erro ao criar habilidade:', e);
        return NextResponse.json({ error: "Erro ao criar habilidade" }, { status: 500 });
    }
}
