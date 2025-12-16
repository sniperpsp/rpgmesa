import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
    try {
        console.log('📝 [REGISTER] Iniciando registro...');
        const body = await req.json();
        const { email, password, displayName } = body || {};
        console.log('📧 [REGISTER] Email:', email);
        console.log('🔑 [REGISTER] Senha (length):', password?.length);
        console.log('👤 [REGISTER] Nome:', displayName);

        if (!email || !password) {
            console.log('❌ [REGISTER] Email ou senha vazios');
            return NextResponse.json({ error: "Email e senha são obrigatórios" }, { status: 400 });
        }

        console.log('🔍 [REGISTER] Verificando se email já existe...');
        const exists = await prisma.user.findUnique({ where: { email } });

        if (exists) {
            console.log('❌ [REGISTER] Email já registrado:', email);
            return NextResponse.json({ error: "Email já registrado" }, { status: 409 });
        }

        console.log('🔐 [REGISTER] Gerando hash da senha...');
        const hash = await bcrypt.hash(password, 10);
        console.log('✅ [REGISTER] Hash gerado:', hash.substring(0, 20) + '...');

        console.log('💾 [REGISTER] Criando usuário no banco...');
        const user = await prisma.user.create({
            data: {
                email,
                passwordHash: hash,
                displayName: displayName ?? null,
            },
            select: { id: true, email: true, displayName: true },
        });
        console.log('✅ [REGISTER] Usuário criado com sucesso:', user.id);

        return NextResponse.json({ user }, { status: 201 });
    } catch (err) {
        console.error("💥 [REGISTER] ERRO:", err);
        return NextResponse.json({ error: "Erro ao registrar" }, { status: 500 });
    }
}
