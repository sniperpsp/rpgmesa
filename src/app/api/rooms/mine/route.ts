import { NextResponse } from "next/server";
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { prisma } from "@/lib/prisma";

// GET /api/rooms/mine
export async function GET() {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    try {
        // Buscar todas as salas onde o usuário é membro
        const rooms = await prisma.room.findMany({
            where: {
                members: {
                    some: {
                        userId: session.userId
                    }
                }
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
                        }
                    }
                },
                _count: {
                    select: {
                        members: true,
                        characterRooms: true,
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        // Adicionar informação se o usuário é GM em cada sala
        const roomsWithRole = rooms.map(room => ({
            ...room,
            userRole: room.gmUserId === session.userId ? 'gm' : 'player',
            userCharacters: room.characterRooms.filter(
                cr => cr.character.ownerUserId === session.userId
            )
        }));

        return NextResponse.json({ rooms: roomsWithRole }, { status: 200 });
    } catch (e) {
        console.error("Erro ao buscar salas:", e);
        return NextResponse.json({ error: "Erro ao buscar salas" }, { status: 500 });
    }
}
