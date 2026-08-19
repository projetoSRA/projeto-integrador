# SRA - Sistema de Registro de Atividades

Desenvolvimento da matéria Projeto Integrador.

## Tecnologias

- **Backend**: Node.js, TypeScript, Express, Supabase (PostgreSQL)
- **Frontend**: React, Vite, Tailwind CSS

## Estrutura do projeto

```
backend/    API em Node/TypeScript
frontend/   Aplicação em React/Vite
```

## Como rodar

### Pré-requisitos

- Node.js 18+
- Uma conta e projeto no [Supabase](https://supabase.com)

### Backend

```bash
cd backend
cp .env.example .env   # preencha com suas credenciais do Supabase
npm install
npm run dev
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### Com Docker

O backend também pode ser executado via Docker Compose:

```bash
docker compose up
```

Para mais detalhes, veja [centralSRA_como_rodar.docx](./centralSRA_como_rodar.docx).
