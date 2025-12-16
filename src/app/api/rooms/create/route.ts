import { NextResponse } from "next/server";
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { prisma } from "@/lib/prisma";

function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// POST /api/rooms/create
export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    try {
        const { name } = await request.json();
        const joinCode = generateCode();

        const room = await prisma.room.create({
            data: {
                name: name || "Nova Sala",
                joinCode,
                gmUserId: session.userId,
                members: {
                    create: {
                        userId: session.userId,
                        role: "gm",
                    },
                },
            },
        });

        return NextResponse.json({ room }, { status: 201 });
    } catch (e) {
        console.error("Erro ao criar sala:", e);
        return NextResponse.json({ error: "Erro ao criar sala" }, { status: 500 });
    }
}
