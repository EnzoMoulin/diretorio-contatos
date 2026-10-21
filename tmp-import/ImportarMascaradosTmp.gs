/**
 * TEMPORARIO — importa os CSVs mascarados do GitHub para as 2 planilhas.
 * Apagar apos o uso (daqui e do repo).
 * Como rodar: selecione "importarMascaradosTudo" e clique em Executar.
 * Autoriza quando pedir. Leva ~1-2 min. Confira o Log ao final.
 */
var _BASE_CSV = "https://raw.githubusercontent.com/EnzoMoulin/diretorio-contatos/main/tmp-import/";
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
  Logger.log(resumo.join("\n"));
  return resumo;
}
