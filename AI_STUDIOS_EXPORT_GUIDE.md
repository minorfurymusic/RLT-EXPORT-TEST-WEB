# Como Exportar o RLT para Google AI Studios

Este guia explica como baixar o código do GitHub e importá-lo no Google AI Studios para desenvolvimento.

---

## Opção 1: Download Direto do GitHub

### Passo 1: Acesse o Repositório

1. Abra o navegador e acesse:
   ```
   https://github.com/jeanrsl098/RLT---Real-Life-Track-1.2
   ```

2. Selecione o branch `feature/brain-orchestrator` (onde estão as últimas alterações):
   - Clique no botão dropdown "main" no topo da página
   - Selecione "feature/brain-orchestrator"

### Passo 2: Baixe o Código

1. Clique no botão verde **"Code"**
2. Clique em **"Download ZIP"**
3. Extraia o arquivo ZIP em uma pasta de sua escolha

### Passo 3: Abra no AI Studios

1. Abra o [Google AI Studios](https://aistudio.google.com)
2. Clique em **"Import Project"** ou arraste a pasta extraída
3. O projeto será importado como um projeto de desenvolvimento web

---

## Opção 2: Clone via Git (Recomendado para Desenvolvedores)

### Pré-requisitos
- Git instalado no computador
- Node.js 18+ instalado

### Passo 1: Clone o Repositório

```bash
git clone https://github.com/jeanrsl098/RLT---Real-Life-Track-1.2.git
cd RLT---Real-Life-Track-1.2
git checkout feature/brain-orchestrator
```

### Passo 2: Instale as Dependências

```bash
npm install
```

### Passo 3: Configure a API Key do Gemini

1. Crie um arquivo `.env` na raiz do projeto:
   ```bash
   cp .env.example .env
   ```

2. Edite o arquivo `.env` e adicione sua API key:
   ```env
   GEMINI_API_KEY=sua_chave_aqui
   ```

3. Obtenha uma API key em: [Google AI Studio](https://aistudio.google.com/app/apikey)

### Passo 4: Execute o Projeto

```bash
npm run dev
```

O projeto estará disponível em `http://localhost:3000`

### Passo 5: Build para Produção

```bash
npm run build
npm run preview
```

---

## Estrutura do Projeto

```
RLT---Real-Life-Track-1.2/
├── src/
│   ├── components/          # Componentes React
│   │   ├── AIAssistant.tsx    # Cérebro do RLT (chatbot/agente)
│   │   ├── Home.tsx          # Dashboard principal
│   │   ├── Calendar.tsx      # Agenda unificada
│   │   ├── Nutrition.tsx     # Nutrição
│   │   ├── Exercises.tsx     # Exercícios
│   │   ├── WaterTracking.tsx  # Rastreamento de água
│   │   └── StepCounter.tsx    # Contador de passos
│   ├── context/
│   │   └── HealthContext.tsx  # Estado global (Base Central)
│   ├── services/
│   │   ├── brainOrchestrator.ts  # Motor de comandos NL
│   │   └── aiMedicalService.ts    # Processamento de exames
│   ├── hooks/
│   │   ├── useStepCounter.ts       # Rastreamento de passos
│   │   └── useStepServiceWorker.ts # Service Worker
│   └── types.ts              # Definições TypeScript
├── public/
│   └── step-counter-sw.js    # Service Worker para passos
├── AUDIT_REPORT_v2.md       # Relatório de auditoria
├── PROJECT_REPORT.md         # Documentação do projeto
└── AI_STUDIOS_EXPORT_GUIDE.md # Este arquivo
```

---

## Principais Funcionalidades

### 🤖 Cérebro (BrainOrchestrator)
- Processamento de comandos em linguagem natural
- Suporte a: água, exercícios, exames, consultas, medicamentos, peso, altura, tema
- Fallback para API Gemini para comandos complexos

### 👟 Contador de Passos
- Rastreamento via acelerômetro
- Service Worker para tracking em background
- Interface visual com progresso

### 📊 Base Central (HealthContext)
- Estado global da aplicação
- Persistência via localStorage
- Gerenciamento de todos os domínios de saúde

---

## Como Usar o Cérebro

O Cérebro pode processar comandos como:

```
"Bebi 750ml de água"
"Fiz supino reto com 40kg, 12 reps, 4 séries"
"Registrei um hemograma, hemoglobina 14.2, dia 15/07"
"Marca consulta com cardiologista pro dia 12/08 às 15h30"
"Comecei a tomar Losartana 50mg, 1x/dia, a partir de 15/07"
"Meu peso mudou para 75kg"
"Muda pro modo escuro"
"Quanto de água bebi hoje?"
"Quais exames tenho cadastrados?"
```

---

## Configuração no AI Studios

### Variáveis de Ambiente Necessárias

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `GEMINI_API_KEY` | Chave da API Gemini | Sim |

### Pacotes npm Principais

```json
{
  "dependencies": {
    "@google/genai": "^0.x.x",
    "react": "^18.x.x",
    "react-dom": "^18.x.x",
    "motion": "^11.x.x"
  },
  "devDependencies": {
    "vite": "^6.x.x",
    "typescript": "^5.x.x",
    "tailwindcss": "^3.x.x"
  }
}
```

---

## Troubleshooting

### Erro de API Key

```
Error: GEMINI_API_KEY is not set
```

**Solução:** Configure a variável de ambiente `.env` com uma chave válida.

### Erro de Módulos

```
Module not found: Error: Can't resolve...
```

**Solução:** Execute `npm install` para instalar todas as dependências.

### Erro de TypeScript

```
Type error: Cannot find name...
```

**Solução:** Execute `npx tsc --noEmit` para ver os erros e corrija-os.

---

## Suporte

Para dúvidas ou problemas:
1. Abra uma issue no GitHub: https://github.com/jeanrsl098/RLT---Real-Life-Track-1.2/issues
2. Consulte o AUDIT_REPORT_v2.md para detalhes técnicos
3. Consulte o PROJECT_REPORT.md para documentação completa

---

*Guia criado em 2026-07-26*
