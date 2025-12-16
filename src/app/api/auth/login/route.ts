import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

export async function POST(request: Request) {
    try {
        console.log('🔐 [LOGIN] Iniciando processo de login...');
        const { email, password } = await request.json();
        console.log('📧 [LOGIN] Email recebido:', email);
        console.log('🔑 [LOGIN] Senha recebida (length):', password?.length);

        if (!email || !password) {
            console.log('❌ [LOGIN] Email ou senha vazios');
            return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
        }

        console.log('🔍 [LOGIN] Buscando usuário no banco...');
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            console.log('❌ [LOGIN] Usuário não encontrado:', email);
            return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
        }

        console.log('✅ [LOGIN] Usuário encontrado:', user.id);
        console.log('🔐 [LOGIN] Hash no banco:', user.passwordHash?.substring(0, 20) + '...');

        if (!user.passwordHash) {
            console.log('❌ [LOGIN] Usuário sem hash de senha');
            return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
        }

        console.log('🔐 [LOGIN] Comparando senha com bcrypt...');
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        console.log('🔐 [LOGIN] Senha válida?', isPasswordValid);

        if (!isPasswordValid) {
            console.log('❌ [LOGIN] Senha incorreta');
            return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
        }

        console.log('✅ [LOGIN] Senha correta! Criando sessão...');
        const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
        session.userId = user.id;
        session.isLoggedIn = true;
        session.user = {
            id: user.id,
            email: user.email,
            name: user.displayName ?? user.email,
        };
        await session.save();
        console.log('✅ [LOGIN] Sessão criada com sucesso!');

        const { passwordHash, ...userWithoutPassword } = user;

        return NextResponse.json({ user: userWithoutPassword });

    } catch (error) {
        console.error('💥 [LOGIN] ERRO:', error);
        return NextResponse.json({ error: 'Erro ao fazer login' }, { status: 500 });
    }
}
