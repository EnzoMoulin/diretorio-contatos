/**
 * TEMPORARIO — importa os CSVs mascarados do GitHub para as 2 planilhas.
 * Apagar apos o uso (daqui e do repo).
 * Como rodar: selecione "importarMascaradosTudo" e clique em Executar.
 * Autoriza quando pedir. Leva ~1-2 min. Confira o Log ao final.
 */
var _BASE_CSV = "https://raw.githubusercontent.com/EnzoMoulin/diretorio-contatos/master/tmp-import/";
var _ABAS = ["MUNICIPIOS", "FORUM", "UNIDADES_ORGANIZACIONAIS", "CONTATOS", "TELEFONES_UTEIS"];
var _PLANILHAS = {
  publica: "1P-gMnCpQVETWbJxOjiPDdv0TikVxMB5S-Wu-zbUiHSY",
  privada: "1QOsmFE7wOSIQFt9SxWRjFDbXOaBDlThYkhjbduGyFbI"
};
function importarMascaradosTudo() {
  var resumo = [];
  Object.keys(_PLANILHAS).forEach(function (nome) {
    var ss = SpreadsheetApp.openById(_PLANILHAS[nome]);
    _ABAS.forEach(function (aba) {
      var resp = UrlFetchApp.fetch(_BASE_CSV + aba + ".csv");
      var dados = Utilities.parseCsv(resp.getContentText(), ",");
      var sh = ss.getSheetByName(aba);
      if (!sh) { resumo.push(nome + "/" + aba + ": aba nao encontrada"); return; }
      sh.clearContents();
      sh.getRange(1, 1, dados.length, dados[0].length).setValues(dados);
      resumo.push(nome + "/" + aba + ": " + (dados.length - 1) + " linhas");
    });
  });
  // Admin: SOLICITACOES_ACESSO passa a usar UNIDADE_ORGANIZACIONAL_ID (só na privada)
  try {
    var ssPriv = SpreadsheetApp.openById(_PLANILHAS.privada);
    var shSol = ssPriv.getSheetByName("SOLICITACOES_ACESSO");
    if (shSol && shSol.getLastColumn() >= 1) {
      var head = shSol.getRange(1, 1, 1, shSol.getLastColumn()).getValues()[0];
      for (var i = 0; i < head.length; i++) {
        if (String(head[i]).trim() === "UNIDADE_ID") {
          shSol.getRange(1, i + 1).setValue("UNIDADE_ORGANIZACIONAL_ID");
          resumo.push("privada/SOLICITACOES_ACESSO: coluna renomeada");
          break;
        }
      }
    } else {
      resumo.push("privada/SOLICITACOES_ACESSO: aba ausente (ok)");
    }
  } catch (e) { resumo.push("privada/SOLICITACOES_ACESSO: " + e.message); }
  Logger.log(resumo.join("\n"));
  return resumo;
}
