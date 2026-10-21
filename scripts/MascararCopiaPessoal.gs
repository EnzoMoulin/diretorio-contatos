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

  // ---- aba CONTATOS (localiza as colunas TIPO e VALOR pelo cabeçalho) ----
  var contatos = ss.getSheetByName(CONFIG.SHEETS.CONTATOS);
  if (contatos && contatos.getLastRow() > 1) {
    var larg = contatos.getLastColumn();
    var cab = contatos.getRange(1, 1, 1, larg).getValues()[0].map(function (h) {
      return String(h || "").trim().toUpperCase();
    });
    var cTipo = cab.indexOf("TIPO") + 1;
    var cValor = cab.indexOf("VALOR") + 1;
    if (!cTipo || !cValor) {
      resumo.push("CONTATOS: colunas TIPO/VALOR não encontradas");
    } else {
      var n = contatos.getLastRow() - 1;
      var tipos = contatos.getRange(2, cTipo, n, 1).getValues();
      var valores = contatos.getRange(2, cValor, n, 1).getValues();
    var tocados = 0;
    for (var i = 0; i < n; i++) {
      var tipo = String(tipos[i][0] || "").trim().toUpperCase().replace(/[^A-Z]/g, "");
      var valor = String(valores[i][0] || "").trim();
      if (!valor || /x{2,}/i.test(valor)) continue; // já mascarado
      var novo = valor;
      if (tipo === "TELEFONE" || tipo === "WHATSAPP") {
        // "(27) 3149-2600" -> "(27) 3149-XXXX"; sem hífen, mascara os 4 últimos dígitos
        novo = valor.replace(/-\s*[\d\s]+$/, "-XXXX");
        if (novo === valor) novo = valor.replace(/\d{4}(?=\D*$)/, "XXXX");
      } else if (tipo === "RAMAL") {
        novo = "XXXX";
      } else if (tipo === "EMAIL") {
        novo = mascararEmail_(valor);
      }
      if (novo !== valor) {
        valores[i][0] = novo;
        tocados++;
      }
    }
    contatos.getRange(2, cValor, n, 1).setValues(valores);
    resumo.push("CONTATOS: " + tocados + " valores mascarados em " + n + " linhas");
    }
  } else {
    resumo.push("CONTATOS: aba não encontrada ou vazia");
  }

  // ---- aba FORUM: mascara a coluna de e-mail ----
  var forum = ss.getSheetByName(CONFIG.SHEETS.FORUM);
  if (forum && forum.getLastRow() > 1) {
    var flarg = forum.getLastColumn();
    var fcab = forum.getRange(1, 1, 1, flarg).getValues()[0].map(function (h) {
      return String(h || "").trim().toUpperCase();
    });
    var cMail = fcab.indexOf("EMAIL") + 1;
    if (cMail) {
      var fn = forum.getLastRow() - 1;
      var fmails = forum.getRange(2, cMail, fn, 1).getValues();
      var ftoc = 0;
      for (var j = 0; j < fn; j++) {
        var fm = mascararEmail_(String(fmails[j][0] || "").trim());
        if (fm !== String(fmails[j][0] || "").trim()) { fmails[j][0] = fm; ftoc++; }
      }
      forum.getRange(2, cMail, fn, 1).setValues(fmails);
      resumo.push("FORUM: " + ftoc + " e-mails mascarados");
    } else {
      resumo.push("FORUM: coluna EMAIL não encontrada");
    }
  }

  // ---- aba TELEFONES_UTEIS: mascara números com 7+ dígitos ----
  var uteis = ss.getSheetByName("TELEFONES_UTEIS");
  if (uteis && uteis.getLastRow() > 1) {
    var ularg = uteis.getLastColumn();
    var ucab = uteis.getRange(1, 1, 1, ularg).getValues()[0].map(function (h) {
      return String(h || "").trim().toUpperCase();
    });
    var cTel = ucab.indexOf("TELEFONE") + 1 || ucab.indexOf("VALOR") + 1 || ucab.indexOf("NUMERO") + 1;
    if (cTel) {
      var un = uteis.getLastRow() - 1;
      var uvals = uteis.getRange(2, cTel, un, 1).getValues();
      var utoc = 0;
      for (var k = 0; k < un; k++) {
        var uv = String(uvals[k][0] || "").trim();
        if (!uv || /x{2,}/i.test(uv)) continue; // já mascarado
        if ((uv.match(/\d/g) || []).length < 7) continue; // 190 etc. ficam
        var unv = uv.replace(/-\s*[\d\s]+$/, "-XXXX");
        if (unv === uv) unv = uv.replace(/[\d\s]{4}(?=\D*$)/, " XXXX");
        if (unv !== uv) { uvals[k][0] = unv; utoc++; }
      }
      uteis.getRange(2, cTel, un, 1).setValues(uvals);
      resumo.push("TELEFONES_UTEIS: " + utoc + " números mascarados");
    } else {
      resumo.push("TELEFONES_UTEIS: coluna de telefone não encontrada");
    }
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

/** Troca o domínio por @exemplo.jus.br; se o usuário parecer nome de pessoa
 *  (ponto sem dígito, ex. joao.silva@), genericiza para contato.demo.N. */
var __nMailDemo = 0;
function mascararEmail_(valor) {
  var arroba = valor.indexOf("@");
  if (arroba <= 0) return valor;
  var caixa = valor.slice(arroba + 1).toLowerCase();
  if (caixa === "exemplo.jus.br") return valor; // já mascarado
  var local = valor.slice(0, arroba);
  if (/^[a-zà-ÿ]+\.[a-zà-ÿ]+$/i.test(local)) {
    __nMailDemo++;
    local = "contato.demo" + __nMailDemo;
  }
  return local + "@exemplo.jus.br";
}
