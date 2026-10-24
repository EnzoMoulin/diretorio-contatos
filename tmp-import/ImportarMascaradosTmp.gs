/** TmpImport — uso único: importa os CSVs mascarados (master/tmp-import/) para as 5 abas e renomeia MUNICIPIOS -> COMARCAS. Executar importarMascaradosTudo() no editor e apagar este arquivo depois. */
var _BASE_CSV = "https://raw.githubusercontent.com/EnzoMoulin/diretorio-contatos/master/tmp-import/";
var _ABAS = ["COMARCAS", "FORUM", "UNIDADES_ORGANIZACIONAIS", "CONTATOS", "TELEFONES_UTEIS"];

function importarMascaradosTudo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var velha = ss.getSheetByName("MUNICIPIOS");
  if (velha) velha.setName("COMARCAS");
  var log = [];
  _ABAS.forEach(function (aba) {
    var csv = UrlFetchApp.fetch(_BASE_CSV + aba + ".csv").getContentText("UTF-8");
    var vals = Utilities.parseCsv(csv);
    var sh = ss.getSheetByName(aba) || ss.insertSheet(aba);
    sh.clearContents();
    sh.getRange(1, 1, vals.length, vals[0].length).setValues(vals);
    log.push(aba + ":" + (vals.length - 1));
  });
  Logger.log("OK " + log.join(" "));
}
