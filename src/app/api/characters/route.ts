import { NextResponse } from "next/server";
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { prisma } from "@/lib/prisma";

// GET /api/characters -> lista personagens do usuário
export async function GET(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const userId = session.userId;
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");

    const characters = await prisma.character.findMany({
        where: {
            ownerUserId: userId,
            ...(roomId ? { rooms: { some: { roomId } } } : {}),
        },
        include: { stats: true, abilities: true, rooms: true },
        orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ characters });
}

// POST /api/characters -> cria personagem do usuário
export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const userId = session.userId;

    try {
        const body = await request.json();
        const { name, class: charClass, race, notes, withStats, avatarUrl } = body || {};
        if (!name) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });

        // Auto-criar templates se classe/raça não existir
        if (charClass) {
            const classExists = await (prisma as any).classTemplate.findFirst({
                where: {
                    slug: charClass.toLowerCase().trim().replace(/\s+/g, '-')
                }
            });

            if (!classExists) {
                console.log(`🎨 [AUTO-TEMPLATE] Criando template de classe: ${charClass}`);
                await (prisma as any).classTemplate.create({
                    data: {
                        name: charClass,
                        slug: charClass.toLowerCase().trim().replace(/\s+/g, '-'),
                        description: `Classe criada automaticamente: ${charClass}`,
                        isGlobal: false,
                        ownerUserId: userId,
                        baseHp: 12,
                        baseMana: 5,
                        baseForca: 3,
                        baseDestreza: 3,
                        baseInteligencia: 3,
                        baseDefesa: 3,
                        baseVelocidade: 3,
                    }
                }).catch((e: any) => console.error('Erro ao criar template de classe:', e));
            }
        }

        if (race) {
            const raceExists = await (prisma as any).raceTemplate.findFirst({
                where: {
                    slug: race.toLowerCase().trim().replace(/\s+/g, '-')
                }
            });

            if (!raceExists) {
                console.log(`🎨 [AUTO-TEMPLATE] Criando template de raça: ${race}`);
                await (prisma as any).raceTemplate.create({
                    data: {
                        name: race,
                        slug: race.toLowerCase().trim().replace(/\s+/g, '-'),
                        description: `Raça criada automaticamente: ${race}`,
                        isGlobal: false,
                        ownerUserId: userId,
                        modHp: 0,
                        modMana: 0,
                        modForca: 0,
                        modDestreza: 0,
                        modInteligencia: 0,
                        modDefesa: 0,
                        modVelocidade: 0,
                    }
                }).catch((e: any) => console.error('Erro ao criar template de raça:', e));
            }
        }

        const character = await prisma.character.create({
            data: {
                ownerUserId: userId,
                name,
                class: charClass ?? null,
                race: race ?? null,
                notes: notes ?? null,
                avatarUrl: avatarUrl ?? null,
                ...(withStats ? { stats: { create: {} } } : {}),
            },
            include: { stats: true, abilities: true },
        });

        return NextResponse.json({ character }, { status: 201 });
    } catch (e) {
        console.error("/api/characters POST", e);
        return NextResponse.json({ error: "Erro ao criar personagem" }, { status: 500 });
    }
}
