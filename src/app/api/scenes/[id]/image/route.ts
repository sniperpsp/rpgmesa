
import { NextResponse } from "next/server";
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: { id: string } }) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const sceneId = params.id;

    try {
        const scene = await prisma.scene.findUnique({
            where: { id: sceneId },
            include: { act: { include: { story: { include: { room: true } } } } }
        });

        if (!scene) {
            return NextResponse.json({ error: "Cena não encontrada" }, { status: 404 });
        }

        // Verificar permissão (GM)
        if (scene.act.story.room.gmUserId !== session.userId) {
            return NextResponse.json({ error: "Permissão negada" }, { status: 403 });
        }

        // Gerar Imagem com Pollinations
        // Usar descrição da cena + contexto
        const prompt = `Fantasy RPG Scene: ${scene.act.title} - ${scene.content}. High fantasy art style, detailed, atmospheric.`;
        const seed = Math.floor(Math.random() * 1000000);
        const imageUrl = `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=768&height=512&seed=${seed}&model=flux`;

        // Atualizar cena
        const updatedScene = await prisma.scene.update({
            where: { id: sceneId },
            data: { imageUrl }
        });

        return NextResponse.json({ imageUrl });

    } catch (e) {
        console.error("Erro ao gerar imagem da cena:", e);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
