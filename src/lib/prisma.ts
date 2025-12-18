import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

// Configuração do Prisma com logging e pool de conexões
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['error'],
    // Configurações de performance
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
});

// Evitar múltiplas instâncias em development
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

// Graceful shutdown - fechar conexões ao encerrar
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});
