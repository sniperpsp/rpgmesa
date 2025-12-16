const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const email = 'djavasilva@yahoo.com.br';

    console.log(`Buscando usuário: ${email}...`);

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        console.error('Usuário não encontrado!');
        return;
    }

    console.log(`Atualizando usuário ${user.id} para Admin...`);

    await prisma.user.update({
        where: { id: user.id },
        data: { isAdmin: true },
    });

    console.log('✅ Sucesso! O usuário agora é um Administrador.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
