/**
 * Autenticação e autorização pela identidade Google da implantação privada.
 * A implantação pública falha de forma fechada e nunca concede privilégios.
 */
class AuthService {
  constructor() {
    this.modo = AuthService.modoAplicacao();
    this.email = this.obterEmailDaSessao();
  }

  static modoAplicacao() {
    const props = PropertiesService.getScriptProperties();
    const valor = String(
      props.getProperty(CONFIG.AUTH.PROPRIEDADE_MODO) || ""
    ).trim().toUpperCase();
    return valor === CONFIG.AUTH.MODO_PRIVADO
      ? CONFIG.AUTH.MODO_PRIVADO
      : CONFIG.AUTH.MODO_PUBLICO;
  }

  static ehContextoPrivado() {
    return AuthService.modoAplicacao() === CONFIG.AUTH.MODO_PRIVADO;
  }

  static exigirContextoPrivado() {
    if (!AuthService.ehContextoPrivado()) {
      throw new Error("Operação administrativa indisponível na URL pública.");
    }
    return true;
  }

  static obterEmailAtivo() {
    try {
      return normalizarEmail(Session.getActiveUser().getEmail());
    } catch (erro) {
      return "";
    }
  }

  static emailsTestePrivado() {
    if (!AuthService.ehContextoPrivado()) return [];
    const bruto = PropertiesService.getScriptProperties()
      .getProperty(CONFIG.AUTH.PROPRIEDADE_EMAILS_TESTE) || "";
    return String(bruto)
      .split(/[;,\n]+/)
      .map(normalizarEmail)
      .filter(Boolean);
  }

  static emailPermitidoNoPrivado(email) {
    const normalizado = normalizarEmail(email);
    if (!normalizado || !AuthService.ehContextoPrivado()) return false;
    return emailInstitucional(normalizado) ||
      AuthService.emailsTestePrivado().includes(normalizado);
  }

  obterEmailDaSessao() {
    if (!AuthService.ehContextoPrivado()) return "";
    const email = AuthService.obterEmailAtivo();
    return AuthService.emailPermitidoNoPrivado(email) ? email : "";
  }

  static usuarioConsulta(estado, email) {
    const identificado = Boolean(email);
    return {
      email: identificado ? normalizarEmail(email) : "",
      nome: identificado ? normalizarEmail(email).split("@")[0] : "Visitante",
      nivel: null,
      perfil: CONFIG.PERFIS.USUARIO_CONSULTA,
      logado: false,
      ativo: false,
      cadastrado: false,
      identificado: identificado,
      contexto: AuthService.modoAplicacao(),
      estadoAcesso: estado,
      podeSolicitarAcesso: false,
      noIds: [],
      unidades: [],
      acessos: [],
      localidades: []
    };
  }

  usuarioAtual() {
    if (!AuthService.ehContextoPrivado()) {
      return AuthService.usuarioConsulta("CONSULTA_PUBLICA", "");
    }

    const emailAtivo = AuthService.obterEmailAtivo();
    if (!emailAtivo) {
      return AuthService.usuarioConsulta("IDENTIDADE_NAO_DISPONIVEL", "");
    }

    if (!AuthService.emailPermitidoNoPrivado(emailAtivo)) {
      return AuthService.usuarioConsulta("DOMINIO_NAO_AUTORIZADO", emailAtivo);
    }

    return this.buscarUsuario(emailAtivo);
  }

  buscarUsuario(email) {
    AuthService.exigirContextoPrivado();
    const emailNormalizado = normalizarEmail(email);
    const base = AuthService.usuarioConsulta("NAO_CADASTRADO", emailNormalizado);
    base.identificado = true;
    base.podeSolicitarAcesso = AuthService.emailPermitidoNoPrivado(emailNormalizado);

    const sheet = DB.usuarios();
    const mapa = DB.map(sheet);
    const obrigatorios = ["ID", "NOME", "EMAIL", "NIVEL", "ATIVO"];
    const ausentes = obrigatorios.filter(campo => mapa[campo] === undefined);
    if (ausentes.length) {
      throw new Error("Aba USUARIOS inválida. Cabeçalhos ausentes: " + ausentes.join(", ") + ".");
    }

    const linhas = DB.read(sheet).filter(item =>
      normalizarEmail(item[mapa.EMAIL - 1]) === emailNormalizado
    );
    if (!linhas.length) {
      // Intranet: e-mail institucional entra sozinho como visitante (só consulta;
      // escopos e gestão continuam por solicitação aprovada). Falha aqui nunca
      // pode travar o acesso — cai no comportamento anterior (não cadastrado).
      if (emailInstitucional(emailNormalizado)) {
        try { this.registrarVisitanteInstitucional(sheet, emailNormalizado); } catch (eRegistro) {}
      }
      return base;
    }

    // Em bases migradas pode existir uma linha antiga/inativa duplicada. A linha
    // ativa com nível válido deve prevalecer, sem tornar a ordem física da aba
    // um fator de autenticação.
    const linha = linhas.find(item => {
      const nivelItem = Number(item[mapa.NIVEL - 1]);
      return paraBoolean(item[mapa.ATIVO - 1]) &&
        (nivelItem === CONFIG.NIVEIS.GESTOR_CONTEUDO || nivelItem === CONFIG.NIVEIS.GESTOR_SISTEMA);
    }) || linhas[0];

    const id = textoSeguro(linha[mapa.ID - 1]);
    const nome = textoSeguro(linha[mapa.NOME - 1]) || emailNormalizado.split("@")[0];
    const nivel = Number(linha[mapa.NIVEL - 1]);
    const ativo = paraBoolean(linha[mapa.ATIVO - 1]);
    const perfil = CONFIG.NIVEIS.POR_NIVEL[String(nivel)] || CONFIG.PERFIS.USUARIO_CONSULTA;
    const nivelValido = nivel === CONFIG.NIVEIS.GESTOR_CONTEUDO || nivel === CONFIG.NIVEIS.GESTOR_SISTEMA;

    if (!ativo || !nivelValido) {
      // Visitante autocadastrado (NIVEL 0/VAZIO + ATIVO): identificado, só consulta,
      // e pode solicitar escopos. Nível inválido de outro tipo continua sem pedir
      // (regra anterior) — o autocadastro sempre grava NIVEL 0.
      const visitanteAuto = ativo && nivel === 0;
      return Object.assign(base, {
        id: id,
        nome: nome,
        nivel: nivelValido ? nivel : null,
        cadastrado: true,
        ativo: !!visitanteAuto,
        podeSolicitarAcesso: !!visitanteAuto,
        estadoAcesso: !ativo ? "CONTA_DESATIVADA" : (!visitanteAuto ? "NIVEL_INVALIDO" : "VISITANTE")
      });
    }

    const escopo = nivel === CONFIG.NIVEIS.GESTOR_CONTEUDO
      ? this.obterEscopoNos(id)
      : { ids: [], nos: [] };

    return {
      id: id,
      email: emailNormalizado,
      nome: nome,
      nivel: nivel,
      perfil: perfil,
      logado: true,
      ativo: true,
      cadastrado: true,
      identificado: true,
      contexto: CONFIG.AUTH.MODO_PRIVADO,
      estadoAcesso: "AUTORIZADO",
      podeSolicitarAcesso: nivel === CONFIG.NIVEIS.GESTOR_CONTEUDO,
      noIds: escopo.ids,
      nos: escopo.nos,
      acessos: escopo.acessos,
      localidades: Array.from(new Set(escopo.nos.map(item => item.comarca).filter(Boolean)))
    };
  }

  registrarVisitanteInstitucional(sheet, emailNormalizado) {
    const mapa = DB.map(sheet);
    const totalColunas = sheet.getLastColumn();
    if (!totalColunas || mapa.EMAIL === undefined) return;
    const nova = new Array(totalColunas).fill("");
    if (mapa.ID !== undefined) nova[mapa.ID - 1] = new IdService().novoUsuario(sheet);
    if (mapa.NOME !== undefined) nova[mapa.NOME - 1] = emailNormalizado.split("@")[0];
    if (mapa.EMAIL !== undefined) nova[mapa.EMAIL - 1] = emailNormalizado;
    if (mapa.NIVEL !== undefined) nova[mapa.NIVEL - 1] = 0;
    if (mapa.ATIVO !== undefined) nova[mapa.ATIVO - 1] = "SIM";
    sheet.appendRow(nova);
  }

  obterEscopoNos(usuarioId) {
    const acessos = lerAcessosAtivosUsuario(usuarioId);
    if (!acessos.length) return { ids: [], nos: [], acessos: [] };

    return resolverEscopoAcessos(acessos, montarCatalogoEscoposAcesso());
  }

  perfilAtual() {
    return this.usuarioAtual().perfil;
  }

  exigirPermissao(permissao) {
    const publicas = [CONFIG.PERMISSOES.VISUALIZAR, CONFIG.PERMISSOES.PESQUISAR];
    if (publicas.includes(permissao)) return true;
    AuthService.exigirContextoPrivado();
    const usuario = this.usuarioAtual();
    if (!usuario.logado || !usuario.ativo) {
      throw new Error("Acesso administrativo não autorizado.");
    }
    return true;
  }

  exigirPerfil(perfilNecessario) {
    AuthService.exigirContextoPrivado();
    const usuario = this.usuarioAtual();
    if (!usuario.logado || !usuario.ativo) throw new Error("É necessário acesso administrativo ativo.");
    if (usuario.perfil !== perfilNecessario) {
      throw new Error("Acesso permitido somente para " + perfilNecessario + ".");
    }
    return true;
  }

  exigirPermissaoNo(idNo) {
    this.exigirPermissao(CONFIG.PERMISSOES.EDITAR);
    const usuario = this.usuarioAtual();
    if (usuario.perfil === CONFIG.PERFIS.GESTOR_SISTEMA) return true;
    const id = textoSeguro(idNo);
    if (!id || !usuario.noIds.includes(id)) {
      throw new Error("Seu perfil não possui vínculo ativo com este nó organizacional.");
    }
    return true;
  }

  exigirPermissaoLocalidade(idNo) {
    return this.exigirPermissaoNo(idNo);
  }

  static salvarSessao() {
    return true;
  }

  static limparSessao() {
    return true;
  }
}

AuthService.prototype.criarNotificacao = function(destinatarioEmail, tipo, mensagem, referencia) {
  return criarNotificacao(destinatarioEmail, tipo, mensagem, referencia);
};
AuthService.prototype.listarNotificacoes = function(email) {
  return listarNotificacoes(email);
};
AuthService.prototype.marcarNotificacaoLida = function(id) {
  return marcarNotificacaoLida(id);
};
AuthService.prototype.marcarTodasLidas = function(email) {
  return marcarTodasLidas(email);
};
AuthService.prototype.contarNaoLidas = function(email) {
  return contarNaoLidas(email);
};
