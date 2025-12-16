import { NextResponse } from "next/server";
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { prisma } from "@/lib/prisma";

// GET /api/characters/[id]
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const character = await prisma.character.findFirst({
        where: { id, ownerUserId: session.userId },
        include: { stats: true, abilities: true, rooms: true },
    });

    if (!character) {
        return NextResponse.json({ error: "Personagem não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ character });
}

// PUT /api/characters/[id]
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, class: charClass, race, notes, avatarUrl } = body;

    const character = await prisma.character.updateMany({
        where: { id, ownerUserId: session.userId },
        data: {
            ...(name && { name }),
            ...(charClass !== undefined && { class: charClass }),
            ...(race !== undefined && { race }),
            ...(notes !== undefined && { notes }),
            ...(avatarUrl !== undefined && { avatarUrl }),
        },
    });

    if (character.count === 0) {
        return NextResponse.json({ error: "Personagem não encontrado" }, { status: 404 });
    }

    const updated = await prisma.character.findUnique({
        where: { id },
        include: { stats: true, abilities: true },
    });

    return NextResponse.json({ character: updated });
}

// DELETE /api/characters/[id]
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const deleted = await prisma.character.deleteMany({
        where: { id, ownerUserId: session.userId },
    });

    if (deleted.count === 0) {
        return NextResponse.json({ error: "Personagem não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
}
