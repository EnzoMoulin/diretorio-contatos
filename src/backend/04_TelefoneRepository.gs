/**
 * ==========================================================
 * DIRETÓRIO DE CONTATOS — DEMO
 * Arquivo: 04_TelefoneRepository.gs
 * ==========================================================
 */

class TelefoneRepository {
  constructor() {
    // v3.34 — detecta modelo normalizado (MUNICIPIOS/UNIDADES/SETORES/CONTATOS) vs flat TELEFONES
    this.modoNormalizado = false;
    try { this.modoNormalizado = DB.temModeloNormalizado(); } catch(e){ this.modoNormalizado = false; }
    if (this.modoNormalizado) {
      // Modo normalizado: não exige TELEFONES flat, mas inicializa headers vazios para compat
      this.sheet = null;
      this.headers = [];
      this.map = {};
      // Cache de join será carregado em listar()
    } else {
      this.sheet = DB.telefones();
      this.headers = DB.headers(this.sheet);
      this.map = DB.map(this.sheet);
      if (this.headers.length === 0) {
        throw new Error("A aba TELEFONES não possui cabeçalho.");
      }
    }
  }

  getColIdx(...nomes) {
    for (const nome of nomes) {
      const chave = normalizarChave(nome);
      if (this.map[chave] !== undefined) {
        return this.map[chave] - 1;
      }
    }
    return -1;
  }

  listar() {
    const cache = CACHE.obter(CACHE.chaveTelefones());
    if (Array.isArray(cache)) return cache;
    // v3.34 — modo normalizado: join MUNICIPIOS+UNIDADES+SETORES+CONTATOS → flat virtual
    if (this.modoNormalizado) {
      const resultado = this.listarNormalizado();
      CACHE.salvar(CACHE.chaveTelefones(), resultado, CONFIG.CACHE.TEMPO_PADRAO);
      return resultado;
    }
    const dados = DB.read(this.sheet);
    const resultado = dados.map(linha => this.rowToObject(linha));
    CACHE.salvar(CACHE.chaveTelefones(), resultado, CONFIG.CACHE.TEMPO_PADRAO);
    return resultado;
  }

  listarNormalizado() {
    // V4: MUNICIPIOS -> FORUM -> UNIDADES -> SETORES -> CONTATOS
    const shMun = DB.municipiosOuNulo();
    const shForum = DB.forumOuNulo();
    const shUni = DB.unidadesOuNulo();
    const shSet = DB.setoresOuNulo();
    const shCon = DB.contatosOuNulo();
    if (!shCon) return [];
    const dadosCon = DB.read(shCon);
    const mapCon = DB.map(shCon);
    const dadosSet = shSet ? DB.read(shSet) : [];
    const mapSet = shSet ? DB.map(shSet) : {};
    const dadosUni = shUni ? DB.read(shUni) : [];
    const mapUni = shUni ? DB.map(shUni) : {};
    const dadosForum = shForum ? DB.read(shForum) : [];
    const mapForum = shForum ? DB.map(shForum) : {};
    const dadosMun = shMun ? DB.read(shMun) : [];
    const mapMun = shMun ? DB.map(shMun) : {};
    // Indices CONTATOS (UO-only: UNIDADE_ID/SETOR_ID removidas)
    const idxConId = mapCon.ID;
    const idxConForum = mapCon.FORUMID || mapCon.FORUM;
    const idxConNo = mapCon.UNIDADEORGANIZACIONALID || mapCon.UNIDADE_ORGANIZACIONAL_ID;
    // Mapa da árvore UNIDADES_ORGANIZACIONAIS: unidade/setor derivados via PAI_ID
    const shUo = (typeof DB.unidadesOrganizacionaisOuNulo === "function") ? DB.unidadesOrganizacionaisOuNulo() : null;
    const dadosUo = shUo ? DB.read(shUo) : [];
    const mapUo = shUo ? DB.map(shUo) : {};
    const mapNoById = {};
    for (const r of dadosUo) {
      const id = mapUo.ID !== undefined ? textoSeguro(r[mapUo.ID - 1]) : "";
      if (!id) continue;
      mapNoById[id] = {
        nome: mapUo.NOME !== undefined ? textoSeguro(r[mapUo.NOME - 1]) : "",
        paiId: (mapUo.PAIID !== undefined ? textoSeguro(r[mapUo.PAIID - 1]) : "") || (mapUo.PAI_ID !== undefined ? textoSeguro(r[mapUo.PAI_ID - 1]) : ""),
        forumId: mapUo.FORUMID !== undefined ? textoSeguro(r[mapUo.FORUMID - 1]) : "",
        municipioId: (mapUo.MUNICIPIOID !== undefined ? textoSeguro(r[mapUo.MUNICIPIOID - 1]) : "") || (mapUo.MUNICIPIO_ID !== undefined ? textoSeguro(r[mapUo.MUNICIPIO_ID - 1]) : ""),
        endereco: mapUo.ENDERECO !== undefined ? textoSeguro(r[mapUo.ENDERECO - 1]) : "",
        cep: mapUo.CEP !== undefined ? textoSeguro(r[mapUo.CEP - 1]) : ""
      };
    }
    const idxConTipo = mapCon.TIPO;
    const idxConDescr = mapCon.DESCRICAO;
    const idxConValor = mapCon.VALOR;
    const idxConAtivo = mapCon.ATIVO;
    const idxConObs = mapCon.OBSERVACAO;
    const idxConCri = mapCon.DATACRIACAO || mapCon.DATA;
    const idxConAtu = mapCon.DATAATUALIZACAO;
    // Mapas auxiliares
    const mapSetorById = {};
    const idxSetId = mapSet.ID; const idxSetUni = mapSet.UNIDADEID; const idxSetNome = mapSet.NOME; const idxSetEnd = mapSet.ENDERECO; const idxSetCep = mapSet.CEP;
    for (const r of dadosSet) {
      const id = idxSetId !== undefined ? textoSeguro(r[idxSetId - 1]) : "";
      if (!id) continue;
      mapSetorById[id] = {
        nome: idxSetNome !== undefined ? textoSeguro(r[idxSetNome - 1]) : "",
        unidadeId: idxSetUni !== undefined ? textoSeguro(r[idxSetUni - 1]) : "",
        endereco: idxSetEnd !== undefined ? textoSeguro(r[idxSetEnd - 1]) : "",
        cep: idxSetCep !== undefined ? textoSeguro(r[idxSetCep - 1]) : ""
      };
    }
    const mapUniById = {};
    const idxUniId = mapUni.ID; const idxUniForum = mapUni.FORUMID; const idxUniMun = mapUni.MUNICIPIOID; const idxUniNome = mapUni.NOME; const idxUniEnd = mapUni.ENDERECO; const idxUniCep = mapUni.CEP; const idxUniEmail = mapUni.EMAIL;
    for (const r of dadosUni) {
      const id = idxUniId !== undefined ? textoSeguro(r[idxUniId - 1]) : "";
      if (!id) continue;
      mapUniById[id] = {
        nome: idxUniNome !== undefined ? textoSeguro(r[idxUniNome - 1]) : "",
        forumId: idxUniForum !== undefined ? textoSeguro(r[idxUniForum - 1]) : "",
        municipioId: idxUniMun !== undefined ? textoSeguro(r[idxUniMun - 1]) : "",
        endereco: idxUniEnd !== undefined ? textoSeguro(r[idxUniEnd - 1]) : "",
        cep: idxUniCep !== undefined ? textoSeguro(r[idxUniCep - 1]) : "",
        email: idxUniEmail !== undefined ? textoSeguro(r[idxUniEmail - 1]) : ""
      };
    }
    const mapForumById = {};
    const idxForumId = mapForum.ID; const idxForumMun = mapForum.MUNICIPIOID; const idxForumNome = mapForum.NOME; const idxForumEnd = mapForum.ENDERECO; const idxForumCep = mapForum.CEP; const idxForumEmail = mapForum.EMAIL;
    for (const r of dadosForum) {
      const id = idxForumId !== undefined ? textoSeguro(r[idxForumId - 1]) : "";
      if (!id) continue;
      mapForumById[id] = {
        nome: idxForumNome !== undefined ? textoSeguro(r[idxForumNome - 1]) : "",
        municipioId: idxForumMun !== undefined ? textoSeguro(r[idxForumMun - 1]) : "",
        endereco: idxForumEnd !== undefined ? textoSeguro(r[idxForumEnd - 1]) : "",
        cep: idxForumCep !== undefined ? textoSeguro(r[idxForumCep - 1]) : "",
        email: idxForumEmail !== undefined ? textoSeguro(r[idxForumEmail - 1]) : ""
      };
    }
    const mapMunById = {};
    const idxMunId = mapMun.ID; const idxMunNome = mapMun.NOME; const idxMunMicro = mapMun.MICRORREGIAO;
    for (const r of dadosMun) {
      const id = idxMunId !== undefined ? textoSeguro(r[idxMunId - 1]) : "";
      if (!id) continue;
      mapMunById[id] = {
        nome: idxMunNome !== undefined ? textoSeguro(r[idxMunNome - 1]) : "",
        microrregiao: idxMunMicro !== undefined ? textoSeguro(r[idxMunMicro - 1]) : ""
      };
    }
    const resultado = [];
    for (const r of dadosCon) {
      const id = idxConId !== undefined ? textoSeguro(r[idxConId - 1]) : "";
      if (!id) continue;
      const forumIdRaw = idxConForum !== undefined ? textoSeguro(r[idxConForum - 1]) : "";
      const noIdRaw = idxConNo !== undefined ? textoSeguro(r[idxConNo - 1]) : "";
      // UO-only: unidade/setor derivados da árvore (PAI_ID)
      const noRef = noIdRaw ? (mapNoById[noIdRaw] || null) : null;
      const setor = (noRef && noRef.paiId) ? { nome: noRef.nome, unidadeId: noRef.paiId, endereco: noRef.endereco, cep: noRef.cep } : null;
      const paiRef = (noRef && noRef.paiId) ? (mapNoById[noRef.paiId] || null) : null;
      const unidadeIdEfetivo = noRef ? (noRef.paiId || noIdRaw) : "";
      const uni = noRef ? { nome: paiRef ? paiRef.nome : noRef.nome, forumId: paiRef ? (paiRef.forumId || noRef.forumId) : noRef.forumId, municipioId: noRef.municipioId, endereco: paiRef ? (paiRef.endereco || noRef.endereco) : noRef.endereco, cep: paiRef ? (paiRef.cep || noRef.cep) : noRef.cep, email: "" } : null;
      const setorIdRaw = setor ? noIdRaw : "";
      const tipoRaw = idxConTipo !== undefined ? textoSeguro(r[idxConTipo - 1]) : "";
      const descr = idxConDescr !== undefined ? textoSeguro(r[idxConDescr - 1]) : "";
      const valorRaw = idxConValor !== undefined ? textoSeguro(r[idxConValor - 1]) : "";
      const ativoRaw = idxConAtivo !== undefined ? r[idxConAtivo - 1] : "TRUE";
      const obs = idxConObs !== undefined ? textoSeguro(r[idxConObs - 1]) : "";
      // Resolve MUNICIPIOS -> FORUM -> UNIDADES_ORGANIZACIONAIS (árvore) -> CONTATOS
      // (setor/uni/unidadeIdEfetivo já derivados da árvore acima via PAI_ID)
      let forumIdEfetivo = uni ? uni.forumId : forumIdRaw;
      if (!forumIdEfetivo && forumIdRaw) forumIdEfetivo = forumIdRaw;
      let forum = forumIdEfetivo ? (mapForumById[forumIdEfetivo] || { nome: forumIdEfetivo, municipioId: "", endereco: "", cep: "", email: "" }) : null;
      let municipioIdEfetivo = forum ? forum.municipioId : "";
      if (!municipioIdEfetivo && uni && uni.municipioId) municipioIdEfetivo = uni.municipioId;
      let mun = municipioIdEfetivo ? (mapMunById[municipioIdEfetivo] || { nome: municipioIdEfetivo, microrregiao: "" }) : { nome: "", microrregiao: "" };
      const munNome = mun.nome || municipioIdEfetivo || "";
      const microrregiao = mun.microrregiao || "";
      const endereco = (setor && setor.endereco) ? setor.endereco : (uni && uni.endereco ? uni.endereco : (forum ? forum.endereco : ""));
      const forumNome = forum ? forum.nome : "";
      const uniNome = uni ? uni.nome : "";
      const setorNome = setor ? setor.nome : (setorIdRaw && !setor ? setorIdRaw : "");
      let localidade = munNome;
      if (forumNome && forumNome !== munNome) {
        localidade = munNome ? (munNome + " (" + forumNome + ")") : forumNome;
        if (uniNome && uniNome !== forumNome) localidade += " - " + uniNome;
      } else if (uniNome) {
        localidade = munNome ? (munNome + " (" + uniNome + ")") : uniNome;
      }
      const ativoBool = paraBoolean(ativoRaw);
      const tipo = textoSeguro(tipoRaw);
      let numero = "", ramal = "", whatsapp = "", email = "";
      const valor = textoSeguro(valorRaw);
      const tipoNorm = normalizarChave(tipo);
      if (tipoNorm === "TELEFONE") numero = valor;
      else if (tipoNorm === "RAMAL") ramal = valor;
      else if (tipoNorm === "WHATSAPP") whatsapp = valor;
      else if (tipoNorm === "EMAIL" || tipoNorm === "E_MAIL") email = valor;
      else numero = valor;
      resultado.push({
        ID: id, id: id,
        microrregiao: microrregiao,
        localidade: localidade,
        municipio: munNome,
        municipioId: municipioIdEfetivo,
        forum: forumNome,
        forumId: forumIdEfetivo || "",
        unidade: uniNome,
        unidadeId: unidadeIdEfetivo || "",
        setor: setorNome,
        setorId: setorIdRaw,
        tipo: tipo,
        numero: numero,
        ramal: ramal,
        whatsapp: whatsapp,
        email: email,
        endereco: endereco,
        status: ativoBool ? "ATIVO" : "INATIVO",
        observacao: descr || obs,
        descricao: descr,
        valor: valor,
        DATA_CRIACAO: idxConCri !== undefined ? r[idxConCri - 1] : "",
        DATA_ATUALIZACAO: idxConAtu !== undefined ? r[idxConAtu - 1] : ""
      });
    }
    return resultado;
  }

  obter(id) {
    const idBusca = textoSeguro(id);
    if (!idBusca) return null;
    return this.listar().find(item => textoSeguro(item.ID || item.id) === idBusca) || null;
  }

  buscarPorId(id) { return this.obter(id); }

  pesquisar(texto) {
    const termo = limparTexto(texto);
    if (!termo) return this.listar();
    return this.listar().filter(item =>
      Object.values(item).map(valor => limparTexto(valor)).join(" ").includes(termo)
    );
  }

  inserir(dados) {
    // v3.34 — se modo normalizado, insere em CONTATOS (UO-only)
    if (this.modoNormalizado) {
      return this.inserirNormalizado(dados);
    }
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const entrada = ehObjeto(dados) ? dados : {};
      const id = new IdService().novoTelefone(this.sheet);
      const momento = new Date();

      const registro = {
        ID: id,
        id: id,
        microrregiao: textoSeguro(valorObjeto(entrada, "microrregiao", "Microrregiao")),
        localidade: textoSeguro(valorObjeto(entrada, "localidade", "Localidade")),
        setor: textoSeguro(valorObjeto(entrada, "setor", "Setor")),
        tipo: textoSeguro(valorObjeto(entrada, "tipo", "Tipo")),
        numero: textoSeguro(valorObjeto(entrada, "numero", "Numero", "TELEFONE", "Telefone")),
        ramal: textoSeguro(valorObjeto(entrada, "ramal", "Ramal")),
        whatsapp: textoSeguro(valorObjeto(entrada, "whatsapp", "Whatsapp", "WhatsApp")),
        email: textoSeguro(valorObjeto(entrada, "email", "EMAIL", "E_MAIL")),          // ← NOVO
        endereco: textoSeguro(valorObjeto(entrada, "endereco", "ENDERECO")),            // ← NOVO
        status: textoSeguro(valorObjeto(entrada, "status", "Status")) || "ATIVO",
        observacao: textoSeguro(valorObjeto(entrada, "observacao", "Observacao")),
        DATA_CRIACAO: momento,
        DATA_ATUALIZACAO: momento
      };

      new ValidationService().validarTelefone(registro);
      const linha = this.linhaDoObjeto(registro);
      this.sheet.getRange(this.sheet.getLastRow() + 1, 1, 1, linha.length).setValues([linha]);
      SpreadsheetApp.flush();
      CACHE.limparTelefones();
      this.registrarHistoricoSeguro(id, "CRIACAO", {}, registro);
      return serializarParaCliente(registro);
    } finally {
      lock.releaseLock();
    }
  }

  inserirNormalizado(dados) {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const entrada = ehObjeto(dados) ? dados : {};
      // UO-only: vinculo e UNIDADE_ORGANIZACIONAL_ID (legado UNIDADE_ID/SETOR_ID resolvido na arvore)
      let noId = textoSeguro(valorObjeto(entrada, "unidadeOrganizacionalId", "UNIDADE_ORGANIZACIONAL_ID", "unidade_organizacional_id", "noId", "no", "no_id"));
      if (!noId) {
        const legado = textoSeguro(valorObjeto(entrada, "setorId", "SETOR_ID", "setor_id", "unidadeId", "UNIDADE_ID", "unidade_id", "setor", "Setor"));
        if (legado && uoResolverNo(legado)) noId = legado;
        else if (legado) {
          const porNome = uoResolverPorNome(legado, textoSeguro(valorObjeto(entrada, "forum", "FORUM", "Forum", "localidade", "Localidade")));
          if (porNome) noId = porNome.id;
        }
      }
      let forumId = textoSeguro(valorObjeto(entrada, "forumId", "FORUM_ID", "forum_id", "forum"));
      let noRef = noId ? uoResolverNo(noId) : null;
      if (noRef && !forumId) forumId = noRef.forumId;
      if (!forumId && !noId) throw new Error("Informe Forum ou No (FORUM_ID ou UNIDADE_ORGANIZACIONAL_ID).");
      // (Compat por nome resolvido acima via uoResolverPorNome; auto-complete via uoResolverNo.)
      // (Auto-complete legado removido: forum derivado do no via uoResolverNo.)
      const tipo = textoSeguro(valorObjeto(entrada, "tipo", "Tipo")) || "Telefone";
      const valor = textoSeguro(valorObjeto(entrada, "valor", "VALOR", "numero", "Numero", "telefone", "Telefone", "ramal", "Ramal", "whatsapp", "Whatsapp", "email", "EMAIL")) || textoSeguro(valorObjeto(entrada, "numero"));
      const descricao = textoSeguro(valorObjeto(entrada, "descricao", "DESCRICAO", "observacao", "Observacao"));
      const id = new IdService().novoContato(DB.contatos());
      const momento = new Date();
      const shCon = DB.contatos();
      const headers = DB.headers(shCon);
      const ativo = "TRUE";
      const linhaObj = {};
      headers.forEach(h => {
        const k = normalizarChave(h);
        if (k === "ID") linhaObj[h] = id;
        else if (k === "FORUMID") linhaObj[h] = forumId;
        else if (k === "UNIDADEORGANIZACIONALID") linhaObj[h] = noId;
        else if (k === "TIPO") linhaObj[h] = tipo;
        else if (k === "DESCRICAO") linhaObj[h] = descricao;
        else if (k === "VALOR") linhaObj[h] = valor;
        else if (k === "ATIVO") linhaObj[h] = ativo;
        else if (k === "DATACRIACAO") linhaObj[h] = momento;
        else if (k === "DATAATUALIZACAO") linhaObj[h] = momento;
        else if (k === "OBSERVACAO") linhaObj[h] = descricao;
        else if (k === "ORDEM") linhaObj[h] = valorObjeto(entrada, "ordem", "ORDEM") || "";
        else linhaObj[h] = "";
      });
      const linha = headers.map(h => linhaObj[h] !== undefined ? linhaObj[h] : "");
      shCon.getRange(shCon.getLastRow() + 1, 1, 1, linha.length).setValues([linha]);
      SpreadsheetApp.flush(); CACHE.limparTelefones();
      const noReg = noRef || {}; const registro = { ID: id, id: id, forumId: forumId, unidadeOrganizacionalId: noId, unidadeId: noReg.paiId || noId, setorId: noReg.paiId ? noId : "", tipo: tipo, valor: valor, descricao: descricao, status: "ATIVO", DATA_CRIACAO: momento, DATA_ATUALIZACAO: momento };
      this.registrarHistoricoSeguro(id, "CRIACAO", {}, registro);
      return serializarParaCliente(registro);
    } finally { lock.releaseLock(); }
  }

  atualizar(id, dados) {
    // v3.34 — modo normalizado
    if (this.modoNormalizado) { return this.atualizarNormalizado(id, dados); }
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const idBusca = textoSeguro(id);
      if (!idBusca) throw new Error("ID do telefone é obrigatório.");

      const entrada = ehObjeto(dados) ? dados : {};
      const atual = this.obter(idBusca);
      if (!atual) throw new Error("Telefone não encontrado para o ID: " + idBusca);

      const escolherCampo = (campo, fallback) => {
        if (possuiCampo(entrada, campo)) return textoSeguro(valorObjeto(entrada, campo));
        return fallback;
      };

      const novo = {
        ID: textoSeguro(atual.ID || atual.id) || idBusca,
        id: textoSeguro(atual.ID || atual.id) || idBusca,
        microrregiao: escolherCampo("microrregiao", textoSeguro(atual.microrregiao)),
        localidade: escolherCampo("localidade", textoSeguro(atual.localidade)),
        setor: escolherCampo("setor", textoSeguro(atual.setor)),
        tipo: escolherCampo("tipo", textoSeguro(atual.tipo)),
        numero: escolherCampo("numero", textoSeguro(atual.numero)),
        ramal: escolherCampo("ramal", textoSeguro(atual.ramal)),
        whatsapp: escolherCampo("whatsapp", textoSeguro(atual.whatsapp)),
        email: escolherCampo("email", textoSeguro(atual.email)),          // ← NOVO
        endereco: escolherCampo("endereco", textoSeguro(atual.endereco)), // ← NOVO
        status: escolherCampo("status", textoSeguro(atual.status)) || "ATIVO",
        observacao: escolherCampo("observacao", textoSeguro(atual.observacao)),
        DATA_CRIACAO: dataValida(atual.DATACRIACAO, new Date()),
        DATA_ATUALIZACAO: new Date()
      };

      new ValidationService().validarTelefone(novo, idBusca);
      const numeroLinha = this.buscarLinha(idBusca);
      if (!numeroLinha) throw new Error("Linha do telefone não encontrada.");

      const linha = this.linhaDoObjeto(novo);
      this.sheet.getRange(numeroLinha, 1, 1, linha.length).setValues([linha]);
      SpreadsheetApp.flush();
      CACHE.limparTelefones();
      this.registrarHistoricoSeguro(idBusca, "EDICAO", atual, novo);
      return serializarParaCliente(novo);
    } finally {
      lock.releaseLock();
    }
  }

  excluirNormalizado(id) {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const idBusca = textoSeguro(id); if (!idBusca) throw new Error("ID obrigatório.");
      const shCon = DB.contatos(); const dados = DB.read(shCon); const mapa = DB.map(shCon);
      const idxId = mapa.ID; if (!idxId) throw new Error("CONTATOS sem ID");
      let linhaNum = null, atual = null;
      for (let i=0;i<dados.length;i++) {
        if (textoSeguro(dados[i][idxId - 1]) === idBusca) { linhaNum = i+2; atual = dados[i]; break; }
      }
      if (!linhaNum) throw new Error("Contato não encontrado.");
      shCon.deleteRow(linhaNum); CACHE.limparTelefones();
      this.registrarHistoricoSeguro(idBusca, "EXCLUSAO", {ID:idBusca}, {});
      return true;
    } finally { lock.releaseLock(); }
  }

  atualizarNormalizado(id, dados) {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const idBusca = textoSeguro(id); if (!idBusca) throw new Error("ID obrigatório.");
      const entrada = ehObjeto(dados) ? dados : {};
      const shCon = DB.contatos(); const headers = DB.headers(shCon); const mapCon = DB.map(shCon);
      const dadosAll = DB.read(shCon); const idxId = mapCon.ID;
      let linhaNum = null; let atualRow = null;
      for (let i=0;i<dadosAll.length;i++) if (textoSeguro(dadosAll[i][idxId - 1]) === idBusca) { linhaNum = i+2; atualRow = dadosAll[i]; break; }
      if (!linhaNum) throw new Error("Contato não encontrado: " + idBusca);
      const tipo = possuiCampo(entrada, "tipo") ? textoSeguro(valorObjeto(entrada, "tipo")) : textoSeguro(atualRow[mapCon.TIPO - 1]);
      const valor = possuiCampo(entrada, "valor") || possuiCampo(entrada, "numero") ? textoSeguro(valorObjeto(entrada, "valor", "VALOR", "numero", "Numero")) : textoSeguro(atualRow[mapCon.VALOR - 1]);
      const descr = possuiCampo(entrada, "descricao") ? textoSeguro(valorObjeto(entrada, "descricao", "DESCRICAO")) : (mapCon.DESCRICAO !== undefined ? textoSeguro(atualRow[mapCon.DESCRICAO - 1]) : "");
      const ativo = possuiCampo(entrada, "status") ? (paraBoolean(valorObjeto(entrada, "status")) ? "TRUE" : "FALSE") : textoSeguro(atualRow[mapCon.ATIVO - 1]) || "TRUE";
      let forumId = possuiCampo(entrada, "forumId", "FORUM_ID") ? textoSeguro(valorObjeto(entrada, "forumId", "FORUM_ID")) : (mapCon.FORUMID !== undefined ? textoSeguro(atualRow[mapCon.FORUMID - 1]) : "");
      let noId = possuiCampo(entrada, "unidadeOrganizacionalId", "UNIDADE_ORGANIZACIONAL_ID", "noId", "no") ? textoSeguro(valorObjeto(entrada, "unidadeOrganizacionalId", "UNIDADE_ORGANIZACIONAL_ID", "noId", "no")) : (mapCon.UNIDADEORGANIZACIONALID !== undefined ? textoSeguro(atualRow[mapCon.UNIDADEORGANIZACIONALID - 1]) : "");
      if (!noId && (possuiCampo(entrada, "unidadeId", "UNIDADE_ID") || possuiCampo(entrada, "setorId", "SETOR_ID"))) {
        const legado = textoSeguro(valorObjeto(entrada, "setorId", "SETOR_ID", "unidadeId", "UNIDADE_ID"));
        if (legado && uoResolverNo(legado)) noId = legado;
      }
      let noRef = noId ? uoResolverNo(noId) : null;
      if (noRef && !forumId) forumId = noRef.forumId;
      // (Derivação legada removida: forum derivado do nó via uoResolverNo.)
      const momento = new Date();
      const linhaObj = {};
      headers.forEach(h => {
        const k = normalizarChave(h);
        if (k === "ID") linhaObj[h] = idBusca;
        else if (k === "FORUMID") linhaObj[h] = forumId;
        else if (k === "UNIDADEORGANIZACIONALID") linhaObj[h] = noId;
        else if (k === "TIPO") linhaObj[h] = tipo;
        else if (k === "DESCRICAO") linhaObj[h] = descr;
        else if (k === "VALOR") linhaObj[h] = valor;
        else if (k === "ATIVO") linhaObj[h] = ativo;
        else if (k === "DATAATUALIZACAO") linhaObj[h] = momento;
        else if (k === "DATACRIACAO") linhaObj[h] = atualRow[mapCon.DATACRIACAO - 1] || momento;
        else if (k === "ORDEM") linhaObj[h] = possuiCampo(entrada, "ordem", "ORDEM") ? textoSeguro(valorObjeto(entrada, "ordem", "ORDEM")) : (mapCon.ORDEM !== undefined ? textoSeguro(atualRow[mapCon.ORDEM - 1]) : "");
        else if (k === "OBSERVACAO") linhaObj[h] = possuiCampo(entrada, "observacao", "OBSERVACAO") ? textoSeguro(valorObjeto(entrada, "observacao", "OBSERVACAO")) : (mapCon.OBSERVACAO !== undefined ? textoSeguro(atualRow[mapCon.OBSERVACAO - 1]) : descr);
        else linhaObj[h] = atualRow[mapCon[k] - 1] !== undefined ? atualRow[mapCon[k] - 1] : "";
      });
      const linha = headers.map(h => linhaObj[h] !== undefined ? linhaObj[h] : "");
      shCon.getRange(linhaNum, 1, 1, linha.length).setValues([linha]);
      SpreadsheetApp.flush(); CACHE.limparTelefones();
      const noRef2 = noRef || {}; const novo = { ID: idBusca, id: idBusca, forumId: forumId, unidadeOrganizacionalId: noId, unidadeId: noRef2.paiId || noId, setorId: noRef2.paiId ? noId : "", tipo: tipo, valor: valor, descricao: descr, status: ativo === "TRUE" ? "ATIVO" : "INATIVO" };
      this.registrarHistoricoSeguro(idBusca, "EDICAO", {ID:idBusca}, novo);
      return serializarParaCliente(novo);
    } finally { lock.releaseLock(); }
  }

  excluir(id) {
    // v3.34 — modo normalizado
    if (this.modoNormalizado) { return this.excluirNormalizado(id); }
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const idBusca = textoSeguro(id);
      if (!idBusca) throw new Error("ID do telefone é obrigatório.");
      const atual = this.obter(idBusca);
      if (!atual) throw new Error("Telefone não encontrado.");
      const linha = this.buscarLinha(idBusca);
      if (!linha) throw new Error("Linha do telefone não encontrada.");
      this.sheet.deleteRow(linha);
      CACHE.limparTelefones();
      this.registrarHistoricoSeguro(idBusca, "EXCLUSAO", atual, {});
      return true;
    } finally {
      lock.releaseLock();
    }
  }

  registrarHistoricoSeguro(telefoneId, acao, antes, depois) {
    try {
      new HistoryService().registrar(telefoneId, acao, antes, depois);
    } catch (erro) {
      console.warn("Falha ao registrar histórico:", erro);
    }
  }

  rowToObject(linha) {
    const getVal = (...nomes) => {
      const idx = this.getColIdx(...nomes);
      if (idx === -1 || linha[idx] === undefined || linha[idx] === null) return "";
      return linha[idx];
    };

    return {
      ID: getVal("ID"),
      id: getVal("ID"),
      microrregiao: getVal("MICRORREGIAO", "Microrregiao"),
      localidade: getVal("LOCALIDADE"),
      setor: getVal("SETOR"),
      tipo: getVal("TIPO"),
      numero: getVal("TELEFONE", "NUMERO", "Telefone", "Numero"),
      ramal: getVal("RAMAL"),
      whatsapp: getVal("WHATSAPP", "Whatsapp", "WhatsApp"),
      email: getVal("E_MAIL", "EMAIL"),         // ← NOVO
      endereco: getVal("ENDERECO"),             // ← NOVO
      status: getVal("STATUS") || "ATIVO",
      observacao: getVal("OBSERVACAO", "Observacao"),
      DATA_CRIACAO: getVal("CRIADOEM", "DATA_CRIACAO", "CREATED_AT", "CREATEDAT"),
      DATA_ATUALIZACAO: getVal("ATUALIZADOEM", "DATA_ATUALIZACAO", "UPDATED_AT", "UPDATEDAT")
    };
  }

  objectToRow(objeto) { return this.linhaDoObjeto(objeto); }

  buscarLinha(id) {
    const idBusca = textoSeguro(id);
    if (!idBusca) return null;
    if (this.modoNormalizado) {
      const shCon = DB.contatosOuNulo(); if (!shCon) return null;
      const idxId = DB.map(shCon).ID; if (!idxId) return null;
      const dados = DB.read(shCon);
      for (let i=0;i<dados.length;i++) if (textoSeguro(dados[i][idxId - 1]) === idBusca) return i+2;
      return null;
    }
    const ultimaLinha = this.sheet.getLastRow();
    if (ultimaLinha <= 1) return null;
    const idxID = this.map["ID"];
    if (!idxID) throw new Error("A aba TELEFONES não possui a coluna ID.");
    const dados = this.sheet.getRange(2, idxID, ultimaLinha - 1, 1).getValues();
    for (let i = 0; i < dados.length; i++) {
      if (textoSeguro(dados[i][0]) === idBusca) return i + 2;
    }
    return null;
  }

  linhaDoObjeto(objeto) {
    return this.headers.map(header => {
      const chave = normalizarChave(header);
      switch (chave) {
        case "ID": return textoSeguro(valorObjeto(objeto, "ID", "id"));
        case "MICROREGIAO": return textoSeguro(valorObjeto(objeto, "microrregiao", "Microrregiao"));
        case "LOCALIDADE": return textoSeguro(valorObjeto(objeto, "localidade", "Localidade"));
        case "SETOR": return textoSeguro(valorObjeto(objeto, "setor", "Setor"));
        case "TIPO": return textoSeguro(valorObjeto(objeto, "tipo", "Tipo"));
        case "NUMERO":
        case "TELEFONE":
          return textoSeguro(valorObjeto(objeto, "numero", "Numero", "TELEFONE", "Telefone"));
        case "RAMAL": return textoSeguro(valorObjeto(objeto, "ramal", "Ramal"));
        case "WHATSAPP": return textoSeguro(valorObjeto(objeto, "whatsapp", "Whatsapp", "WhatsApp"));
        case "E_MAIL": case "EMAIL": return textoSeguro(valorObjeto(objeto, "email", "EMAIL", "E_MAIL"));
        case "ENDERECO": return textoSeguro(valorObjeto(objeto, "endereco", "ENDERECO"));
        case "STATUS": return textoSeguro(valorObjeto(objeto, "status", "Status")) || "ATIVO";
        case "OBSERVACAO": return textoSeguro(valorObjeto(objeto, "observacao", "Observacao"));
        case "CRIADOEM": case "DATACRIACAO": case "CREATEDAT":
          return dataValida(valorObjeto(objeto, "DATA_CRIACAO", "criadoEm", "created_at", "createdAt"), new Date());
        case "ATUALIZADOEM": case "DATAATUALIZACAO": case "UPDATEDAT":
          return dataValida(valorObjeto(objeto, "DATA_ATUALIZACAO", "atualizadoEm", "updated_at", "updatedAt"), new Date());
        default: return valorObjeto(objeto, header) || "";
      }
    });
  }
}
/** UO-only: resolve um no da arvore UNIDADES_ORGANIZACIONAIS por ID. */
function uoResolverNo(idNo) {
  try {
    if (typeof DB === "undefined" || typeof DB.unidadesOrganizacionaisOuNulo !== "function") return null;
    const sh = DB.unidadesOrganizacionaisOuNulo(); if (!sh) return null;
    const mapa = DB.map(sh); if (mapa.ID === undefined) return null;
    const alvo = textoSeguro(idNo); if (!alvo) return null;
    const dados = DB.read(sh);
    for (const r of dados) {
      if (textoSeguro(r[mapa.ID - 1]) !== alvo) continue;
      const g = function(ch) { const i = mapa[ch]; return i !== undefined ? textoSeguro(r[i - 1]) : ""; };
      return { id: alvo, paiId: g("PAIID") || g("PAI_ID"), forumId: g("FORUMID"), municipioId: g("MUNICIPIOID") || g("MUNICIPIO_ID"), nome: g("NOME") };
    }
  } catch (e) {}
  return null;
}

/** UO-only: resolve um no pelo nome (compat com entradas legadas por nome). */
function uoResolverPorNome(nomeNo, nomeForum) {
  try {
    if (typeof DB === "undefined" || typeof DB.unidadesOrganizacionaisOuNulo !== "function") return null;
    const sh = DB.unidadesOrganizacionaisOuNulo(); if (!sh) return null;
    const mapa = DB.map(sh); if (mapa.ID === undefined || mapa.NOME === undefined) return null;
    const alvo = normalizarChave(nomeNo); if (!alvo) return null;
    const dados = DB.read(sh);
    let achado = null;
    for (const r of dados) {
      if (normalizarChave(r[mapa.NOME - 1]) !== alvo) continue;
      const g = function(ch) { const i = mapa[ch]; return i !== undefined ? textoSeguro(r[i - 1]) : ""; };
      const no = { id: textoSeguro(r[mapa.ID - 1]), paiId: g("PAIID") || g("PAI_ID"), forumId: g("FORUMID"), nome: textoSeguro(r[mapa.NOME - 1]) };
      if (nomeForum) {
        try {
          const shF = DB.forumOuNulo();
          if (shF) {
            const mF = DB.map(shF);
            let casa = false;
            for (const f of DB.read(shF)) {
              if (mF.ID !== undefined && textoSeguro(f[mF.ID - 1]) === no.forumId && mF.NOME !== undefined && normalizarChave(f[mF.NOME - 1]) === normalizarChave(nomeForum)) { casa = true; break; }
            }
            if (casa) return no;
            continue;
          }
        } catch (e) {}
        return no;
      }
      if (!achado) achado = no;
    }
    return achado;
  } catch (e) {}
  return null;
}
