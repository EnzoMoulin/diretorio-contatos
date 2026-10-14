# Diretório de Contatos — Demo (Google Apps Script + Google Sheets)

> Projeto de portfólio: recriação genérica, criada do zero para demonstração,
> inspirada em diretório institucional de contatos do qual participei como
> estagiário (concepção + MVP + documentação). **Todo o código aqui foi
> sanitizado e todos os dados são fictícios** — nenhum dado real ou interno
> é usado ou exposto.

## O que faz
- **Consulta pública:** navegação por hierarquia (Município → Fórum → árvore organizacional → Contato), busca por nome, setor, telefone, e-mail + mapa
- **Gestão interna:** área restrita com login institucional, CRUD de contatos com controle de concorrência (`LockService`) e idempotência
- **Governança:** perfis (gestor sistema / gestor conteúdo / consulta), escopos de acesso por unidade, solicitações de acesso, notificações
- **Histórico e auditoria:** registro de alterações, log, validação de integridade do modelo relacional
- **Publicação:** exportação das abas públicas para base de consulta

## Arquitetura
```text
MUNICIPIOS → FORUM → UNIDADES_ORGANIZACIONAIS (árvore) → CONTATOS
```

| Camada | Onde |
|---|---|
| Config e constantes | `src/backend/01_Config.gs` |
| Persistência (Sheets, batch I/O) | `src/backend/03_Database.gs` |
| Regras de negócio / serviços | `src/backend/13_*`, `16_*`, `19_*` |
| API exposta ao frontend | `src/backend/11_API.gs`, `14_ForumAPI.gs` |
| Instalação / migração / publicação | `src/backend/12_*`, `15_*`, `18_*` |
| Auth, cache, log, validação | `src/backend/08_*`, `09_*`, `10_*`, `06_*`, `07_*` |
| UI (HTML/CSS/JS, `google.script.run`) | `src/frontend/` |
| Dados fictícios p/ demo | `src/backend/22_DadosExemplo.gs` |

Padrões: leitura em lote (`getValues`/`setValues`, sem I/O em loop), locks em
read-modify-write, cache de referência com TTL e invalidação, autorização
sempre no servidor, payloads mínimos e JSON-serializáveis.

## Como rodar (demo)
1. Crie um Apps Script + uma planilha Google novos (conta pessoal).
2. Copie `.clasp.json.example` para `.clasp.json` com seu `scriptId` (nunca commite o real).
3. `clasp push` a partir de `src/`, abra o editor e rode, nesta ordem:
   - `instalarSistemaForum(SEGREDO)` — cria as abas e a estrutura
   - `carregarDadosExemplo()` — insere a base fictícia
4. Publique como app da Web e teste a consulta + o login demo.

## Demo executável (Python, 1 comando)
Versão portátil do mesmo domínio, zero dependências, pronta para avaliar em
segundos: [EnzoMoulin/diretorio-contatos-demo](https://github.com/EnzoMoulin/diretorio-contatos-demo).

## Screenshots / vídeo
`docs/` reservado — prints e vídeo curto (só tela + legendas, sem voz/webcam).

## O que foi sanitizado em relação ao original institucional
- Nomes, e-mails, telefones e IDs reais removidos (base 100% fictícia)
- Domínio institucional e IDs de script/planilha removidos (placeholders)
- Documentos internos, planilhas e PDFs excluídos do repositório

## Licença
MIT — Enzo Moulin.
