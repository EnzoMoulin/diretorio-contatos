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
    ["MUN001", "Vitória", "0000001", "ES", true],
    ["MUN002", "Vila Velha", "0000002", "ES", true],
    ["MUN003", "Serra", "0000003", "ES", true],
    ["MUN004", "Cariacica", "0000004", "ES", true],
    ["MUN005", "Linhares", "0000005", "ES", true],
    ["MUN006", "Colatina", "0000006", "ES", true],
    ["MUN007", "Cachoeiro de Itapemirim", "0000007", "ES", true],
    ["MUN008", "Guarapari", "0000008", "ES", true],
  ],
  FORUM: [
    ["FOR001", "MUN001", "Fórum Cível de Vitória", "Rua Exemplo, 100 - Centro, Vitória/ES", "29000-000", "civel.vitoria@exemplo.jus.br", 1, true, "demo"],
    ["FOR002", "MUN001", "Fórum Criminal de Vitória", "Av. Exemplo, 200 - Centro, Vitória/ES", "29000-000", "criminal.vitoria@exemplo.jus.br", 2, true, "demo"],
    ["FOR003", "MUN002", "Fórum Des. Afonso Cláudio", "Rua Exemplo, 300 - Centro, Vila Velha/ES", "29100-000", "vv@exemplo.jus.br", 1, true, "demo"],
    ["FOR004", "MUN003", "Fórum Cível da Serra", "Av. Exemplo, 400 - Centro, Serra/ES", "29160-000", "serra@exemplo.jus.br", 1, true, "demo"],
    ["FOR005", "MUN004", "Fórum Cível de Cariacica", "Rua Exemplo, 500 - Centro, Cariacica/ES", "29140-000", "cariacica@exemplo.jus.br", 1, true, "demo"],
    ["FOR006", "MUN005", "Fórum Cível de Linhares", "Av. Exemplo, 600 - Centro, Linhares/ES", "29900-000", "linhares@exemplo.jus.br", 1, true, "demo"],
    ["FOR007", "MUN006", "Fórum Cível de Colatina", "Rua Exemplo, 700 - Centro, Colatina/ES", "29700-000", "colatina@exemplo.jus.br", 1, true, "demo"],
    ["FOR008", "MUN007", "Fórum Cível de Cachoeiro", "Av. Exemplo, 800 - Centro, Cachoeiro/ES", "29300-000", "cachoeiro@exemplo.jus.br", 1, true, "demo"],
    ["FOR009", "MUN008", "Fórum Cível de Guarapari", "Rua Exemplo, 900 - Centro, Guarapari/ES", "29200-000", "guarapari@exemplo.jus.br", 1, true, "demo"],
  ],
  UNIDADES_ORGANIZACIONAIS: [
    ["UNI001", "FOR001", "", "UNIDADE", "1ª Vara Cível", "", "", "demo", true, true, 1],
    ["SET001", "FOR001", "UNI001", "SETOR", "Atendimento", "", "", "demo", true, true, 1],
    ["SET002", "FOR001", "UNI001", "SETOR", "Cartório", "", "", "demo", true, true, 2],
    ["UNI002", "FOR001", "", "UNIDADE", "2ª Vara Cível", "", "", "demo", true, true, 2],
    ["SET003", "FOR001", "UNI002", "SETOR", "Atendimento", "", "", "demo", true, true, 1],
    ["UNI003", "FOR002", "", "UNIDADE", "Vara Criminal", "", "", "demo", true, true, 1],
    ["SET004", "FOR002", "UNI003", "SETOR", "Cartório", "", "", "demo", true, true, 1],
    ["UNI004", "FOR003", "", "UNIDADE", "1ª Vara Cível", "", "", "demo", true, true, 1],
    ["SET005", "FOR003", "UNI004", "SETOR", "Atendimento", "", "", "demo", true, true, 1],
    ["SET006", "FOR003", "UNI004", "SETOR", "Gabinete", "", "", "demo", true, true, 2],
    ["UNI005", "FOR004", "", "UNIDADE", "1ª Vara Cível", "", "", "demo", true, true, 1],
    ["SET007", "FOR004", "UNI005", "SETOR", "Atendimento", "", "", "demo", true, true, 1],
    ["UNI006", "FOR005", "", "UNIDADE", "1ª Vara Cível", "", "", "demo", true, true, 1],
    ["SET008", "FOR005", "UNI006", "SETOR", "Cartório", "", "", "demo", true, true, 1],
    ["UNI007", "FOR006", "", "UNIDADE", "1ª Vara Cível", "", "", "demo", true, true, 1],
    ["SET009", "FOR006", "UNI007", "SETOR", "Atendimento", "", "", "demo", true, true, 1],
    ["UNI008", "FOR007", "", "UNIDADE", "1ª Vara Cível", "", "", "demo", true, true, 1],
    ["SET010", "FOR007", "UNI008", "SETOR", "Atendimento", "", "", "demo", true, true, 1],
    ["UNI009", "FOR008", "", "UNIDADE", "1ª Vara Cível", "", "", "demo", true, true, 1],
    ["SET011", "FOR008", "UNI009", "SETOR", "Atendimento", "", "", "demo", true, true, 1],
    ["UNI010", "FOR009", "", "UNIDADE", "1ª Vara Cível", "", "", "demo", true, true, 1],
    ["SET012", "FOR009", "UNI010", "SETOR", "Atendimento", "", "", "demo", true, true, 1],
  ],
  CONTATOS: [
    ["CT001", "FOR001", "SET001", "", "", "TELEFONE", "Atendimento 1ª Vara Cível", "(27) 3333-0001", 1, "2026-01-01", "2026-01-01", true, "demo"],
    ["CT002", "FOR001", "SET001", "", "", "EMAIL", "E-mail do atendimento", "atendimento@exemplo.jus.br", 2, "2026-01-01", "2026-01-01", true, "demo"],
    ["CT003", "FOR001", "SET001", "", "", "RAMAL", "Ramal do atendimento", "2001", 3, "2026-01-01", "2026-01-01", true, "demo"],
    ["CT004", "FOR001", "SET002", "", "", "TELEFONE", "Cartório 1ª Vara Cível", "(27) 3333-0002", 1, "2026-01-01", "2026-01-01", true, "demo"],
    ["CT005", "FOR001", "SET002", "", "", "EMAIL", "E-mail do cartório", "cartorio.vitoria@exemplo.jus.br", 2, "2026-01-01", "2026-01-01", true, "demo"],
    ["CT006", "FOR001", "SET003", "", "", "TELEFONE", "Atendimento 2ª Vara Cível", "(27) 3333-0003", 1, "2026-01-01", "2026-01-01", true, "demo"],
    ["CT007", "FOR001", "SET003", "", "", "WHATSAPP", "WhatsApp 2ª Vara Cível", "(27) 99999-0003", 2, "2026-01-01", "2026-01-01", true, "demo"],
    ["CT008", "FOR002", "SET004", "", "", "TELEFONE", "Cartório Vara Criminal", "(27) 3333-0004", 1, "2026-01-01", "2026-01-01", true, "demo"],
    ["CT009", "FOR002", "SET004", "", "", "RAMAL", "Ramal Vara Criminal", "2004", 2, "2026-01-01", "2026-01-01", true, "demo"],
    ["CT010", "FOR003", "SET005", "", "", "TELEFONE", "Atendimento Vila Velha", "(27) 3333-0005", 1, "2026-01-01", "2026-01-01", true, "demo"],
    ["CT011", "FOR003", "SET005", "", "", "EMAIL", "E-mail Vila Velha", "vv@exemplo.jus.br", 2, "2026-01-01", "2026-01-01", true, "demo"],
    ["CT012", "FOR003", "SET005", "", "", "WHATSAPP", "WhatsApp Vila Velha", "(27) 99999-0005", 3, "2026-01-01", "2026-01-01", true, "demo"],
    ["CT013", "FOR003", "SET006", "", "", "TELEFONE", "Gabinete 1ª Vara Cível", "(27) 3333-0006", 1, "2026-01-01", "2026-01-01", true, "demo"],
    ["CT014", "FOR004", "SET007", "", "", "TELEFONE", "Atendimento Serra", "(27) 3333-0007", 1, "2026-01-01", "2026-01-01", true, "demo"],
    ["CT015", "FOR004", "SET007", "", "", "RAMAL", "Ramal Serra", "2007", 2, "2026-01-01", "2026-01-01", true, "demo"],
    ["CT016", "FOR005", "SET008", "", "", "TELEFONE", "Cartório Cariacica", "(27) 3333-0008", 1, "2026-01-01", "2026-01-01", true, "demo"],
    ["CT017", "FOR005", "SET008", "", "", "EMAIL", "E-mail Cariacica", "cariacica@exemplo.jus.br", 2, "2026-01-01", "2026-01-01", true, "demo"],
    ["CT018", "FOR006", "SET009", "", "", "TELEFONE", "Atendimento Linhares", "(27) 3333-0009", 1, "2026-01-01", "2026-01-01", true, "demo"],
    ["CT019", "FOR006", "SET009", "", "", "WHATSAPP", "WhatsApp Linhares", "(27) 99999-0009", 2, "2026-01-01", "2026-01-01", true, "demo"],
    ["CT020", "FOR007", "SET010", "", "", "TELEFONE", "Atendimento Colatina", "(27) 3333-0010", 1, "2026-01-01", "2026-01-01", true, "demo"],
    ["CT021", "FOR008", "SET011", "", "", "TELEFONE", "Atendimento Cachoeiro", "(27) 3333-0011", 1, "2026-01-01", "2026-01-01", true, "demo"],
    ["CT022", "FOR008", "SET011", "", "", "RAMAL", "Ramal Cachoeiro", "2011", 2, "2026-01-01", "2026-01-01", true, "demo"],
    ["CT023", "FOR009", "SET012", "", "", "TELEFONE", "Atendimento Guarapari", "(27) 3333-0012", 1, "2026-01-01", "2026-01-01", true, "demo"],
    ["CT024", "FOR009", "SET012", "", "", "EMAIL", "E-mail Guarapari", "guarapari@exemplo.jus.br", 2, "2026-01-01", "2026-01-01", true, "demo"],
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
