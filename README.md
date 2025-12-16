# 🎲 RPG Mesa - Sistema de RPG de Mesa Digital

Sistema completo de gerenciamento de RPG de mesa com IA, combate tático e storytelling dinâmico.

## 🚀 Funcionalidades Principais

### 👤 Sistema de Usuários e Autenticação
- ✅ Registro e login com email/senha
- ✅ Sessões seguras com Iron Session
- ✅ Sistema de permissões (GM/Jogador/Admin)
- ✅ Perfis de usuário personalizáveis

### 🎭 Criação e Gerenciamento de Personagens
- ✅ Sistema de classes e raças
- ✅ Atributos customizáveis (Força, Destreza, Inteligência, Defesa, Velocidade)
- ✅ **Multiplicadores de HP/Mana por classe** (aleatórios e únicos)
  - Guerreiros: Alta vida, baixa mana
  - Magos: Baixa vida, alta mana
  - Classes híbridas: Valores balanceados
- ✅ Sistema de habilidades e magias
- ✅ Upload de avatar
- ✅ Cálculo automático de atributos baseado em raça/classe

### 🏰 Salas de Jogo
- ✅ Criação de salas com código único
- ✅ Sistema de convite por código
- ✅ Seleção de sistema de dados (D20, 2d6, 3d6)
- ✅ GM pode editar/excluir suas salas
- ✅ Múltiplos jogadores por sala

### 📖 Sistema de História com IA (Mistral AI)

#### Geração Dinâmica de Campanhas
- ✅ **Criação incremental ato por ato**
- ✅ IA gera apenas o primeiro ato inicialmente
- ✅ GM pode gerar próximos atos baseado nas ações dos jogadores
- ✅ Campo de "Acontecimentos" para registrar eventos
- ✅ IA adapta a história baseada no que aconteceu

#### Sugestões Inteligentes
- ✅ **Encontros sugeridos** com monstros específicos
  - Nome, quantidade e stats básicos
  - Botão "Importar para Encontros"
- ✅ **Puzzles e desafios** com soluções
- ✅ Integração automática com sistema de combate

#### Geração de Imagens (Pollinations AI)
- ✅ Botão "🎨 Arte" em cada cena
- ✅ Geração de imagens baseada no contexto da cena
- ✅ Armazenamento de URLs no banco de dados

### ⚔️ Sistema de Combate Completo

#### Mecânica D20
- ✅ **Rolagem de ataque**: d20 + Bônus (Força ou Destreza)
- ✅ **Cálculo de acerto**: Total ≥ (10 + Defesa do alvo)
- ✅ **Críticos**: Rolar 20 natural = Dano dobrado
- ✅ **Falha crítica**: Rolar 1 natural = Erro automático
- ✅ **Dano**: Atributo + d6 (dobrado em crítico)

#### Interface de Combate
- ✅ Ativar/Desativar encontros (apenas 1 ativo por vez)
- ✅ Botão "⚔️ Atacar" em cada participante
- ✅ Modal de seleção de alvo
- ✅ Escolha entre ataque corpo a corpo (Força) ou à distância (Destreza)
- ✅ **Log de combate em tempo real**
  - Mostra rolagens, bônus e resultados
  - Indica acertos, erros e críticos
  - Exibe dano causado e HP restante

#### Gerenciamento de Encontros
- ✅ Criação manual ou importação da história
- ✅ Adição automática de jogadores ao encontro
- ✅ HP/Mana editáveis em tempo real
- ✅ Sistema de iniciativa
- ✅ Diferenciação visual entre NPCs e Jogadores

### 🔮 Sistema de Status Effects
- ✅ Adicionar efeitos em participantes (Envenenado, Atordoado, etc.)
- ✅ Duração em turnos
- ✅ Descrição do efeito
- ✅ Visualização de efeitos ativos

### 🎲 Sistema de Dados
- ✅ Rolador de dados integrado
- ✅ Suporte a D4, D6, D8, D10, D12, D20, D100
- ✅ Filtro por sistema de dados da sala
- ✅ Histórico de rolagens
- ✅ Animações visuais

### 👑 Painel do Game Master

#### Visão Geral
- ✅ Estatísticas da sala
- ✅ Lista de membros
- ✅ Resumo de encontros ativos

#### Gerenciamento de Personagens
- ✅ Visualização de todos os personagens na sala
- ✅ **Edição de HP/Mana** dos jogadores
- ✅ Visualização de atributos e stats
- ✅ HP/Mana calculados com multiplicadores individuais

#### Controle de Encontros
- ✅ Criar encontros manualmente ou da história
- ✅ Ativar/desativar encontros
- ✅ Gerenciar HP/Mana de todos os participantes
- ✅ Adicionar status effects
- ✅ Sistema de combate tático

#### Storytelling
- ✅ Visualização da campanha completa
- ✅ Atos organizados sequencialmente
- ✅ Cenas com imagens geradas por IA
- ✅ Registro de acontecimentos por ato
- ✅ Geração incremental de próximos atos

### 🎮 Visão do Jogador
- ✅ Visualização de personagem
- ✅ HP/Mana sincronizados com o GM
- ✅ Sistema de dados
- ✅ Visualização de habilidades

### 🛠️ Sistema de Templates (Admin)
- ✅ Gerenciamento de classes globais
- ✅ Gerenciamento de raças globais
- ✅ Gerenciamento de armas
- ✅ Gerenciamento de itens
- ✅ Gerenciamento de monstros
- ✅ Apenas admins podem criar/editar/deletar
- ✅ Filtros por tipo de história/grupo

## 🎯 Multiplicadores de HP/Mana por Classe

### Sistema Dinâmico
Cada personagem recebe multiplicadores **aleatórios** dentro do range da sua classe:

| Classe | HP (min-max) | Mana (min-max) |
|--------|--------------|----------------|
| **Guerreiro** | 3.0 - 3.5 | 1.0 - 1.5 |
| **Bárbaro** | 3.2 - 3.8 | 0.8 - 1.2 |
| **Paladino** | 2.8 - 3.2 | 2.0 - 2.5 |
| **Clérigo** | 2.5 - 3.0 | 2.5 - 3.0 |
| **Druida** | 2.3 - 2.8 | 2.5 - 3.0 |
| **Ranger** | 2.2 - 2.7 | 1.5 - 2.0 |
| **Bardo** | 2.0 - 2.5 | 2.2 - 2.7 |
| **Ladino** | 2.0 - 2.5 | 1.2 - 1.7 |
| **Monge** | 2.2 - 2.7 | 1.8 - 2.3 |
| **Mago** | 1.5 - 2.0 | 3.0 - 3.5 |
| **Feiticeiro** | 1.5 - 2.0 | 3.2 - 3.8 |
| **Bruxo** | 1.8 - 2.3 | 2.8 - 3.3 |
| **Padrão** | 2.0 - 2.5 | 2.0 - 2.5 |

### Exemplo Prático
- **Guerreiro com 10 pontos de HP**:
  - Multiplicador gerado: 3.24
  - HP real: 10 × 3.24 = **32 HP**
- **Mago com 10 pontos de HP**:
  - Multiplicador gerado: 1.73
  - HP real: 10 × 1.73 = **17 HP**

## 🏗️ Tecnologias Utilizadas

### Backend
- **Next.js 15** - Framework React com App Router
- **Prisma** - ORM para PostgreSQL
- **Iron Session** - Autenticação segura
- **PostgreSQL** - Banco de dados

### Frontend
- **React 18** - Interface do usuário
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização

### IA e APIs
- **Mistral AI** - Geração de histórias, atos, cenas e sugestões
- **Pollinations AI** - Geração de imagens para cenas

## 📁 Estrutura do Projeto

```
rpgmesa/
├── prisma/
│   └── schema.prisma          # Schema do banco de dados
├── src/
│   ├── app/
│   │   ├── api/              # Rotas da API
│   │   │   ├── auth/         # Autenticação
│   │   │   ├── characters/   # Personagens
│   │   │   ├── rooms/        # Salas
│   │   │   ├── stories/      # Histórias e atos
│   │   │   ├── encounters/   # Encontros
│   │   │   ├── combat/       # Sistema de combate
│   │   │   └── templates/    # Templates globais
│   │   ├── characters/       # Página de personagens
│   │   ├── lobby/            # Lobby de salas
│   │   ├── room/[code]/      # Sala de jogo
│   │   │   ├── gm/          # Interface do GM
│   │   │   └── player/      # Interface do jogador
│   │   └── templates/        # Gerenciamento de templates
│   ├── components/           # Componentes React
│   └── lib/                  # Utilitários
│       ├── session.ts        # Configuração de sessão
│       ├── prisma.ts         # Cliente Prisma
│       └── classMultipliers.ts # Multiplicadores por classe
└── public/                   # Arquivos estáticos
```

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+
- PostgreSQL
- Conta Mistral AI (para histórias)

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/sniperpsp/rpgmesa.git
cd rpgmesa
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente (`.env`):
```env
DATABASE_URL="postgresql://user:password@host:port/database"
SESSION_SECRET="sua-chave-secreta-aqui"
MISTRAL_API_KEY="sua-chave-mistral-aqui"
```

4. Execute as migrações do banco:
```bash
npx prisma db push
npx prisma generate
```

5. (Opcional) Crie um usuário admin:
```bash
node scripts/make-admin.js seu-email@exemplo.com
```

6. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

7. Acesse: `http://localhost:3000`

## 🎮 Fluxo de Uso

### Para o Game Master

1. **Criar Sala**
   - Acesse o Lobby
   - Clique em "Nova Sala"
   - Escolha nome e sistema de dados
   - Compartilhe o código com os jogadores

2. **Criar Campanha**
   - Entre na sala como GM
   - Vá para aba "História (IA)"
   - Clique em "Nova Campanha"
   - Descreva o tema (ex: "Explorar ruínas antigas")
   - IA gera o Ato 1 com encontros e puzzles sugeridos

3. **Importar Encontro**
   - Veja o combate sugerido no ato
   - Clique em "Importar para Encontros"
   - Escolha se quer adicionar os jogadores automaticamente

4. **Iniciar Combate**
   - Vá para aba "Encontros"
   - Clique em "▶️ Ativar" no encontro desejado
   - Clique em "⚔️ Atacar" em um participante
   - Escolha o tipo de ataque e o alvo
   - Veja o resultado no log de combate

5. **Registrar Acontecimentos**
   - Durante/após o ato, anote o que aconteceu
   - Clique em "💾 Salvar Acontecimentos"

6. **Gerar Próximo Ato**
   - Clique em "➕ Gerar Próximo Ato"
   - Descreva o que os jogadores fizeram
   - IA cria o próximo ato baseado nas ações

### Para o Jogador

1. **Criar Personagem**
   - Acesse "Meus Personagens"
   - Clique em "Novo Personagem"
   - Escolha classe, raça e distribua pontos
   - Multiplicadores são gerados automaticamente

2. **Entrar na Sala**
   - Digite o código da sala
   - Selecione seu personagem
   - Entre como jogador

3. **Jogar**
   - Veja seu HP/Mana em tempo real
   - Use o rolador de dados
   - Acompanhe a história

## 🔐 Permissões

### Jogador
- Criar e gerenciar seus próprios personagens
- Entrar em salas com código
- Rolar dados
- Ver história ativa

### Game Master (GM)
- Todas as permissões de jogador
- Criar e gerenciar salas
- Editar HP/Mana dos jogadores
- Criar e gerenciar encontros
- Gerar histórias com IA
- Controlar combates

### Administrador
- Todas as permissões de GM
- Criar/editar/deletar templates globais
- Gerenciar classes, raças, armas, itens e monstros

## 📊 Banco de Dados

### Modelos Principais
- **User** - Usuários do sistema
- **Character** - Personagens criados
- **CharacterStats** - Atributos e multiplicadores
- **Room** - Salas de jogo
- **CharacterRoom** - Relação personagem-sala
- **Story** - Campanhas
- **Act** - Atos da história
- **Scene** - Cenas dos atos
- **Encounter** - Encontros de combate
- **EncounterParticipant** - Participantes (jogadores e NPCs)
- **Templates** - Classes, raças, armas, itens, monstros

## 🎨 Design e UX

- Interface dark mode premium
- Gradientes e glassmorphism
- Animações suaves
- Responsivo (mobile-friendly)
- Feedback visual em todas as ações
- Log de combate em tempo real
- Modais intuitivos

## 🔮 Próximas Funcionalidades

- [ ] Sistema de inventário
- [ ] Marketplace de itens
- [ ] Chat em tempo real
- [ ] Sistema de níveis e XP
- [ ] Árvore de habilidades
- [ ] Mapas interativos
- [ ] Música ambiente
- [ ] Suporte a vídeo/voz
- [ ] Modo espectador
- [ ] Replay de combates

## 📝 Licença

Este projeto é de código aberto sob a licença MIT.

## 👥 Contribuindo

Contribuições são bem-vindas! Por favor:
1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 🐛 Reportar Bugs

Encontrou um bug? Abra uma issue no GitHub com:
- Descrição do problema
- Passos para reproduzir
- Comportamento esperado vs atual
- Screenshots (se aplicável)

## 📧 Contato

- GitHub: [@sniperpsp](https://github.com/sniperpsp)
- Projeto: [RPG Mesa](https://github.com/sniperpsp/rpgmesa)

---

**Desenvolvido com ❤️ para a comunidade de RPG de mesa**
