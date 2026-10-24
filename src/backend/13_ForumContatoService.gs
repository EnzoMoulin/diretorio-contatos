/**
 * ==========================================================
 * SERVIÇO V5 — HIERARQUIA ORGANIZACIONAL DINÂMICA
 * ==========================================================
 *
 * COMARCAS -> FORUM opcional -> UNIDADES_ORGANIZACIONAIS (árvore) -> CONTATOS.
 * A planilha é lida em blocos e a árvore é montada em memória por mapas
 * de adjacência. Não existem leituras N+1 nem profundidade de negócio fixa.
 */

function _fcCampo(mapa, linha, nomes, padrao) {
  const lista = Array.isArray(nomes) ? nomes : [nomes];
  for (const nome of lista) {
    const idx = mapa[normalizarChave(nome)];
    if (idx !== undefined) return linha[idx - 1];
  }
  return padrao === undefined ? "" : padrao;
}

function _fcTexto(valor) { return textoSeguro(valor); }

/** Retorna o primeiro campo existente que também possua valor. */
function _fcPrimeiroValor(mapa, linha, nomes) {
  const lista = Array.isArray(nomes) ? nomes : [nomes];
  for (const nome of lista) {
    const valor = _fcTexto(_fcCampo(mapa, linha, [nome], ""));
    if (valor) return valor;
  }
  return "";
}

function _fcOrdem(valor, fallback) {
  const s = _fcTexto(valor);
  if (!s) return { tipo: 2, valor: fallback };
  const n = Number(s.replace(",", "."));
  if (Number.isFinite(n)) return { tipo: 0, valor: n };
  return { tipo: 1, valor: s.toLocaleUpperCase("pt-BR") };
}

function _fcComparar(a, b) {
  const aa = a.__ordem;
  const bb = b.__ordem;
  if (aa.tipo !== bb.tipo) return aa.tipo - bb.tipo;
  if (aa.valor < bb.valor) return -1;
  if (aa.valor > bb.valor) return 1;
  return (a.__indice || 0) - (b.__indice || 0);
}

function _fcOrdenar(lista) {
  return (Array.isArray(lista) ? lista : []).slice().sort(_fcComparar);
}

function _fcLerAba(sheet) {
  if (!sheet) return [];
  const mapa = DB.map(sheet);
  return DB.read(sheet).map(function(linha, indice) {
    return { linha: linha, mapa: mapa, indice: indice };
  });
}

function _fcContatoPublico(c) {
  return {
    id: c.id,
    forumId: c.forumId,
    comarcaId: c.comarcaId,
    unidadeOrganizacionalId: c.noId,
    tipo: c.tipo,
    descricao: c.descricao,
    valor: c.valor,
    observacao: c.observacao,
    dataCriacao: c.dataCriacao,
    dataAtualizacao: c.dataAtualizacao,
    ativo: c.ativo,
    ordem: c.ordem
  };
}

function _fcTipoNo(valor) {
  return normalizarChave(valor || "GENERICO") || "GENERICO";
}

function _fcIndiceOrganizacional() {
  const sheet = DB.unidadesOrganizacionais();
  const mapa = DB.map(sheet);
  const nos = {};
  DB.read(sheet).forEach(function(linha, indice) {
    const id = _fcTexto(_fcCampo(mapa, linha, ["ID"]));
    if (!id) return;
    nos[id] = {
      id: id,
      forumId: _fcTexto(_fcCampo(mapa, linha, ["FORUM_ID"])),
      comarcaId: _fcTexto(_fcCampo(mapa, linha, ["COMARCA_ID"])),
      paiId: _fcTexto(_fcCampo(mapa, linha, ["PAI_ID"])),
      tipo: _fcTipoNo(_fcCampo(mapa, linha, ["TIPO"], "GENERICO")),
      nome: _fcTexto(_fcCampo(mapa, linha, ["NOME"])),
      endereco: _fcTexto(_fcCampo(mapa, linha, ["ENDERECO", "ENDEREÇO"])),
      cep: _fcTexto(_fcCampo(mapa, linha, ["CEP"])),
      observacao: _fcTexto(_fcCampo(mapa, linha, ["OBSERVACAO", "OBSERVAÇÃO"])),
      selecionavelAcesso: paraBoolean(_fcCampo(mapa, linha, ["SELECIONAVEL_ACESSO"], false)),
      ativo: paraBoolean(_fcCampo(mapa, linha, ["ATIVO"], true)),
      ordem: _fcCampo(mapa, linha, ["ORDEM"], indice + 1),
      __ordem: _fcOrdem(_fcCampo(mapa, linha, ["ORDEM"]), indice),
      __indice: indice,
      filhos: [],
      contatos: []
    };
  });
  return nos;
}

function _fcValidarArvore(nos, foruns, comarcas) {
  const erros = [];
  Object.keys(nos).forEach(function(id) {
    const no = nos[id];
    const forumValido = no.forumId && !!foruns[no.forumId];
    const comarcaValida = no.comarcaId && !!comarcas[no.comarcaId];
    if (!forumValido && !comarcaValida) erros.push("Nó " + id + " não possui Fórum ou Comarca válida.");
    if (no.forumId && !forumValido) erros.push("Nó " + id + " aponta para Fórum inexistente.");
    if (no.comarcaId && !comarcaValida) erros.push("Nó " + id + " aponta para Comarca inexistente.");
    if (no.forumId && no.comarcaId) erros.push("Nó " + id + " não pode pertencer simultaneamente a Fórum e Órgão.");
    if (no.paiId && !nos[no.paiId]) erros.push("Nó " + id + " aponta para pai inexistente: " + no.paiId);
    if (no.paiId && nos[no.paiId] &&
        (nos[no.paiId].forumId !== no.forumId || nos[no.paiId].comarcaId !== no.comarcaId)) {
      erros.push("Nó " + id + " e seu pai pertencem a estruturas diferentes.");
    }
    const vistos = new Set();
    let atual = no;
    let profundidade = 0;
    while (atual && atual.paiId) {
      if (vistos.has(atual.id)) { erros.push("Ciclo hierárquico envolvendo o nó " + id + "."); break; }
      vistos.add(atual.id);
      atual = nos[atual.paiId];
      profundidade++;
      if (profundidade > 50) { erros.push("A árvore excede o limite de segurança de 50 níveis no nó " + id + "."); break; }
    }
  });
  if (erros.length) throw new Error(Array.from(new Set(erros)).slice(0, 10).join(" "));
}

function _fcResolverAncestros(nos, noId) {
  const caminho = [];
  const vistos = new Set();
  let atual = nos[noId] || null;
  while (atual) {
    if (vistos.has(atual.id)) throw new Error("Ciclo hierárquico envolvendo o nó " + noId + ".");
    vistos.add(atual.id);
    caminho.unshift(atual);
    atual = atual.paiId ? nos[atual.paiId] : null;
    if (caminho.length > 50) throw new Error("A árvore excede o limite de segurança de 50 níveis.");
  }
  return caminho;
}

function _fcAncoraAcesso(nos, noId) {
  const caminho = _fcResolverAncestros(nos, noId);
  for (let i = caminho.length - 1; i >= 0; i--) {
    if (caminho[i].selecionavelAcesso) return caminho[i];
  }
  return caminho.length ? caminho[0] : null;
}

function _fcSerializarNo(no, ancestrais, raiz) {
  const caminho = ancestrais.concat([no]);
  let ancoraAcesso = null;
  for (let i = caminho.length - 1; i >= 0; i--) {
    if (caminho[i].selecionavelAcesso) { ancoraAcesso = caminho[i]; break; }
  }
  if (!ancoraAcesso && caminho.length) ancoraAcesso = caminho[0];
  const pai = ancestrais.length ? ancestrais[ancestrais.length - 1] : null;
  const enderecoExibicao = no.endereco || (pai ? pai.enderecoExibicao : "") || raiz.endereco || "";
  const cepExibicao = no.cep || (pai ? pai.cepExibicao : "") || raiz.cep || "";
  const atual = Object.assign({}, no, { enderecoExibicao: enderecoExibicao, cepExibicao: cepExibicao });
  const filhos = _fcOrdenar(no.filhos).filter(function(filho) { return filho.ativo; }).map(function(filho) {
    return _fcSerializarNo(filho, ancestrais.concat([atual]), raiz);
  });
  return {
    id: no.id,
    forumId: no.forumId,
    comarcaId: no.comarcaId,
    paiId: no.paiId,
    tipo: no.tipo,
    nome: no.nome,
    endereco: no.endereco,
    cep: no.cep,
    enderecoExibicao: enderecoExibicao,
    cepExibicao: cepExibicao,
    observacao: no.observacao,
    selecionavelAcesso: no.selecionavelAcesso,
    nivel: caminho.length,
    caminhoIds: caminho.map(function(item) { return item.id; }),
    caminhoNomes: caminho.map(function(item) { return item.nome; }),
    ancoraAcessoId: ancoraAcesso ? ancoraAcesso.id : "",
    ancoraAcessoNome: ancoraAcesso ? ancoraAcesso.nome : "",
    contatos: _fcOrdenar(no.contatos).map(_fcContatoPublico),
    filhos: filhos,
    qtdFilhos: filhos.length,
    qtdNos: 1 + filhos.reduce(function(total, filho) { return total + filho.qtdNos; }, 0),
    qtdContatos: no.contatos.length + filhos.reduce(function(total, filho) { return total + filho.qtdContatos; }, 0)
  };
}

function _fcTextoContatoBusca(contato) {
  return limparTexto([contato.tipo, contato.descricao, contato.valor, contato.observacao, contato.id].join(" "));
}

function _fcFiltrarNo(no, termo, ancestrais) {
  const caminho = ancestrais.concat([no]);
  const proprio = limparTexto([
    no.nome, no.tipo, no.observacao, no.endereco, no.cep, no.id,
    caminho.map(function(item) { return item.nome; }).join(" ")
  ].join(" ")).includes(termo);
  const contatos = no.contatos.filter(function(contato) { return _fcTextoContatoBusca(contato).includes(termo); });
  const filhos = no.filhos.map(function(filho) { return _fcFiltrarNo(filho, termo, caminho); }).filter(Boolean);
  if (!proprio && !contatos.length && !filhos.length) return null;
  if (proprio) return no;
  return Object.assign({}, no, { contatos: contatos, filhos: filhos });
}

function construirHierarquiaForumContatos(opcoes) {
  const cfg = ehObjeto(opcoes) ? opcoes : {};
  const termo = limparTexto(cfg.termo || "");
  const shMun = DB.comarcasOuNulo();
  const shForum = DB.forumOuNulo();
  const shNos = DB.unidadesOrganizacionaisOuNulo();
  const shContatos = DB.contatosOuNulo();
  if (!shMun || !shForum || !shNos || !shContatos) {
    throw new Error("Modelo incompleto. Execute instalarSistemaForum() para criar COMARCAS, FORUM, UNIDADES_ORGANIZACIONAIS e CONTATOS.");
  }

  const comarcas = {};
  const foruns = {};
  const nos = _fcIndiceOrganizacional();

  _fcLerAba(shMun).forEach(function(item) {
    const id = _fcTexto(_fcCampo(item.mapa, item.linha, ["ID", "COMARCA_ID"]));
    if (!id) return;
    comarcas[id] = {
      id: id,
      nome: _fcTexto(_fcCampo(item.mapa, item.linha, ["NOME", "COMARCA"])),
      codigoIbge: _fcTexto(_fcCampo(item.mapa, item.linha, ["CODIGO_IBGE", "IBGE"])),
      microrregiao: _fcTexto(_fcCampo(item.mapa, item.linha, ["MICRORREGIAO", "MICRORREGIÃO"])),
      tipo: normalizarChave(_fcCampo(item.mapa, item.linha, ["TIPO"], "COMARCA")) || "COMARCA",
      endereco: _fcTexto(_fcCampo(item.mapa, item.linha, ["ENDERECO", "ENDEREÇO"])),
      cep: _fcTexto(_fcCampo(item.mapa, item.linha, ["CEP"])),
      email: _fcTexto(_fcCampo(item.mapa, item.linha, ["EMAIL", "E-MAIL"])),
      observacao: _fcTexto(_fcCampo(item.mapa, item.linha, ["OBSERVACAO", "OBSERVAÇÃO"])),
      ativo: paraBoolean(_fcCampo(item.mapa, item.linha, ["ATIVO"], true)),
      __ordem: _fcOrdem(_fcCampo(item.mapa, item.linha, ["ORDEM"]), item.indice),
      __indice: item.indice,
      foruns: [],
      contatos: [],
      nosRaiz: []
    };
  });

  _fcLerAba(shForum).forEach(function(item) {
    const id = _fcTexto(_fcCampo(item.mapa, item.linha, ["ID", "FORUM_ID"]));
    if (!id) return;
    foruns[id] = {
      id: id,
      comarcaId: _fcTexto(_fcCampo(item.mapa, item.linha, ["COMARCA_ID"])),
      nome: _fcTexto(_fcCampo(item.mapa, item.linha, ["NOME", "FORUM"])),
      endereco: _fcTexto(_fcCampo(item.mapa, item.linha, ["ENDERECO", "ENDEREÇO"])),
      cep: _fcTexto(_fcCampo(item.mapa, item.linha, ["CEP"])),
      email: _fcTexto(_fcCampo(item.mapa, item.linha, ["EMAIL", "E-MAIL"])),
      observacao: _fcTexto(_fcCampo(item.mapa, item.linha, ["OBSERVACAO", "OBSERVAÇÃO"])),
      ativo: paraBoolean(_fcCampo(item.mapa, item.linha, ["ATIVO"], true)),
      __ordem: _fcOrdem(_fcCampo(item.mapa, item.linha, ["ORDEM"]), item.indice),
      __indice: item.indice,
      contatos: [],
      nosRaiz: []
    };
  });

  _fcValidarArvore(nos, foruns, comarcas);
  Object.keys(nos).forEach(function(id) {
    const no = nos[id];
    if (no.paiId) nos[no.paiId].filhos.push(no);
    else if (foruns[no.forumId]) foruns[no.forumId].nosRaiz.push(no);
    else if (comarcas[no.comarcaId]) comarcas[no.comarcaId].nosRaiz.push(no);
  });

  const mapaContatos = DB.map(shContatos);
  DB.read(shContatos).forEach(function(linha, indice) {
    const id = _fcTexto(_fcCampo(mapaContatos, linha, ["ID"]));
    if (!id || !paraBoolean(_fcCampo(mapaContatos, linha, ["ATIVO"], true))) return;
    const noId = _fcTexto(_fcCampo(mapaContatos, linha, ["UNIDADE_ORGANIZACIONAL_ID"]));
    const forumIdInformado = _fcTexto(_fcCampo(mapaContatos, linha, ["FORUM_ID"]));
    const comarcaIdInformado = _fcTexto(_fcCampo(mapaContatos, linha, ["COMARCA_ID"]));
    const forumId = noId && nos[noId] ? nos[noId].forumId : forumIdInformado;
    const comarcaId = noId && nos[noId] ? nos[noId].comarcaId : comarcaIdInformado;
    const contato = {
      id: id,
      forumId: forumId,
      comarcaId: comarcaId,
      noId: noId,
      tipo: _fcTexto(_fcCampo(mapaContatos, linha, ["TIPO", "TIPO_CONTATO"])),
      descricao: _fcTexto(_fcCampo(mapaContatos, linha, ["DESCRICAO", "DESCRIÇÃO"])),
      valor: _fcTexto(_fcCampo(mapaContatos, linha, ["VALOR"])),
      observacao: _fcTexto(_fcCampo(mapaContatos, linha, ["OBSERVACAO", "OBSERVAÇÃO"])),
      dataCriacao: _fcCampo(mapaContatos, linha, ["DATA_CRIACAO", "DATA"]),
      dataAtualizacao: _fcCampo(mapaContatos, linha, ["DATA_ATUALIZACAO"]),
      ativo: true,
      ordem: _fcCampo(mapaContatos, linha, ["ORDEM"], indice + 1),
      __ordem: _fcOrdem(_fcCampo(mapaContatos, linha, ["ORDEM"]), indice),
      __indice: indice
    };
    if (noId && nos[noId]) nos[noId].contatos.push(contato);
    else if (foruns[forumId]) foruns[forumId].contatos.push(contato);
    else if (comarcas[comarcaId]) comarcas[comarcaId].contatos.push(contato);
  });

  Object.keys(foruns).forEach(function(id) {
    const forum = foruns[id];
    const comarca = comarcas[forum.comarcaId];
    if (comarca) comarca.foruns.push(forum);
  });
  Object.values(comarcas).forEach(function(comarca) {
    comarca.foruns = _fcOrdenar(comarca.foruns).filter(function(forum) { return forum.ativo; });
  });

  let listaComarcas = _fcOrdenar(Object.values(comarcas).filter(function(comarca) { return comarca.ativo; }));
  if (termo) {
    listaComarcas = listaComarcas.map(function(comarca) {
      const comarcaCasa = limparTexto([comarca.nome, comarca.codigoIbge, comarca.microrregiao, comarca.id].join(" ")).includes(termo);
      const copia = Object.assign({}, comarca);
      const contatosComarca = comarca.contatos.filter(function(contato) { return _fcTextoContatoBusca(contato).includes(termo); });
      const raizesComarca = comarca.nosRaiz.map(function(no) { return _fcFiltrarNo(no, termo, []); }).filter(Boolean);
      copia.foruns = comarca.foruns.map(function(forum) {
        const forumCasa = limparTexto([forum.nome, forum.email, forum.endereco, forum.id].join(" ")).includes(termo);
        const contatos = forum.contatos.filter(function(contato) { return _fcTextoContatoBusca(contato).includes(termo); });
        const raizes = forum.nosRaiz.map(function(no) { return _fcFiltrarNo(no, termo, []); }).filter(Boolean);
        if (!comarcaCasa && !forumCasa && !contatos.length && !raizes.length) return null;
        return Object.assign({}, forum, {
          contatos: forumCasa || comarcaCasa ? forum.contatos : contatos,
          nosRaiz: forumCasa || comarcaCasa ? forum.nosRaiz : raizes
        });
      }).filter(Boolean);
      copia.contatos = comarcaCasa ? comarca.contatos : contatosComarca;
      copia.nosRaiz = comarcaCasa ? comarca.nosRaiz : raizesComarca;
      return copia.foruns.length || copia.contatos.length || copia.nosRaiz.length || comarcaCasa ? copia : null;
    }).filter(Boolean);
  }

  const retorno = listaComarcas.map(function(comarca) {
    const contarSelecionaveis = function(lista) {
      return lista.reduce(function(total, no) {
        return total + (no.selecionavelAcesso ? 1 : 0) + contarSelecionaveis(no.filhos || []);
      }, 0);
    };
    const nosDiretos = _fcOrdenar(comarca.nosRaiz).filter(function(no) { return no.ativo; }).map(function(no) {
      return _fcSerializarNo(no, [], comarca);
    });
    const forunsPublicos = comarca.foruns.map(function(forum) {
      const nosPublicos = _fcOrdenar(forum.nosRaiz).filter(function(no) { return no.ativo; }).map(function(no) {
        return _fcSerializarNo(no, [], forum);
      });
      return {
        id: forum.id,
        nome: forum.nome,
        endereco: forum.endereco,
        cep: forum.cep,
        email: forum.email,
        observacao: forum.observacao,
        qtdNos: nosPublicos.reduce(function(total, no) { return total + no.qtdNos; }, 0),
        qtdUnidades: contarSelecionaveis(nosPublicos),
        qtdContatos: forum.contatos.length + nosPublicos.reduce(function(total, no) { return total + no.qtdContatos; }, 0),
        contatos: _fcOrdenar(forum.contatos).map(_fcContatoPublico),
        nos: nosPublicos
      };
    });
    return {
      id: comarca.id,
      nome: comarca.nome,
      codigoIbge: comarca.codigoIbge,
      microrregiao: comarca.microrregiao,
      tipo: comarca.tipo,
      endereco: comarca.endereco,
      cep: comarca.cep,
      email: comarca.email,
      observacao: comarca.observacao,
      qtdForuns: forunsPublicos.length,
      qtdNos: nosDiretos.reduce(function(total, no) { return total + no.qtdNos; }, 0) + forunsPublicos.reduce(function(total, forum) { return total + forum.qtdNos; }, 0),
      qtdUnidades: contarSelecionaveis(nosDiretos) + forunsPublicos.reduce(function(total, forum) { return total + forum.qtdUnidades; }, 0),
      qtdContatos: comarca.contatos.length + nosDiretos.reduce(function(total, no) { return total + no.qtdContatos; }, 0) + forunsPublicos.reduce(function(total, forum) { return total + forum.qtdContatos; }, 0),
      contatos: _fcOrdenar(comarca.contatos).map(_fcContatoPublico),
      nos: nosDiretos,
      foruns: forunsPublicos
    };
  });
  return {
    sucesso: true,
    geradoEm: new Date(),
    totalOrgaos: retorno.filter(function(item) { return item.tipo === "ORGAO"; }).length,
    totalComarcas: retorno.filter(function(item) { return item.tipo !== "ORGAO"; }).length,
    comarcas: retorno,
    uteis: _fcTelefonesUteis()
  };
}

/** Telefones úteis (aba TELEFONES_UTEIS) para o bloco da consulta. */
function _fcTelefonesUteis() {
  try {
    const sh = DB.telefonesUteisOuNulo();
    if (!sh) return [];
    const mapa = DB.map(sh);
    return DB.read(sh).filter(function(linha) {
      return mapa.ATIVO === undefined || paraBoolean(linha[mapa.ATIVO - 1]);
    }).map(function(linha) {
      const g = function(ch) { const i = mapa[ch]; return i !== undefined ? textoSeguro(linha[i - 1]) : ""; };
      return { id: g("ID"), nome: g("NOME"), tipo: g("TIPO"), valor: g("VALOR") };
    }).filter(function(item) { return item.nome || item.valor; });
  } catch (e) { return []; }
}

function listarHierarquiaContatos(termo) {
  const normalizado = limparTexto(termo || "");
  const chaveCache = CONFIG.CACHE.CHAVE_TELEFONES + (normalizado ? ":" + normalizado : "");
  const cache = CACHE.obter(chaveCache);
  if (cache) return cache;
  const resultado = construirHierarquiaForumContatos({ termo: termo || "" });
  CACHE.salvar(chaveCache, resultado, CONFIG.CACHE.TEMPO_PADRAO);
  return resultado;
}

function pesquisarHierarquiaContatos(termo) { return listarHierarquiaContatos(termo || ""); }

function validarModeloForumContatos() {
  new AuthService().exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);
  return validarModeloForumContatosInterno_();
}

function validarModeloForumContatosInterno_() {
  const validacao = validarIntegridadeHierarquiaOrganizacionalV5();
  const diagnostico = validacao.ok ? construirHierarquiaForumContatos({}) : { comarcas: [] };
  return {
    ok: validacao.ok,
    problemas: validacao.problemas || [],
    abasObrigatorias: [CONFIG.SHEETS.COMARCAS, CONFIG.SHEETS.FORUM, CONFIG.SHEETS.UNIDADES_ORGANIZACIONAIS, CONFIG.SHEETS.CONTATOS],
    abasAusentes: validacao.abasAusentes || [],
    possuiTELEFONES: !!DB.getSpreadsheet().getSheetByName("TELEFONES"),
    comarcas: diagnostico.comarcas.length,
    foruns: diagnostico.comarcas.reduce(function(total, comarca) { return total + comarca.qtdForuns; }, 0),
    nosOrganizacionais: diagnostico.comarcas.reduce(function(total, comarca) { return total + comarca.qtdNos; }, 0),
    unidadesSelecionaveis: diagnostico.comarcas.reduce(function(total, comarca) { return total + comarca.qtdUnidades; }, 0),
    contatosAtivos: diagnostico.comarcas.reduce(function(total, comarca) { return total + comarca.qtdContatos; }, 0)
  };
}
