import { NextResponse } from "next/server";
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { prisma } from "@/lib/prisma";

// GET /api/rooms/[code]
export async function GET(
    request: Request,
    { params }: { params: Promise<{ code: string }> }
) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    try {
        const { code } = await params;

        // Buscar a sala pelo código
        const room = await prisma.room.findUnique({
            where: { joinCode: code.toUpperCase() },
            include: {
                gm: {
                    select: {
                        id: true,
                        displayName: true,
                        email: true,
                    }
                },
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                displayName: true,
                                email: true,
                            }
                        }
                    }
                },
                characterRooms: {
                    include: {
                        character: {
                            select: {
                                id: true,
                                name: true,
                                class: true,
                                race: true,
                                avatarUrl: true,
                                ownerUserId: true,
                            }
                        },
                        roomStats: true,
                        roomAbilities: true,
                    }
                },
                encounters: {
                    where: {
                        isActive: true
                    },
                    include: {
                        participants: true
                    }
                },
                stories: {
                    include: {
                        acts: {
                            include: {
                                scenes: true
                            }
                        }
                    }
                },
                events: {
                    include: {
                        actor: {
                            select: {
                                id: true,
                                displayName: true,
                                email: true,
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 50 // Últimos 50 eventos
                }
            }
        });

        if (!room) {
            return NextResponse.json({ error: "Sala não encontrada" }, { status: 404 });
        }

        // Verificar se o usuário é membro da sala
        const isMember = room.members.some(m => m.userId === session.userId);

        if (!isMember) {
            return NextResponse.json({ error: "Você não é membro desta sala" }, { status: 403 });
        }

        // Adicionar informação do papel do usuário
        const userRole = room.gmUserId === session.userId ? 'gm' : 'player';
        const userCharacters = room.characterRooms.filter(
            cr => cr.character.ownerUserId === session.userId
        );

        return NextResponse.json({
            room: {
                ...room,
                userRole,
                userCharacters
            }
        }, { status: 200 });
    } catch (e) {
        console.error("Erro ao buscar sala:", e);
        return NextResponse.json({ error: "Erro ao buscar sala" }, { status: 500 });
    }
}

// DELETE /api/rooms/[code]
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ code: string }> }
) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    try {
        const { code } = await params;

        // Buscar a sala
        const room = await prisma.room.findUnique({
            where: { joinCode: code.toUpperCase() }
        });

        if (!room) {
            return NextResponse.json({ error: "Sala não encontrada" }, { status: 404 });
        }

        // Verificar se o usuário é o GM
        if (room.gmUserId !== session.userId) {
            return NextResponse.json({ error: "Apenas o GM pode deletar a sala" }, { status: 403 });
        }

        // Deletar a sala (cascade vai deletar tudo relacionado)
        await prisma.room.delete({
            where: { id: room.id }
        });

        return NextResponse.json({ message: "Sala deletada com sucesso" }, { status: 200 });
    } catch (e) {
        console.error("Erro ao deletar sala:", e);
        return NextResponse.json({ error: "Erro ao deletar sala" }, { status: 500 });
    }
}

// PATCH /api/rooms/[code]
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ code: string }> }
) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    try {
        const { code } = await params;
        const { name, rules, diceSystem } = await request.json();

        // Buscar a sala
        const room = await prisma.room.findUnique({
            where: { joinCode: code.toUpperCase() }
        });

        if (!room) {
            return NextResponse.json({ error: "Sala não encontrada" }, { status: 404 });
        }

        // Verificar se o usuário é o GM
        if (room.gmUserId !== session.userId) {
            return NextResponse.json({ error: "Apenas o GM pode editar a sala" }, { status: 403 });
        }

        // Atualizar a sala
        const updatedRoom = await prisma.room.update({
            where: { id: room.id },
            data: {
                name: name || room.name,
                rules: rules !== undefined ? rules : room.rules,
                diceSystem: diceSystem || room.diceSystem,
            },
            include: {
                gm: {
                    select: {
                        id: true,
                        displayName: true,
                        email: true,
                    }
                },
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                displayName: true,
                                email: true,
                            }
                        }
                    }
                }
            }
        });

        return NextResponse.json({ room: updatedRoom }, { status: 200 });
    } catch (e) {
        console.error("Erro ao atualizar sala:", e);
        return NextResponse.json({ error: "Erro ao atualizar sala" }, { status: 500 });
    }
}
