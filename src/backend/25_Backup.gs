/**
 * ==========================================================
 * DIRETÓRIO DE CONTATOS — DEMO
 * Arquivo: 25_Backup.gs
 * ==========================================================
 *
 * Cópia diária de segurança da planilha vinculada.
 *
 * Uso (nesta ordem, no editor do Apps Script):
 *   1. backupPlanilha(SEGREDO)        — testa a cópia na hora
 *   2. instalarBackupDiario(SEGREDO)  — agenda todo dia de madrugada
 *
 * Mantém as últimas 7 cópias e move as mais antigas para a lixeira.
 */

var BACKUP_PREFIXO = "Backup — ";
var BACKUP_MANTER = 7;

function pastaDaPlanilha_(ss) {
  const pais = DriveApp.getFileById(ss.getId()).getParents();
  return pais.hasNext() ? pais.next() : DriveApp.getRootFolder();
}

function nomeBackup_(data) {
  const tz = Session.getScriptTimeZone() || "America/Sao_Paulo";
  const carimbo = Utilities.formatDate(data, tz, "yyyy-MM-dd");
  return BACKUP_PREFIXO + carimbo;
}

/**
 * Faz uma cópia da planilha agora e limpa as excedentes.
 */
function backupPlanilha(segredo) {
  exigirSegredoConfiguracao_(segredo);
  const ss = DB.getSpreadsheet();
  const pasta = pastaDaPlanilha_(ss);
  const copia = DriveApp.getFileById(ss.getId()).makeCopy(nomeBackup_(new Date()), pasta);

  const mantidas = [];
  const it = pasta.getFiles();
  while (it.hasNext()) {
    const arq = it.next();
    if (arq.getName().indexOf(BACKUP_PREFIXO) === 0) mantidas.push(arq);
  }
  mantidas.sort(function(a, b) { return b.getName() < a.getName() ? -1 : 1; });
  const removidas = [];
  mantidas.slice(BACKUP_MANTER).forEach(function(arq) {
    removidas.push(arq.getName());
    arq.setTrashed(true);
  });

  const mensagem = "Backup criado: " + copia.getName() +
    (removidas.length ? " | antigas para a lixeira: " + removidas.length : " | nada a limpar");
  Logger.log(mensagem);
  return mensagem;
}

/**
 * Agenda o backup diário (madrugada). Rode uma vez.
 */
function instalarBackupDiario(segredo) {
  exigirSegredoConfiguracao_(segredo);
  removerBackupDiario(segredo);
  ScriptApp.newTrigger("backupPlanilhaAgendado")
    .timeBased()
    .everyDays(1)
    .atHour(3)
    .create();
  const mensagem = "Backup diário instalado (03h).";
  Logger.log(mensagem);
  return mensagem;
}

/** Alvo do gatilho diário (sem segredo: só o dono do projeto edita gatilhos). */
function backupPlanilhaAgendado() {
  const ss = DB.getSpreadsheet();
  const pasta = pastaDaPlanilha_(ss);
  const copia = DriveApp.getFileById(ss.getId()).makeCopy(nomeBackup_(new Date()), pasta);
  const lista = [];
  const it = pasta.getFiles();
  while (it.hasNext()) {
    const arq = it.next();
    if (arq.getName().indexOf(BACKUP_PREFIXO) === 0) lista.push(arq);
  }
  lista.sort(function(a, b) { return b.getName() < a.getName() ? -1 : 1; });
  lista.slice(BACKUP_MANTER).forEach(function(arq) { arq.setTrashed(true); });
  Logger.log("Backup agendado criado: " + copia.getName());
}

/**
 * Remove o agendamento diário.
 */
function removerBackupDiario(segredo) {
  exigirSegredoConfiguracao_(segredo);
  let n = 0;
  ScriptApp.getProjectTriggers().forEach(function(g) {
    if (g.getHandlerFunction() === "backupPlanilhaAgendado") {
      ScriptApp.deleteTrigger(g);
      n++;
    }
  });
  const mensagem = "Agendamento removido (" + n + ").";
  Logger.log(mensagem);
  return mensagem;
}
