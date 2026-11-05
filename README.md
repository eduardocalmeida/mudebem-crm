# Mude Bem CRM

CRM interno da **Mude Bem Mudanças e Logística** para acompanhar cada processo comercial do primeiro contato até o recebimento. A interface está em português (pt-BR), os valores em real (BRL), as datas em `dd/mm/aaaa` e o fuso usado na exibição é `America/Sao_Paulo`.

## O que esta versão faz

- Login com vários usuários e papéis: administrador, comercial, operação e financeiro.
- Quadro kanban por etapa, com arrastar e soltar, e visão em lista com busca e filtros (etapa, cliente, responsável, canal e período de coleta).
- Ficha do processo: empresa e contato, canal de origem, colaborador, origem e destino, coleta e entrega, inventário, valor cotado e aprovado, OC, CT-e, NF/fatura, vencimento, recebimento, responsável, anexos e histórico de etapas e notas.
- Cadastro de clientes e contatos.
- Painel com quantidade e valor por etapa, coletas dos próximos 7 dias e recebíveis vencidos.
- API REST com chave, para um agente criar processos, atualizar campos, lançar notas e mover etapas.
- Caixa de entrada de WhatsApp na API oficial da Meta (Cloud API), com mais de um número, webhook assinado e abertura automática de lead.
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

## WhatsApp pela API da Meta

A inbox fala direto com a [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api). Não há provedor no meio (nem Kommo, nem BSP). Um único app da Meta e uma WABA podem ter vários números; cada um tem o seu `phone number id`. O CRM começa preparado para dois.

O webhook público é `https://SEU-DOMINIO/api/whatsapp/webhook`. A verificação (`GET`) confere o verify token e devolve o `hub.challenge`. Cada `POST` só é aceito se o cabeçalho `X-Hub-Signature-256` bater com o HMAC SHA-256 do corpo cru, calculado com o app secret.

Mensagem de texto, mídia e atualização de status entram na conversa daquele número. Se o telefone ainda não existe como contato, o CRM cria o cliente, o contato e um processo em **Cotação recebida** com canal **WhatsApp**. A resposta livre só sai dentro da janela de 24 horas contadas da última mensagem do cliente. Fora dela, o envio precisa ser um modelo aprovado.

Na interface: lista, conversa, resposta, atribuição a um usuário e vínculo com um processo. Em **WhatsApp → Números e conexão** (administrador) dá para gravar verify token, app secret, token de acesso, WABA id e os números. Variável de ambiente, quando preenchida, ganha da tela.

| Variável | Uso |
| --- | --- |
| `WHATSAPP_VERIFY_TOKEN` | String que você inventa e repete na configuração do webhook na Meta |
| `WHATSAPP_APP_SECRET` | App secret do app (Configurações → Básico) |
| `WHATSAPP_ACCESS_TOKEN` | Token permanente do usuário de sistema, com `whatsapp_business_messaging` e `whatsapp_business_management` |
| `WHATSAPP_WABA_ID` | Opcional. Lista os modelos aprovados na conversa |
| `WHATSAPP_API_VERSION` | Padrão `v21.0` |
| `WHATSAPP_NUMERO_1_ID` | Phone number id do primeiro número |
| `WHATSAPP_NUMERO_1_NOME` | Nome interno, por exemplo Comercial |
| `WHATSAPP_NUMERO_1_EXIBICAO` | Número como o cliente vê |
| `WHATSAPP_NUMERO_1_TOKEN` | Opcional, se esse número não usar o token padrão |
| `WHATSAPP_NUMERO_2_*` | O segundo número, no mesmo formato |

### Ligar o app

1. Em [developers.facebook.com](https://developers.facebook.com), crie um app do tipo Business e adicione o produto WhatsApp.
2. No Gerenciador do WhatsApp, anote o WABA id e o phone number id de cada número (Começar a usar a API).
3. Em Configurações do negócio → Usuários do sistema, crie um usuário admin, atribua o app e a conta do WhatsApp, e gere um token permanente com as duas permissões acima.
4. No app, em WhatsApp → Configuração, defina a URL de callback `https://SEU-DOMINIO/api/whatsapp/webhook`, o mesmo verify token do ambiente, e assine o campo `messages`.
5. Copie o app secret. Preencha as variáveis (ou a tela de ajustes) e suba o deploy. A Meta manda o `GET` de verificação na hora de salvar o webhook.
6. Envie um modelo de teste, ou peça para alguém escrever no número, e confira a conversa em WhatsApp.

### Tirar o número do aplicativo WhatsApp Business

O mesmo número não fica ao mesmo tempo no aplicativo do celular e na Cloud API.

1. Guarde o que precisar do histórico do celular. Esta migração não traz as conversas antigas para o CRM.
2. No Gerenciador do WhatsApp da WABA da Mude Bem, em Números de telefone, adicione o número que hoje está no aplicativo.
3. Peça o código por SMS ou ligação e informe no gerenciador. A Meta transfere o registro para a Cloud API.
4. O aplicativo WhatsApp Business daquele número deixa de funcionar. Se a tela pedir um PIN de verificação em duas etapas, defina um e guarde.
5. Espere a aprovação do nome de exibição, se ainda estiver pendente, e confirme que o phone number id apareceu na configuração da API.

O passo a passo da Meta está em [migrar um número que já está no WhatsApp](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started/migrate-existing-whatsapp-number-to-a-business-account).

### Sair do Kommo

O Kommo entra como provedor (BSP) ou como dono do webhook do app. Os dois casos precisam soltar o número antes de a Mude Bem receber as mensagens.

1. Combine uma janela curta. Enquanto a troca acontece, mensagens novas podem falhar.
2. No Kommo, desconecte o canal de WhatsApp desse número para ele parar de enviar e de consumir o código de verificação.
3. Se o número estiver na WABA do próprio Kommo, migre para a WABA da Mude Bem: peça ao Kommo para desligar a verificação em duas etapas (ou informar o PIN) e para liberar o número. No Gerenciador, adicione o número. A Meta manda um OTP por SMS ou voz; o Kommo não pode capturar esse código. Essa migração, e não um cadastro do zero, é o que preserva qualidade e nome de exibição. A referência é a [migração de número entre contas](https://developers.facebook.com/docs/whatsapp/solution-providers/migrate-existing-numbers).
4. Se a WABA já for da Mude Bem e o Kommo só estava conectado por login incorporado, não precisa migrar o número. Em Configurações do negócio, tire o usuário de sistema do Kommo da conta de WhatsApp, crie o usuário de sistema de vocês, gere o token e troque a URL de callback do app para `https://SEU-DOMINIO/api/whatsapp/webhook`. Cada app tem um único webhook.
5. Confira no Gerenciador que o callback é o do CRM. Mande um modelo (a janela de 24 horas pode estar fechada) e responda de um celular pessoal. A mensagem tem que aparecer na inbox e, se o telefone for novo, abrir um processo em Cotação recebida.

### API da inbox para agentes

Exige a mesma chave das outras rotas.

```bash
curl -s "http://localhost:3000/api/v1/whatsapp/conversas?naoLidas=sim" \
  -H "Authorization: Bearer mb_live_exemplo_mudebem_demo_key_2026"

curl -s http://localhost:3000/api/v1/whatsapp/conversas/ID \
  -H "Authorization: Bearer mb_live_exemplo_mudebem_demo_key_2026"

curl -s -X POST http://localhost:3000/api/v1/whatsapp/conversas/ID/mensagens \
  -H "Authorization: Bearer mb_live_exemplo_mudebem_demo_key_2026" \
  -H "Content-Type: application/json" \
  -d '{ "texto": "Olá, recebemos o pedido de cotação." }'
```

Fora da janela de 24 horas, `texto` responde `409` com `JANELA_ENCERRADA`. Envie um modelo:

```bash
curl -s -X POST http://localhost:3000/api/v1/whatsapp/conversas/ID/mensagens \
  -H "Authorization: Bearer mb_live_exemplo_mudebem_demo_key_2026" \
  -H "Content-Type: application/json" \
  -d '{ "modelo": { "nome": "cotacao_recebida", "idioma": "pt_BR", "parametros": ["Marina"] } }'
```

`GET` da conversa marca como lida. Para só olhar, use `?marcarLida=nao`.

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
