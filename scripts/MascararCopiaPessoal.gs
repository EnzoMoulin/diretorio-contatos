/**
 * ==========================================================
 * MÁSCARA DE DADOS — uso pessoal, UMA única vez
 * ==========================================================
 * Rode esta função NA CÓPIA da planilha (conta Google pessoal),
 * NUNCA na planilha original do TJES.
 *
 * O que faz:
 *  - TELEFONE/WHATSAPP: mantém DDD + prefixo, troca o resto por XXXX
 *    ex.: (27) 3149-2600 -> (27) 3149-XXXX
 *  - RAMAL: troca tudo por XXXX
 *  - EMAIL: mantém o usuário, troca o domínio para @exemplo.jus.br
 *    ex.: 1civel-vitoria@tjes.jus.br -> 1civel-vitoria@exemplo.jus.br
 *  - USUARIOS: apaga todas as linhas de dados (mantém o cabeçalho)
 *
 * Como usar: cole este arquivo no Apps Script da planilha-cópia,
 * execute mascararCopiaPessoal() e confira o resumo no Log.
 */

function mascararCopiaPessoal() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var resumo = [];

  // ---- aba CONTATOS (layout: TIPO col 6, VALOR col 8) ----
  var contatos = ss.getSheetByName(CONFIG.SHEETS.CONTATOS);
  if (contatos && contatos.getLastRow() > 1) {
    var n = contatos.getLastRow() - 1;
    var tipos = contatos.getRange(2, 6, n, 1).getValues();
    var valores = contatos.getRange(2, 8, n, 1).getValues();
    var tocados = 0;
    for (var i = 0; i < n; i++) {
      var tipo = String(tipos[i][0] || "").trim().toUpperCase();
      var valor = String(valores[i][0] || "").trim();
      if (!valor) continue;
      var novo = valor;
      if (tipo === "TELEFONE" || tipo === "WHATSAPP") {
        // "(27) 3149-2600" -> "(27) 3149-XXXX"; sem hífen, mascara os 4 últimos dígitos
        novo = valor.replace(/-\s*[\d\s]+$/, "-XXXX");
        if (novo === valor) novo = valor.replace(/\d{4}(?=\D*$)/, "XXXX");
      } else if (tipo === "RAMAL") {
        novo = "XXXX";
      } else if (tipo === "EMAIL") {
        var arroba = valor.indexOf("@");
        if (arroba > 0) novo = valor.slice(0, arroba) + "@exemplo.jus.br";
      }
      if (novo !== valor) {
        valores[i][0] = novo;
        tocados++;
      }
    }
    contatos.getRange(2, 8, n, 1).setValues(valores);
    resumo.push("CONTATOS: " + tocados + " valores mascarados em " + n + " linhas");
  } else {
    resumo.push("CONTATOS: aba não encontrada ou vazia");
  }

  // ---- aba USUARIOS: apaga dados, mantém cabeçalho ----
  var usuarios = ss.getSheetByName(CONFIG.SHEETS.USUARIOS);
  if (usuarios && usuarios.getLastRow() > 1) {
    var apagadas = usuarios.getLastRow() - 1;
    usuarios.deleteRows(2, apagadas);
    resumo.push("USUARIOS: " + apagadas + " linhas apagadas (cabeçalho mantido)");
  } else {
    resumo.push("USUARIOS: aba não encontrada ou já vazia");
  }

  Logger.log(resumo.join("\n"));
  return resumo;
}
