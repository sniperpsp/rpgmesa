const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
    try {
        console.log('🔍 Testando conexão com o banco...');
        console.log('DATABASE_URL:', process.env.DATABASE_URL);

        // Tenta executar uma query simples
        const result = await prisma.$queryRaw`SELECT current_database(), current_schema()`;
        console.log('✅ Conectado ao banco:', result);

        // Lista as tabelas
        const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
        console.log('📋 Tabelas encontradas:', tables);

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();
