import { NextResponse } from "next/server";
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { prisma } from "@/lib/prisma";

// Tipos de templates suportados
const TEMPLATE_TYPES = {
    classes: 'classTemplate',
    races: 'raceTemplate',
    abilities: 'abilityTemplate',
    weapons: 'weaponTemplate',
    items: 'itemTemplate',
    monsters: 'monsterTemplate',
} as const;

async function checkAdmin(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        // @ts-ignore
        select: { isAdmin: true }
    });
    // @ts-ignore
    return user?.isAdmin === true;
}

// GET /api/templates/[type] - Listar templates
export async function GET(
    request: Request,
    { params }: { params: Promise<{ type: string }> }
) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    try {
        const { type } = await params;
        const modelName = TEMPLATE_TYPES[type as keyof typeof TEMPLATE_TYPES];

        if (!modelName) {
            return NextResponse.json({ error: "Tipo de template inválido" }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const storyType = searchParams.get('storyType');

        const templates = await (prisma as any)[modelName].findMany({
            where: {
                ...(storyType ? { storyType } : {})
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        displayName: true,
                        email: true,
                    }
                }
            },
            orderBy: [
                { isGlobal: 'desc' },
                { name: 'asc' }
            ]
        });

        return NextResponse.json({ [type]: templates }, { status: 200 });
    } catch (e) {
        console.error("Erro ao buscar templates:", e);
        return NextResponse.json({ error: "Erro ao buscar templates" }, { status: 500 });
    }
}

// POST /api/templates/[type] - Criar template
export async function POST(
    request: Request,
    { params }: { params: Promise<{ type: string }> }
) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    try {
        if (!await checkAdmin(session.userId)) {
            return NextResponse.json({ error: "Apenas administradores podem criar templates" }, { status: 403 });
        }

        const { type } = await params;
        const modelName = TEMPLATE_TYPES[type as keyof typeof TEMPLATE_TYPES];

        if (!modelName) {
            return NextResponse.json({ error: "Tipo de template inválido" }, { status: 400 });
        }

        const body = await request.json();
        const { name, ...rest } = body;

        if (!name) {
            return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
        }

        // Gerar slug único
        const slug = name.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        // Verificar se slug já existe
        const existing = await (prisma as any)[modelName].findUnique({
            where: { slug }
        });

        if (existing) {
            return NextResponse.json({ error: "Já existe um template com este nome" }, { status: 400 });
        }

        const template = await (prisma as any)[modelName].create({
            data: {
                name,
                slug,
                ownerUserId: session.userId,
                isGlobal: true, // Admin sempre cria global
                ...rest
            }
        });

        return NextResponse.json({ template }, { status: 201 });
    } catch (e) {
        console.error("Erro ao criar template:", e);
        return NextResponse.json({ error: "Erro ao criar template" }, { status: 500 });
    }
}

// DELETE /api/templates/[type] - Deletar template
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ type: string }> }
) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    try {
        if (!await checkAdmin(session.userId)) {
            return NextResponse.json({ error: "Apenas administradores podem deletar templates" }, { status: 403 });
        }

        const { type } = await params;
        const body = await request.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: "ID não fornecido" }, { status: 400 });
        }

        const modelName = TEMPLATE_TYPES[type as keyof typeof TEMPLATE_TYPES];

        if (!modelName) {
            return NextResponse.json({ error: "Tipo de template inválido" }, { status: 400 });
        }

        await (prisma as any)[modelName].delete({
            where: { id }
        });

        return NextResponse.json({ message: "Template deletado com sucesso" }, { status: 200 });
    } catch (e) {
        console.error("Erro ao deletar template:", e);
        return NextResponse.json({ error: "Erro ao deletar template" }, { status: 500 });
    }
}

// PATCH /api/templates/[type] - Editar template
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ type: string }> }
) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    try {
        if (!await checkAdmin(session.userId)) {
            return NextResponse.json({ error: "Apenas administradores podem editar templates" }, { status: 403 });
        }

        const { type } = await params;
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json({ error: "ID não fornecido" }, { status: 400 });
        }

        const modelName = TEMPLATE_TYPES[type as keyof typeof TEMPLATE_TYPES];

        if (!modelName) {
            return NextResponse.json({ error: "Tipo de template inválido" }, { status: 400 });
        }

        // Remover campos que não devem ser editados
        delete updateData.slug;
        delete updateData.ownerUserId;
        delete updateData.createdAt;
        delete updateData.updatedAt;
        delete updateData.owner; // Remover objeto de relacionamento
        delete updateData.isGlobal; // Manter original ou forçar via admin, mas não pelo body direto

        // Se o admin quiser mudar o isGlobal, ele deve passar explicitamente, mas vamos garantir isGlobal=true
        // updateData.isGlobal = true; // Opcional, o admin decide se quer mudar. Mas vamos proteger.

        // Admin pode editar qualquer template e forçar isGlobal se quiser (embora já seja padrão)
        const updatedTemplate = await (prisma as any)[modelName].update({
            where: { id },
            data: updateData
        });

        return NextResponse.json({ template: updatedTemplate }, { status: 200 });
    } catch (e) {
        console.error("Erro ao editar template:", e);
        return NextResponse.json({ error: "Erro ao editar template" }, { status: 500 });
    }
}
