# Correções aplicadas — Projeto SRA (ProjetoSRAC)

**Data:** 26/08/2026
Este documento acompanha o `PENTEST_REPORT.md` e registra, achado por achado, o que foi corrigido diretamente no código (nesta pasta, na sua máquina) e o que ainda exige uma ação manual sua (rotação de credenciais, configuração no painel do Supabase, etc.), que eu não tenho como fazer por aqui.

Nenhuma dependência nova foi instalada (o ambiente onde rodei a correção não tinha acesso à internet) — todas as mitigações abaixo foram escritas com as bibliotecas que o projeto já usa, ou sem depender de bibliotecas externas.

## Status por achado

| Achado | Status | O que mudou |
|---|---|---|
| **C1** — Nenhuma rota protegida (Broken Access Control) | ✅ Corrigido | Middleware de autenticação (`backend/src/middleware/auth.ts`) validando o JWT em **todas** as rotas, exceto `/auth/login`. Cada rota agora também confere posse do recurso (ex.: um aluno só acessa os próprios certificados; uma empresa só gerencia os próprios eventos) usando o id que vem do **token**, nunca do que o cliente envia na URL ou no corpo da requisição. |
| **C2** — Credenciais reais em texto puro, sem `.gitignore` | ⚠️ Parcialmente mitigado — **ação sua necessária** | Criei `.gitignore` (raiz, protegendo `backend/.env` e `frontend/.env`) e arquivos `.env.example` com placeholders. **Isso não invalida as credenciais que já estavam expostas.** Você precisa rotacionar manualmente no painel do Supabase: a senha do Postgres, a `service_role key` e gerar um novo `JWT_SECRET`. |
| **C3** — Senha podia ser validada/guardada em texto puro | ✅ Corrigido (migração automática) | O login continua aceitando os formatos antigos (SHA-256 sem sal e texto puro) só para não travar contas existentes, mas agora, assim que o login funciona com um desses formatos, a senha é **automaticamente re-hasheada em bcrypt** no banco (`backend/src/routes/auth.routes.ts`). Depois de todo mundo logar pelo menos uma vez, nenhuma senha em texto puro/SHA-256 restará no banco. |
| **C4** — Segredo de JWT com fallback fraco hardcoded | ✅ Corrigido | `backend/src/config/env.ts` valida as variáveis obrigatórias (`JWT_SECRET`, `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) na inicialização — se alguma faltar, o servidor **não sobe** em vez de usar um valor padrão previsível. |
| **A1** — Documentos/fotos com URL pública, sem controle de acesso | ⚠️ Não corrigido em código — **ação sua no painel do Supabase** | A listagem de certificados de um aluno (`GET /certificados/aluno/:idAluno`) agora exige login e é restrita ao próprio aluno/coordenação (parte do C1), o que já impede a enumeração de IDs sem login. Mas os arquivos em si continuam com `getPublicUrl` (URL pública fixa). Para fechar de vez, o bucket `arquivos-sra` precisa virar **privado** no painel do Supabase e o backend trocar `getPublicUrl` por `createSignedUrl` (URL temporária). Não fiz essa troca porque, sem alterar a configuração do bucket no Supabase (que só você pode fazer), trocar só o código quebraria o carregamento das imagens/arquivos já existentes. |
| **A2** — Sem rate limiting no login (força bruta) | ✅ Corrigido | Limitador simples em memória, sem dependências externas (`backend/src/middleware/rateLimit.ts`), aplicado em `/auth/login`: no máximo 8 tentativas por minuto por IP + identificador. |
| **A3** — Validação de upload só pelo `Content-Type` do cliente | ✅ Corrigido | `backend/src/utils/fileSignature.ts` confere a assinatura real do arquivo (magic bytes) para PNG/JPEG/WEBP/PDF antes de aceitar o upload, tanto em `certificados.routes.ts` quanto em `aluno.routes.ts` (foto de perfil). DOC/DOCX/TXT continuam validados só pelo `Content-Type` — assinatura confiável desses formatos exigiria uma biblioteca extra que não pude instalar sem internet. |
| **M1** — CORS com `credentials: true` desnecessário | ✅ Corrigido | Removido de `backend/src/server.ts` — a API usa token Bearer, não cookies, então essa opção não fazia sentido e ampliava a superfície de CORS. |
| **M2** — Sem cabeçalhos de segurança HTTP | ✅ Corrigido | Middleware simples (`backend/src/middleware/securityHeaders.ts`, sem depender do pacote `helmet`) aplicando `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` e `Cross-Origin-Resource-Policy` em toda resposta. |
| **M3** — Logs detalhados no servidor | ℹ️ Sem mudança de código | Continua sendo uma questão de onde os logs do container/hospedagem ficam armazenados, não do código-fonte. Nenhuma ação necessária agora — só revisar isso quando for para produção. |
| **M4** — Porta do backend exposta direto, sem proxy/TLS | ⚠️ Não corrigido — decisão de infraestrutura | Continua fora do escopo de uma mudança de código; recomendação de colocar atrás de Nginx/Caddy com HTTPS continua valendo para quando for publicar o projeto. |

## Frontend — o que mudou

O front-end salvava apenas o objeto `user` no `localStorage` e **descartava o token** retornado pelo login — por isso nenhuma chamada à API carregava autenticação, mesmo antes de o backend passar a exigi-la.

- `frontend/src/app/utils/api.ts` (novo arquivo): `apiFetch()`, um wrapper do `fetch` que anexa automaticamente o header `Authorization: Bearer <token>` guardado após o login, e limpa a sessão local se a API responder `401`.
- `frontend/src/app/pages/Login.tsx`: agora salva `user` **e** `token` (`saveSession`).
- Todas as chamadas à API nas páginas (`Certificados`, `DashboardAluno`, `DashboardCoordenacao`, `DashboardEmpresa`, `Eventos`, `HorasAMS`, `AlunoLayout`) foram trocadas de `fetch(...)` para `apiFetch(...)`.
- As funções de logout agora limpam `user` e `token` de forma consistente (`clearSession()`), inclusive em `DashboardCoordenacao.tsx`, que antes esquecia de apagar o `token` do `localStorage` no logout.
- Corrigido, de passagem, um `fetch` "morto" em `Eventos.tsx` que chamava uma rota inexistente (`http://localhost:3000/aluno/horas/...`, hardcoded e sem `await`) — agora aponta para a rota real (`/horas/aluno/:idAluno`) e usa `apiFetch`.

**Consequência importante:** como o backend agora exige token em quase todas as rotas, **é necessário fazer login de novo** depois de atualizar (qualquer sessão antiga sem token salvo vai começar a receber `401`).

## O que só você consegue fazer a partir daqui

1. **Rotacionar agora** a senha do banco Postgres, a `SUPABASE_SERVICE_ROLE_KEY` e gerar um novo `JWT_SECRET`, no painel do Supabase, e atualizar o `backend/.env` com os novos valores (o `.env.example` mostra o formato esperado).
2. Se este projeto já foi enviado ao Git em algum momento, considerar as credenciais antigas como comprometidas independentemente da rotação (o histórico do Git guarda versões antigas de arquivos apagados).
3. No painel do Supabase, avaliar tornar o bucket `arquivos-sra` privado e, se decidir por isso, me pedir para trocar `getPublicUrl` por `createSignedUrl` no código.
4. Testar o login de cada tipo de usuário (aluno, coordenação, empresa) após essa atualização, já que agora o token é obrigatório em quase tudo.
