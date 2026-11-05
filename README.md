# Mude Bem CRM

CRM interno da **Mude Bem Mudanças e Logística** para acompanhar cada processo comercial do primeiro contato até o recebimento. A interface está em português (pt-BR), os valores em real (BRL), as datas em `dd/mm/aaaa` e o fuso usado na exibição é `America/Sao_Paulo`.

## O que esta versão faz

- Login com vários usuários e papéis: administrador, comercial, operação e financeiro.
- Quadro kanban por etapa, com arrastar e soltar, e visão em lista com busca e filtros (etapa, cliente, responsável, canal e período de coleta).
- Ficha do processo: empresa e contato, canal de origem, colaborador, origem e destino, coleta e entrega, inventário, valor cotado e aprovado, OC, CT-e, NF/fatura, vencimento, recebimento, responsável, anexos e histórico de etapas e notas.
- Cadastro de clientes e contatos.
- Painel com quantidade e valor por etapa, coletas dos próximos 7 dias e recebíveis vencidos.
- API REST com chave, para um agente criar processos, atualizar campos, lançar notas e mover etapas.
- Seed com processos realistas marcados como **Exemplo**.

A pipeline, nesta ordem:

1. Cotação recebida
2. Precificação
3. Proposta enviada
4. Negociação
5. Fechado / Contrato
6. Em execução
7. Finalizado
8. Contas a receber
9. Recebido

`Perdido/Declinado` é um estado terminal, fora da sequência.

## Stack

- Next.js (App Router) e TypeScript
- PostgreSQL com Prisma
- Sessão em cookie httpOnly (JWT) e senha com bcrypt
- Tailwind para o reset e CSS próprio da interface

O app sobe na Vercel com um Postgres gerenciado (Neon ou Supabase). Os anexos ficam no próprio banco (até 5 MB), então não é preciso configurar storage neste MVP.

## Papéis

| Papel | O que faz |
| --- | --- |
| Administrador | Tudo, inclusive equipe, chaves de API e correção de etapa |
| Comercial | Abre processos e clientes e avança até Fechado / Contrato. Pode declinar até essa etapa |
| Operação | Leva de Fechado / Contrato para Em execução e depois para Finalizado. Atualiza rota, datas, inventário e CT-e |
| Financeiro | Leva de Finalizado para Contas a receber e depois para Recebido. Atualiza valor aprovado, OC, NF, vencimento e recebimento |

Todo mundo autenticado vê os processos e pode registrar nota ou anexo. A chave de API atua como integração: cria, atualiza, anota e move para qualquer etapa. Trate a chave como uma senha.

Quem não é administrador só avança. Voltar uma etapa ou reabrir um processo encerrado fica com o administrador (a API também pode corrigir).

## Começar localmente

Requisitos: Node.js 22, npm e PostgreSQL 16.

Com Docker:

```bash
docker compose up -d
```

O compose sobe o banco `mudebem` e cria também `mudebem_test` na primeira inicialização. Sem Docker, crie os dois bancos e um usuário com acesso a eles.

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

`npm run db:seed` apaga e recria só os registros marcados como exemplo, regrava a senha dos quatro usuários de demonstração e recria a chave de exemplo. Não use isso em produção sem ler a seção de deploy.

## Variáveis de ambiente

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | Conexão Postgres da aplicação. Ex.: `postgresql://mudebem:mudebem@localhost:5432/mudebem?schema=public` |
| `AUTH_SECRET` | Segredo do cookie de sessão. Mínimo de 16 caracteres. Gere com `openssl rand -base64 48` |
| `TEST_DATABASE_URL` | Banco dos testes. Precisa conter `mudebem_test`. Os testes recusam rodar em outro banco |
| `SEED_CONFIRM` | Em `NODE_ENV=production`, o seed só roda se o valor for `sim` |

## Usuários de demonstração

Senha de todos: `MudeBem@2026`

| Nome | E-mail | Papel |
| --- | --- | --- |
| Ana Costa | ana.costa@mudebem.com.br | Administrador |
| Bruno Lima | bruno.lima@mudebem.com.br | Comercial |
| Carla Nunes | carla.nunes@mudebem.com.br | Operação |
| Diego Ramos | diego.ramos@mudebem.com.br | Financeiro |

Chave de API de exemplo:

```text
mb_live_exemplo_mudebem_demo_key_2026
```

Ela só existe depois do seed. No ambiente de desenvolvimento a tela Integrações também mostra essa chave. Revogue-a antes de apontar o sistema para dados reais.

Os processos `MB-EX-0001` a `MB-EX-0010` e os clientes criados pelo seed aparecem com o selo **Exemplo**.

## Scripts

| Comando | Efeito |
| --- | --- |
| `npm run dev` | Sobe o Next.js em desenvolvimento |
| `npm run build` | Aplica as migrações e gera o build de produção |
| `npm start` | Sobe o build |
| `npm test` | Aplica as migrações no banco de teste e roda a suíte |
| `npm run db:seed` | Recria os dados de exemplo |
| `npm run db:migrate` | Cria uma migração nova em desenvolvimento (`prisma migrate dev`) |

## Testes

A suíte cobre autenticação (senha e token), as regras de transição de etapa e a API: chave ausente, inválida e revogada, criação com cliente aninhado, atualização, nota, mudança de etapa, listagem filtrada, cliente e CNPJ inválido.

```bash
npm test
```

## Deploy na Vercel com Neon ou Supabase

1. Crie um projeto Postgres. Na Neon, prefira a região `aws-sa-east-1` (São Paulo) se estiver disponível.
2. Copie a connection string para `DATABASE_URL`. Se o provedor separar URL com pool e URL direta, use a URL direta nas migrações.
3. Na Vercel, importe este repositório e defina `DATABASE_URL` e `AUTH_SECRET`.
4. O comando de build (`prisma migrate deploy && next build`) aplica as migrações a cada deploy.
5. Faça o deploy. Para carregar o primeiro administrador e os exemplos, rode na sua máquina, com `DATABASE_URL` apontando para o banco de produção e `SEED_CONFIRM=sim`:

```bash
SEED_CONFIRM=sim NODE_ENV=production npm run db:seed
```

Em seguida entre como Ana, troque as senhas criando novos usuários, desative os acessos de demonstração e revogue a chave de exemplo. O seed de produção recria os registros marcados como exemplo e redefine a senha dos e-mails de demonstração.

Anexos maiores que 5 MB ou com necessidade de antivírus devem ir para um bucket (S3, R2 ou equivalente) numa versão seguinte. O disco local da Vercel não é usado.

## API

Base: `/api/v1`

Autenticação em todas as rotas abaixo, em um dos cabeçalhos:

```http
Authorization: Bearer mb_live_...
X-API-Key: mb_live_...
```

Erros seguem `{ "erro": "mensagem", "codigo": "NAO_AUTORIZADO" }`. Códigos: `NAO_AUTORIZADO` (401), `PROIBIDO` (403), `NAO_ENCONTRADO` (404), `DADOS_INVALIDOS` (400), `CONFLITO` (409).

Datas na interface são `dd/mm/aaaa`. Na API, aceite `dd/mm/aaaa` ou `aaaa-mm-dd`; a resposta usa `aaaa-mm-dd`. Valores monetários são números em reais; a API também aceita texto `1.234,56`. A etapa **não** muda no `PATCH`: use o endpoint de etapa, para o histórico registrar a passagem.

Há uma descrição OpenAPI em [`docs/openapi.yaml`](docs/openapi.yaml). `GET /api/health` não exige chave e responde `{ "status": "ok" }` quando o banco responde.

### Criar um processo a partir de um lead

O corpo pode apontar para um `clienteId` existente ou enviar `cliente` e `contato` para cadastrar na hora. Se o CNPJ ou o e-mail do contato já existirem, o registro é reaproveitado.

```bash
curl -s -X POST http://localhost:3000/api/v1/processos \
  -H "Authorization: Bearer mb_live_exemplo_mudebem_demo_key_2026" \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Mudança do analista João Prado",
    "canal": "WHATSAPP",
    "cliente": { "nome": "Oficina Norte Ltda", "cidade": "Recife", "uf": "PE" },
    "contato": { "nome": "João Prado", "email": "joao.prado@oficina.example", "telefone": "(81) 98888-1010" },
    "colaborador": "João Prado",
    "origemCidade": "Recife",
    "origemUf": "PE",
    "destinoCidade": "Olinda",
    "destinoUf": "PE",
    "dataColeta": "2026-12-10",
    "inventario": "Apartamento de 2 quartos e home office.",
    "valorCotado": 12500
  }'
```

Canais: `EMAIL`, `SITE`, `WHATSAPP`, `INDICACAO`.

Etapas: `COTACAO_RECEBIDA`, `PRECIFICACAO`, `PROPOSTA_ENVIADA`, `NEGOCIACAO`, `FECHADO_CONTRATO`, `EM_EXECUCAO`, `FINALIZADO`, `CONTAS_A_RECEBER`, `RECEBIDO`, `PERDIDO_DECLINADO`.

Se `etapa` for omitida na criação, o processo entra em Cotação recebida. A resposta `201` traz o processo, com `codigo` no formato `MB-2026-0001`.

### Consultar

```bash
curl -s "http://localhost:3000/api/v1/processos?etapa=NEGOCIACAO&q=Aurora&de=2026-11-01&ate=2026-12-31&pagina=1&porPagina=50" \
  -H "X-API-Key: mb_live_exemplo_mudebem_demo_key_2026"
```

Filtros: `q`, `etapa`, `canal`, `clienteId`, `responsavelId`, `de`, `ate` (datas de coleta), `pagina`, `porPagina` (máximo 100).

`GET /api/v1/processos/{id}` inclui `eventos` e a lista de `anexos` (sem o arquivo). O download do arquivo continua pela interface autenticada.

`GET /api/v1/etapas` devolve a pipeline, o estado terminal e os canais.

### Atualizar campos

```bash
curl -s -X PATCH http://localhost:3000/api/v1/processos/ID \
  -H "Authorization: Bearer mb_live_exemplo_mudebem_demo_key_2026" \
  -H "Content-Type: application/json" \
  -d '{ "valorAprovado": 11800, "numeroOc": "OC-3321", "dataColeta": "2026-12-12" }'
```

Campos aceitos: `titulo`, `canal`, `clienteId`, `contatoId`, `contato` (objeto para criar ou reaproveitar um contato), `colaborador`, `origemEndereco`, `origemCidade`, `origemUf`, `destinoEndereco`, `destinoCidade`, `destinoUf`, `dataColeta`, `dataEntrega`, `inventario`, `valorCotado`, `valorAprovado`, `numeroOc`, `numeroCte`, `numeroNf`, `dataVencimento`, `dataRecebimento`, `responsavelId`.

Envie `null` ou string vazia para limpar um campo opcional. Omitir a chave mantém o valor atual.

### Nota e etapa

```bash
curl -s -X POST http://localhost:3000/api/v1/processos/ID/notas \
  -H "Authorization: Bearer mb_live_exemplo_mudebem_demo_key_2026" \
  -H "Content-Type: application/json" \
  -d '{ "texto": "Cliente confirmou a vistoria por vídeo." }'

curl -s -X POST http://localhost:3000/api/v1/processos/ID/etapa \
  -H "Authorization: Bearer mb_live_exemplo_mudebem_demo_key_2026" \
  -H "Content-Type: application/json" \
  -d '{ "etapa": "PRECIFICACAO", "observacao": "Inventário recebido por e-mail." }'
```

### Clientes e contatos

```bash
curl -s -X POST http://localhost:3000/api/v1/clientes \
  -H "Authorization: Bearer mb_live_exemplo_mudebem_demo_key_2026" \
  -H "Content-Type: application/json" \
  -d '{ "nome": "Oficina Norte Ltda", "cidade": "Recife", "uf": "PE" }'

curl -s -X POST http://localhost:3000/api/v1/clientes/ID/contatos \
  -H "Authorization: Bearer mb_live_exemplo_mudebem_demo_key_2026" \
  -H "Content-Type: application/json" \
  -d '{ "nome": "João Prado", "email": "joao.prado@oficina.example", "telefone": "(81) 98888-1010", "principal": true }'
```

Também existem `GET /api/v1/clientes?q=`, `GET /api/v1/clientes/{id}` e `PATCH /api/v1/clientes/{id}`.

O CNPJ, quando informado, é validado e guardado só com os dígitos. A resposta inclui `cnpjFormatado`.
