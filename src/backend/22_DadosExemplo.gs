/**
 * ==========================================================
 * DIRETÓRIO DE CONTATOS — DEMO
 * Arquivo: 22_DadosExemplo.gs
 * ==========================================================
 * Base de demonstração com dados 100% FICTÍCIOS.
 * Substitui qualquer importação de dados reais: este projeto
 * de portfólio não contém nem lê dados institucionais.
 *
 * Uso (nesta ordem, no editor do Apps Script):
 *   1. instalarSistemaForum(SEGREDO)
 *   2. carregarDadosExemplo()
 *
 * A carga só preenche abas que estejam vazias (só cabeçalho),
 * então pode ser executada mais de uma vez sem duplicar.
 */

const DADOS_EXEMPLO = {
  MUNICIPIOS: [
    ["MUN001", "Município Alfa", "0000001", "Demo", true],
    ["MUN002", "Município Beta", "0000002", "Demo", true],
  ],
  FORUM: [
    ["FOR001", "MUN001", "Fórum Central (demo)", "Rua Exemplo, 100", "29000-000", "contato@empresa-exemplo.com.br", 1, true, "demo"],
    ["FOR002", "MUN002", "Fórum Norte (demo)", "Av. Exemplo, 200", "29100-000", "norte@empresa-exemplo.com.br", 2, true, "demo"],
  ],
  UNIDADES_ORGANIZACIONAIS: [
    ["UNI001", "FOR001", "", "UNIDADE", "Atendimento", "", "", "demo", true, true, 1],
    ["SET001", "FOR001", "UNI001", "SETOR", "Suporte", "", "", "demo", true, true, 2],
    ["UNI002", "FOR002", "", "UNIDADE", "Recepção", "", "", "demo", true, true, 1],
  ],
  CONTATOS: [
    ["CT001", "FOR001", "UNI001", "", "", "TELEFONE", "Recepção", "(27) 3333-0001", 1, "2026-01-01", "2026-01-01", true, "demo"],
    ["CT002", "FOR001", "UNI001", "", "", "EMAIL", "E-mail institucional", "contato@empresa-exemplo.com.br", 2, "2026-01-01", "2026-01-01", true, "demo"],
    ["CT003", "FOR001", "SET001", "", "", "TELEFONE", "Suporte", "(27) 3333-0002", 1, "2026-01-01", "2026-01-01", true, "demo"],
    ["CT004", "FOR002", "UNI002", "", "", "TELEFONE", "Recepção", "(27) 3333-0003", 1, "2026-01-01", "2026-01-01", true, "demo"],
    ["CT005", "FOR002", "UNI002", "", "", "WHATSAPP", "Agendamento", "(27) 99999-0001", 2, "2026-01-01", "2026-01-01", true, "demo"],
  ],
  TELEFONES_UTEIS: [
    ["TU001", "Emergência (demo)", "TELEFONE", "190", true],
    ["TU002", "Ouvidoria (demo)", "TELEFONE", "(27) 3333-0099", true],
  ],
};

function carregarDadosExemplo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const resumo = [];
  Object.keys(DADOS_EXEMPLO).forEach(function (chave) {
    try {
      const aba = CONFIG.SHEETS[chave];
      const sheet = ss.getSheetByName(aba);
      if (!sheet) {
        resumo.push(aba + ": aba não encontrada (rode instalarSistemaForum antes)");
        return;
      }
      if (sheet.getLastRow() > 1) {
        resumo.push(aba + ": já possui dados, mantida");
        return;
      }
      const linhas = DADOS_EXEMPLO[chave];
      sheet
        .getRange(2, 1, linhas.length, linhas[0].length)
        .setValues(linhas);
      resumo.push(aba + ": " + linhas.length + " linhas de exemplo inseridas");
    } catch (e) {
      resumo.push(chave + ": erro — " + e.message);
    }
  });
  Logger.log(resumo.join("\n"));
  return resumo;
}
