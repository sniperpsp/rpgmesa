import { NextResponse } from "next/server";
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    try {
        const [
            classes,
            races,
            abilities,
            weapons,
            items,
            monsters
        ] = await Promise.all([
            prisma.classTemplate.count(),
            prisma.raceTemplate.count(),
            prisma.abilityTemplate.count(),
            prisma.weaponTemplate.count(),
            prisma.itemTemplate.count(),
            prisma.monsterTemplate.count(),
        ]);

        return NextResponse.json({
            classes,
            races,
            abilities,
            weapons,
            items,
            monsters
        });
    } catch (e) {
        console.error("Erro ao buscar contagem de templates:", e);
        return NextResponse.json({
            classes: 0, races: 0, abilities: 0, weapons: 0, items: 0, monsters: 0
        });
    }
}
