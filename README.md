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
| Dados fictícios p/ demo | `src/backend/24_DadosExemplo.gs` |

Padrões: leitura em lote (`getValues`/`setValues`, sem I/O em loop), locks em
read-modify-write, cache de referência com TTL e invalidação, autorização
sempre no servidor, payloads mínimos e JSON-serializáveis.

## Evolução v1 → v2 → v3
Mesmo produto, três fases de maturidade — a interface e as regras de negócio
são as mesmas; o que evolui é a fundação técnica:

| Aspecto | v1 — MVP (este repo) | v2 — reescrita ([diretorio-contatos-v2](https://github.com/EnzoMoulin/diretorio-contatos-v2)) | v3 — direção |
|---|---|---|---|
| Runtime + dados | Apps Script + Sheets (planilha como banco, sem FKs) | Python stdlib + SQLite (FKs, zero dependências) | Migrações versionadas, Postgres opcional |
| Concorrência | `LockService` por execução | `ThreadingHTTPServer` + lock em escrita | Servidor ASGI, pool de conexões |
| Busca | Substring no frontend | FTS5 no servidor + autocomplete com highlight | Ranking por relevância, tolerância a erro de digitação |
| Auth | Sessão Google + planilha | Google OAuth + login local (só dev, flag `LOCAL_LOGIN`) com PBKDF2 | Expiração de sessão, papéis granulares |
| Backup | Versionamento nativo da planilha | `VACUUM INTO` com download no admin | Rotina agendada com retenção |
| Cache | `CacheService` com TTL | `lru_cache` na hierarquia (invalidado em escrita) | Cache por escopo de usuário |
| Saúde dos dados | Validador manual de integridade | Dashboard: alterações 30d + obsoletos 180d | Alertas automáticos de obsolescência |
| Testes | Sem testes automatizados | 14 testes (`unittest`, banco temporário) | CI rodando a suíte a cada push |

Por que três fases em vez de reescrever direto: o v1 validou o produto a custo
zero dentro do ecossistema onde os dados viviam; o v2 prova a mesma arquitetura
sem dependência de fornecedor; o v3 endurece para escala.

## Como rodar (demo)
1. Crie um Apps Script + uma planilha Google novos (conta pessoal).
2. Copie `.clasp.json.example` para `.clasp.json` com seu `scriptId` (nunca commite o real).
3. `clasp push` a partir de `src/`, abra o editor e rode, nesta ordem:
   - `instalarSistemaForum(SEGREDO)` — cria as abas e a estrutura
   - `carregarDadosExemplo()` — insere a base fictícia
4. Publique como app da Web e teste a consulta + o login demo.

## Como publicar (mudanças de código)
`DEPLOY_DESC="o que mudou" python3 scripts/deploy_v1.py` — sobe `src/` para os
dois projetos (público e privado) via API e imprime as novas versões.
A vitrine do Apps Script demora horas para servir o novo código: confira com
`Ctrl+Shift+R`.

## Backup
- **Planilhas**: rotina local toda segunda às 3h (`~/.hermes/scripts/backup_planilhas.sh`,
agendada; mantém 4 semanas em `~/Emprego/Backups/planilhas/`). Nada a fazer à mão.
- **Dentro da plataforma**: `backupPlanilha(SEGREDO)` testa a cópia na hora;
`instalarBackupDiario(SEGREDO)` agenda todo dia às 3h (mantém 7 cópias na pasta
da planilha). Rode uma vez no editor do Apps Script.

## Demo executável (Python, 1 comando)
Versão portátil do mesmo domínio, zero dependências, pronta para avaliar em
segundos: [EnzoMoulin/diretorio-contatos-v2](https://github.com/EnzoMoulin/diretorio-contatos-v2).

## Screenshots / vídeo
`docs/` reservado — prints e vídeo curto (só tela + legendas, sem voz/webcam).

## Experiência de uso (detalhes)
Mesmos cuidados da v2 (onde a plataforma permite):
- **Favoritos** (aba + estrela, com contador): salvos no navegador, em A–Z, com filtro, impressão, CSV, `.vcf` único e limpeza com confirmação
- **Baixar contato (.vcf)**, **link direto** (`?contato=id`, com compartilhar nativo no celular) e **exportar CSV** do que está na tela
- **Busca de verdade**: `/` foca, setas navegam, Enter abre, Esc fecha; termo grifado e combobox acessível
- **Mobile**: sidebar vira gaveta até 900px (o v1 já tinha o mecanismo)
- **Acessibilidade medida**: contraste WCAG AA, foco visível, skip-link, `reduced-motion`, impressão limpa com data/hora

## O que foi sanitizado em relação ao original institucional
- Nomes, e-mails, telefones e IDs reais removidos (base 100% fictícia)
- Domínio institucional e IDs de script/planilha removidos (placeholders)
- Documentos internos, planilhas e PDFs excluídos do repositório

## Licença
MIT — Enzo Moulin.
