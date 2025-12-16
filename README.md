# RPG Mesa

Sistema de gerenciamento de mesas de RPG com IA integrada.

## 🚀 Status da Recriação

### ✅ Concluído
- [x] Schema do Prisma com todos os models
- [x] Configuração do Prisma Client
- [x] Configuração de sessão (Iron Session)
- [x] Componente LoadingSpinner
- [x] Estilos globais customizados
- [x] Página inicial (Home)
- [x] Dependências instaladas

### 📋 Próximos Passos (em ordem)

1. **APIs de Autenticação**
   - `/api/auth/login` - Login de usuários
   - `/api/auth/register` - Registro de usuários
   - `/api/auth/logout` - Logout

2. **Páginas de Autenticação**
   - `/login` - Página de login
   - `/register` - Página de registro

3. **APIs de Personagens**
   - `/api/characters` - CRUD de personagens
   - `/api/characters/[id]` - Detalhes/edição

4. **Páginas de Personagens**
   - `/characters` - Lista de personagens
   - `/characters/[id]/edit` - Edição

5. **APIs de Salas**
   - `/api/rooms/create` - Criar sala
   - `/api/rooms/join` - Entrar em sala
   - `/api/rooms/mine` - Minhas salas
   - `/api/rooms/[code]/me` - Dados do jogador na sala

6. **Páginas de Salas**
   - `/lobby` - Lobby principal
   - `/room/[code]/gm` - Visão do Mestre
   - `/room/[code]/player` - Visão do Jogador

7. **Sistema de Templates**
   - `/api/templates/classes` - Templates de classes
   - `/api/templates/races` - Templates de raças
   - `/api/templates/abilities` - Templates de habilidades
   - `/templates` - Página de gerenciamento

8. **Integração com IA**
   - `/api/ai/generate-avatar` - Gerar avatar com IA
   - `/api/ai/ability-suggest` - Sugerir habilidades

## 🔧 Configuração

### 1. Variáveis de Ambiente

Copie o arquivo `env.example` para `.env` e preencha:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/rpgmesa"
MISTRAL_API_KEY="sua_chave_aqui"
SESSION_SECRET="minimo_32_caracteres_aleatorios"
IMGUR_CLIENT_ID="opcional"
```

### 2. Banco de Dados

```bash
# Criar/atualizar o banco
npx prisma migrate dev --name init

# Ou apenas aplicar o schema
npx prisma db push
```

### 3. Rodar o Projeto

```bash
npm run dev
```

## 📦 Tecnologias

- **Next.js 15** - Framework React
- **Prisma** - ORM para PostgreSQL
- **Iron Session** - Gerenciamento de sessões
- **Bcrypt** - Hash de senhas
- **Tailwind CSS** - Estilização
- **Mistral AI** - Geração de avatares e sugestões

## 🎮 Funcionalidades Principais

- ✅ Sistema de autenticação completo
- ✅ Criação de personagens com stats customizáveis
- ✅ Geração de avatares com IA
- ✅ Sistema de salas (GM e Jogadores)
- ✅ Templates reutilizáveis (Classes, Raças, Habilidades)
- ✅ Auto-criação de templates ao criar personagens
- ✅ Interface mobile-first para jogadores
- ✅ Multiplicadores de HP/Mana (estilo Diablo)
- ✅ Limite de 3 habilidades por jogador
- ✅ Sistema de encontros e combate

## 📱 Design

- Interface moderna com glassmorphism
- Gradientes e animações suaves
- Responsivo (mobile-first)
- Dark mode por padrão
