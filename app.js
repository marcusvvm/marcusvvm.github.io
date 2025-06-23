/* =========================================================
 *  Dashboard Eleitoral – script principal
 * ========================================================= */

/* ------ Metadados totais (fixos) ------------------------ */
const dadosEleitorais = {
  total_2014: 29676,
  total_2018: 37550,
  crescimento_absoluto: 7874,
  crescimento_percentual: 26.53,
  municipios_crescimento: 116,
  municipios_queda: 67,
  municipios_sem_votos_2018: 81,
  municipios: [] // será preenchido via fetch
};

/* ------ Variáveis globais ------------------------------ */
let dadosCombinados = [];
let dadosFiltrados = [];
let dadosProjecao = [];

let chartVisaoGeral = null;
let chartCrescimento = null;
let chartQueda = null;

let paginaAtual = 1;
let paginaAtualProjecao = 1;
const itensPorPagina = 10;
const itensPorPaginaProjecao = 20;

let ordemAtual           = { coluna: "votos2018", direcao: "desc" };
let ordemAtualProjecao   = { coluna: "peso", direcao: "desc" };
let filtroAtual          = "todos";
let municipioFiltrado    = "todos";
let valorProjecao        = 50000;
let novoTotalProjecao    = 50000; // Guarda o novo total quando há valores manuais
let temValoresManuais    = false; // Indica se há valores editados manualmente
let termoBuscaAtual      = "";

/* =========================================================
 *  INICIALIZAÇÃO
 * ========================================================= */
document.addEventListener('click', function(e) {
    const btn = e.target.closest('.year-toggle-btn');
    if (btn) {
        e.preventDefault();
        const year = parseInt(btn.dataset.year);
        atualizarKPIMunicipiosSemVotos(year);
    }
});

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const resp = await fetch("municipios_dados.json");
    if (!resp.ok) throw new Error("Não consegui ler municipios_dados.json");
    dadosEleitorais.municipios = await resp.json();
    // Só processamos e inicializamos se os dados forem carregados com sucesso
    processarDados();
    inicializarFiltroMunicipios();
    atualizarKPIs();
    atualizarKPIMunicipiosSemVotos(2018); // Inicializa o KPI de municípios sem votos
    
    // Inicializa o filtro "Sem Votos" com 2018 como padrão
    atualizarAnoSemVotos(2018);
    
    inicializarTabelaDados();
    inicializarTabelaProjecao();
    inicializarGraficos();
    configurarAbas();
    configurarEventos();
  } catch (e) {
    console.error("Erro ao carregar dados:", e);
    alert("Falha ao carregar dados dos municípios. Verifique o console para mais informações.");
    // Mesmo com erro, ainda inicializamos a interface básica
    configurarAbas();
  }
});

/* =========================================================
 *  FUNÇÕES DE PROCESSAMENTO
 * ========================================================= */
function criarDadosCompletos() {
  return dadosEleitorais.municipios.map(m => ({
    municipio:    m.municipio,
    votos2014:    m.votos_2014,
    votos2018:    m.votos_2018,
    variacaoAbs:  m.variacao_absoluta,
    variacaoPerc: m.variacao_percentual
  }));
}

function processarDados() {
  dadosCombinados = criarDadosCompletos();
  aplicarFiltros();          // popula dadosFiltrados e a tabela
}
function formatSigned(v, dec = 0) {
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/, "."));
  const str = Math.abs(n).toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  return (n > 0 ? "+" : n < 0 ? "-" : "") + str;
}


/* =========================================================
 *  FILTRO DE MUNICÍPIOS (dropdown)
 * ========================================================= */
function inicializarFiltroMunicipios() {
  const sel = document.getElementById("filtro-municipio");
  dadosCombinados
    .map(i => i.municipio)
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .forEach(mun => {
      const opt = document.createElement("option");
      opt.value = opt.textContent = mun;
      sel.appendChild(opt);
    });
}

/* =========================================================
 *  KPIs (cartões)
 * ========================================================= */

// Conta quantos municípios não tiveram votos no ano especificado
function contarMunicipiosSemVotos(ano) {
    if (!dadosCombinados || dadosCombinados.length === 0) return 0;
    
    return dadosCombinados.filter(municipio => {
        const votos = ano === 2014 ? municipio.votos2014 : municipio.votos2018;
        return votos === 0 || votos === '0' || !votos;
    }).length;
}

// Atualiza o KPI de municípios sem votos
function atualizarKPIMunicipiosSemVotos(ano = 2018) {
    const count = contarMunicipiosSemVotos(ano);
    const element = document.getElementById('kpi-municipios-sem-votos');
    if (element) {
        element.textContent = count.toLocaleString('pt-BR');
    }
    
    // Atualiza o estado dos botões de ano
    document.querySelectorAll('.year-toggle-btn').forEach(btn => {
        if (parseInt(btn.dataset.year) === ano) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function atualizarKPIs() {
  if (municipioFiltrado === "todos") {
    setKpi("kpi-votos-2014", dadosEleitorais.total_2014);
    setKpi("kpi-votos-2018", dadosEleitorais.total_2018);
    setKpi("kpi-cresc-absoluto", dadosEleitorais.crescimento_absoluto);
    setKpiPct("kpi-cresc-percentual", dadosEleitorais.crescimento_percentual);
    setText("kpi-municipios-crescimento", dadosEleitorais.municipios_crescimento);
    setText("kpi-municipios-queda", dadosEleitorais.municipios_queda);
  } else {
    const d = dadosCombinados.find(i => i.municipio === municipioFiltrado);
    if (!d) return;
    setKpi("kpi-votos-2014", d.votos2014);
    setKpi("kpi-votos-2018", d.votos2018);
    setKpi("kpi-cresc-absoluto", d.variacaoAbs);
    setKpiPct("kpi-cresc-percentual", d.variacaoPerc);
    setText("kpi-municipios-crescimento", d.variacaoAbs > 0 ? 1 : 0);
    setText("kpi-municipios-queda",       d.variacaoAbs < 0 ? 1 : 0);
  }

  /* helpers internos */
  function setKpi(id, v) { 
    const element = document.getElementById(id);
    element.textContent = v.toLocaleString("pt-BR");
    // Se for o KPI de crescimento absoluto, negativo, e um município estiver selecionado, aplica classe vermelha
    if (id === "kpi-cresc-absoluto" && municipioFiltrado !== "todos" && v < 0) {
      element.classList.add("kpi-negativo");
    } else {
      element.classList.remove("kpi-negativo");
    }
  }
  
  function setKpiPct(id, p) { 
    const element = document.getElementById(id);
    element.textContent = `${p.toFixed(2).replace(".", ",")}%`;
    // Se for o KPI de crescimento percentual, negativo, e um município estiver selecionado, aplica classe vermelha
    if (id === "kpi-cresc-percentual" && municipioFiltrado !== "todos" && p < 0) {
      element.classList.add("kpi-negativo");
    } else {
      element.classList.remove("kpi-negativo");
    }
  }
  
  function setText(id, t) { 
    document.getElementById(id).textContent = t; 
  }
}

/* =========================================================
 *  TABELA PRINCIPAL
 * ========================================================= */
function inicializarTabelaDados() {
  /* eventos de ordenação */
  document.querySelectorAll("#tabela-dados th[data-sort]").forEach(th => {
    th.addEventListener("click", () => {
      const col = th.dataset.sort;
      ordemAtual.direcao = (ordemAtual.coluna === col && ordemAtual.direcao === "desc") ? "asc" : "desc";
      ordemAtual.coluna  = col;
      document.querySelectorAll("#tabela-dados th").forEach(h => h.classList.remove("sort-asc", "sort-desc"));
      th.classList.add(ordemAtual.direcao === "asc" ? "sort-asc" : "sort-desc");
      aplicarFiltros(termoBuscaAtual);
    });
  });

  /* botões de filtro rápido */
  document.getElementById("btn-todos").addEventListener("click", () => setFiltroAtivo("todos"));
  document.getElementById("btn-crescimento").addEventListener("click", () => setFiltroAtivo("crescimento"));
  document.getElementById("btn-queda").addEventListener("click", () => setFiltroAtivo("queda"));
  document.getElementById("btn-sem-votos").addEventListener("click", () => setFiltroAtivo("sem-votos"));

  /* busca */
  document.getElementById("busca-municipio").addEventListener("input", e => {
    termoBuscaAtual = e.target.value;
    aplicarFiltros(termoBuscaAtual);
  });

  /* paginação */
  document.getElementById("btn-anterior").addEventListener("click", () => {
    if (paginaAtual > 1) { paginaAtual--; atualizarTabelaDados(); }
  });
  document.getElementById("btn-proximo").addEventListener("click", () => {
    const tot = Math.ceil(dadosFiltrados.length / itensPorPagina);
    if (paginaAtual < tot) { paginaAtual++; atualizarTabelaDados(); }
  });

  aplicarFiltros(); // primeira renderização
}

function setFiltroAtivo(tipo) {
  filtroAtual = tipo;
  
  // Remove a classe 'active' de todos os botões de filtro
  document.querySelectorAll(".filter-buttons .btn, .filter-year-toggle .filter-year-btn").forEach(b => b.classList.remove("active"));
  
  // Adiciona a classe 'active' apenas ao botão de filtro clicado
  const btnFiltro = document.getElementById(`btn-${tipo}`);
  if (btnFiltro) {
    btnFiltro.classList.add("active");
    
    // Se for o filtro "sem-votos", ativa o botão do ano correspondente
    if (tipo === 'sem-votos') {
      const btnAnoAtivo = document.querySelector(`.filter-year-btn[data-year="${semVotosAno}"]`);
      if (btnAnoAtivo) {
        btnAnoAtivo.classList.add('active');
      }
    }
  }
  
  aplicarFiltros(termoBuscaAtual);
}

// Variável para armazenar o ano selecionado no filtro "Sem Votos"
let semVotosAno = 2018;

// Atualiza o ano selecionado no filtro "Sem Votos"
function atualizarAnoSemVotos(ano) {
    semVotosAno = ano;
    const displayElement = document.querySelector('#btn-sem-votos .year-display');
    if (displayElement) {
        displayElement.textContent = ano;
    }
    
    // Atualiza a classe ativa nos botões de ano
    document.querySelectorAll('.filter-year-btn').forEach(btn => {
        if (parseInt(btn.dataset.year) === ano) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Reaplica os filtros se o filtro ativo for "sem-votos"
    if (filtroAtual === 'sem-votos') {
        aplicarFiltros(termoBuscaAtual);
    }
}

// Adiciona manipulador de eventos para os botões de ano do filtro "Sem Votos"
document.addEventListener('click', function(e) {
    const btn = e.target.closest('.filter-year-btn');
    if (btn) {
        e.preventDefault();
        e.stopPropagation(); // Impede que o evento se propague para o botão pai
        const year = parseInt(btn.dataset.year);
        atualizarAnoSemVotos(year);
    }
});

function aplicarFiltros(buscaTxt = "") {
  let arr = [...dadosCombinados];

  if (municipioFiltrado !== "todos") arr = arr.filter(i => i.municipio === municipioFiltrado);
  if (buscaTxt.trim() !== "") {
    const t = buscaTxt.toLowerCase();
    arr = arr.filter(i => i.municipio.toLowerCase().includes(t));
  }

  switch (filtroAtual) {
    case "crescimento": 
      arr = arr.filter(i => i.variacaoAbs > 0); 
      break;
    case "queda":       
      arr = arr.filter(i => i.variacaoAbs < 0); 
      break;
    case "sem-votos":   
      arr = arr.filter(i => i[`votos${semVotosAno}`] === 0); 
      break;
  }

  arr.sort((a, b) => {
    const vA = a[ordemAtual.coluna], vB = b[ordemAtual.coluna];
    if (ordemAtual.coluna === "municipio")
      return ordemAtual.direcao === "asc" ? vA.localeCompare(vB, "pt-BR") : vB.localeCompare(vA, "pt-BR");
    return ordemAtual.direcao === "asc" ? vA - vB : vB - vA;
  });

  dadosFiltrados = arr;
  paginaAtual = 1;
  atualizarTabelaDados();
}

function atualizarTabelaDados() {
  const tbody = document.querySelector("#tabela-dados tbody");
  tbody.innerHTML = "";

  const ini = (paginaAtual - 1) * itensPorPagina;
  const fim = ini + itensPorPagina;
  const pag = dadosFiltrados.slice(ini, fim);

  if (pag.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center">Nenhum resultado encontrado</td></tr>`;
  } else {
    pag.forEach(i => {
      const cls = i.variacaoAbs > 0 ? "linha-crescimento" : i.variacaoAbs < 0 ? "linha-queda" : "";
      tbody.insertAdjacentHTML("beforeend", `
        <tr class="${cls}">
          <td>${i.municipio}</td>
          <td>${i.votos2014.toLocaleString("pt-BR")}</td>
          <td>${i.votos2018.toLocaleString("pt-BR")}</td>
          <td>${formatSigned(i.variacaoAbs)}</td>
          <td>${formatSigned(i.variacaoPerc, 2)}%</td>
        </tr>
      `);
    });
  }

  const tot = Math.ceil(dadosFiltrados.length / itensPorPagina) || 1;
  document.getElementById("info-paginacao").textContent = `Página ${paginaAtual} de ${tot}`;
  document.getElementById("btn-anterior").disabled = paginaAtual === 1;
  document.getElementById("btn-proximo").disabled  = paginaAtual === tot;
}

/* =========================================================
 *  TABELA DE PROJEÇÃO
 * ========================================================= */
function inicializarTabelaProjecao() {
  /* ordenação */
  document.querySelectorAll("#tabela-projecao th[data-sort]").forEach(th => {
    th.addEventListener("click", () => {
      const col = th.dataset.sort;
      ordemAtualProjecao.direcao = (ordemAtualProjecao.coluna === col && ordemAtualProjecao.direcao === "desc") ? "asc" : "desc";
      ordemAtualProjecao.coluna  = col;
      document.querySelectorAll("#tabela-projecao th").forEach(h => h.classList.remove("sort-asc", "sort-desc"));
      th.classList.add(ordemAtualProjecao.direcao === "asc" ? "sort-asc" : "sort-desc");
      atualizarTabelaProjecao();
    });
  });

  /* paginação */
  document.getElementById("btn-anterior-projecao").addEventListener("click", () => {
    if (paginaAtualProjecao > 1) { paginaAtualProjecao--; atualizarTabelaProjecao(); }
  });
  document.getElementById("btn-proximo-projecao").addEventListener("click", () => {
    const tot = Math.ceil(dadosProjecao.length / itensPorPaginaProjecao);
    if (paginaAtualProjecao < tot) { paginaAtualProjecao++; atualizarTabelaProjecao(); }
  });

  /* aplicar novo total de projeção */
  document.getElementById("btn-aplicar-projecao").addEventListener("click", () => {
    valorProjecao = parseInt(document.getElementById("projecao-total").value) || 50000;
    calcularProjecao();
    atualizarTabelaProjecao();
  });

  calcularProjecao();
  atualizarTabelaProjecao();
}

function calcularProjecao() {
  const base = municipioFiltrado === "todos"
    ? dadosCombinados
    : dadosCombinados.filter(i => i.municipio === municipioFiltrado);

  const total18 = base.reduce((s, i) => s + i.votos2018, 0);
  
  // Quando calculamos uma nova projeção, resetamos todos os valores manuais
  temValoresManuais = false;
  novoTotalProjecao = valorProjecao;
  
  // Calcular os pesos e valores projetados iniciais com valores decimais
  const dadosTemp = base.map(i => {
    const peso = total18 ? (i.votos2018 / total18) * 100 : 0;
    const votosProjetadosExato = valorProjecao * peso / 100;
    const votosProjetadosArredondado = Math.round(votosProjetadosExato);
    const diferenca = votosProjetadosArredondado - i.votos2018;
    
    return {
      municipio: i.municipio,
      votos2018: i.votos2018,
      peso,
      votosProjetados: votosProjetadosArredondado,
      diferenca, // Diferença entre votos projetados e votos de 2018
      // Armazenar o resíduo (diferença entre o valor exato e o arredondado)
      residuo: votosProjetadosExato - votosProjetadosArredondado,
      manual: false // Indica se o valor foi editado manualmente
    };
  });
  
  // Calcular a soma dos votos projetados após o arredondamento
  const somaVotosProjetados = dadosTemp.reduce((sum, item) => sum + item.votosProjetados, 0);
  
  // Verificar se é necessário ajustar para bater exatamente com valorProjecao
  let diferenca = valorProjecao - somaVotosProjetados;
  
  if (diferenca !== 0) {
    // Ordenar por resíduo (do maior para o menor se precisamos adicionar, ou do menor para o maior se precisamos subtrair)
    dadosTemp.sort((a, b) => diferenca > 0 ? b.residuo - a.residuo : a.residuo - b.residuo);
    
    // Distribuir a diferença, um voto por vez, pelos municípios ordenados por resíduo
    for (let i = 0; i < Math.abs(diferenca) && i < dadosTemp.length; i++) {
      dadosTemp[i].votosProjetados += diferenca > 0 ? 1 : -1;
      // Recalcular a diferença após ajustar o valor projetado
      dadosTemp[i].diferenca = dadosTemp[i].votosProjetados - dadosTemp[i].votos2018;
    }
  }
  
  // Remover a propriedade residuo antes de atribuir a dadosProjecao
  dadosProjecao = dadosTemp.map(({residuo, ...rest}) => rest);
  
  paginaAtualProjecao = 1;
  
  // Verificar se a soma final bate com o valor da projeção
  const somaFinal = dadosProjecao.reduce((sum, item) => sum + item.votosProjetados, 0);
  console.log(`Valor projeção: ${valorProjecao}, Soma final: ${somaFinal}`);
  
  // Atualizar a área de informações
  atualizarInfoProjecao();
}

function atualizarTabelaProjecao() {
  const ord = [...dadosProjecao].sort((a, b) => {
    const col = ordemAtualProjecao.coluna;
    const dir = ordemAtualProjecao.direcao;
    const vA = a[col];
    const vB = b[col];

    let comparison = 0;
    // Primary sort
    if (col === "municipio") { // Municipio name is always string
      comparison = vA.localeCompare(vB, "pt-BR");
    } else if (typeof vA === 'number' && typeof vB === 'number') { // For numeric columns
      comparison = vA - vB;
    } else { // Fallback for mixed types or unexpected types, treat as equal for primary sort
      comparison = String(vA).localeCompare(String(vB), "pt-BR"); // Default to string comparison if types are mixed or not directly comparable as numbers
    }

    // Apply direction
    if (dir === "desc") {
      comparison *= -1;
    }

    // Secondary sort by municipio name (ascending) if primary sort keys are equal and primary sort was not municipio
    if (comparison === 0 && col !== "municipio") {
      return a.municipio.localeCompare(b.municipio, "pt-BR");
    }
    return comparison;
  });

  const tbody = document.querySelector("#tabela-projecao tbody");
  tbody.innerHTML = "";

  const ini = (paginaAtualProjecao - 1) * itensPorPaginaProjecao;
  const fim = ini + itensPorPaginaProjecao;
  ord.slice(ini, fim).forEach(item => {
    tbody.insertAdjacentHTML("beforeend", `
      <tr>
        <td>${item.municipio}</td>
        <td>${item.votos2018.toLocaleString("pt-BR")}</td>
        <td contenteditable="true" class="celula-editavel proj-edit" data-mun="${item.municipio}" data-campo="peso">${item.peso.toFixed(2).replace('.', ',')}</td>
        <td contenteditable="true" class="celula-editavel proj-edit" data-mun="${item.municipio}" data-campo="votosProjetados">${item.votosProjetados.toLocaleString("pt-BR")}</td>
        <td class="projecao-votos-necessarios">${item.diferenca >= 0 ? "+" : "-"}${Math.abs(item.diferenca).toLocaleString("pt-BR")}</td>
      </tr>
    `);
  });

  document.querySelectorAll('.proj-edit[data-campo="peso"]').forEach(c => {
    c.onblur = atualizaPorPeso;
    c.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); c.blur(); } };
  });
  document.querySelectorAll('.proj-edit[data-campo="votosProjetados"]').forEach(c => {
    c.onblur = atualizaPorVotos;
    c.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); c.blur(); } };
  });



  const tot = Math.ceil(dadosProjecao.length / itensPorPaginaProjecao) || 1;
  document.getElementById("info-paginacao-projecao").textContent = `Página ${paginaAtualProjecao} de ${tot}`;
  document.getElementById("btn-anterior-projecao").disabled = paginaAtualProjecao === 1;
  document.getElementById("btn-proximo-projecao").disabled  = paginaAtualProjecao === tot;
}

function atualizaPorPeso(e) {
  const mun = e.target.dataset.mun;
  const novoPeso = parseFloat(e.target.textContent.replace(".", "").replace(",", ".")) || 0;
  const item = dadosProjecao.find(i => i.municipio === mun);
  if (!item) return;
  
  // Valor original antes da edição
  const pesoAnterior = item.peso;
  
  // Se o novo peso for inválido, restaurar o valor anterior
  if (isNaN(novoPeso) || novoPeso < 0) {
    e.target.textContent = pesoAnterior.toFixed(2).replace(".", ",");
    return;
  }
  
  // Verificar se houve mudança significativa
  if (Math.abs(novoPeso - pesoAnterior) < 0.01) {
    e.target.textContent = pesoAnterior.toFixed(2).replace(".", ",");
    return;
  }
  
  // Calcular a diferença de peso
  const diferencaPeso = novoPeso - pesoAnterior;
  const outrosItens = dadosProjecao.filter(i => i.municipio !== mun);
  const somaOutrosPesos = outrosItens.reduce((sum, i) => sum + i.peso, 0);
  
  // Se não houver outros itens, não podemos ajustar
  if (outrosItens.length === 0) {
    e.target.textContent = pesoAnterior.toFixed(2).replace(".", ",");
    return;
  }
  
  // Se a soma dos outros pesos for zero, ajustamos os pesos existentes
  if (somaOutrosPesos <= 0) {
    // Se estamos tentando reduzir o peso de 100% para menos
    if (item.peso === 100 && novoPeso < 100) {
      // Distribui o peso restante igualmente entre os outros itens
      const pesoRestante = 100 - novoPeso;
      const pesoPorItem = pesoRestante / outrosItens.length;
      
      outrosItens.forEach(i => {
        i.peso = pesoPorItem;
      });
      
      // Atualiza o peso do item atual
      item.peso = novoPeso;
      
      // Atualiza os votos projetados
      atualizarVotosProjetados();
      
      // Atualiza a interface
      item.manual = true;
      temValoresManuais = true;
      atualizarTabelaProjecao();
      atualizarInfoProjecao();
      return;
    } else {
      // Se não for um caso de redução de 100%, mantém o comportamento anterior
      e.target.textContent = pesoAnterior.toFixed(2).replace(".", ",");
      return;
    }
  }
  
  // Ajustar os outros pesos proporcionalmente
  const fatorAjuste = (somaOutrosPesos - diferencaPeso) / somaOutrosPesos;
  
  // Atualizar o peso do item atual
  item.peso = novoPeso;
  item.manual = true;
  temValoresManuais = true;
  
  // Atualizar os outros pesos
  outrosItens.forEach(i => {
    i.peso = Math.max(0, i.peso * fatorAjuste);
  });
  
  // Recalcular os votos projetados com base nos novos pesos
  const totalPeso = dadosProjecao.reduce((sum, i) => sum + i.peso, 0);
  let somaVotos = 0;
  
  // Primeiro passe: calcular votos projetados baseados nos pesos
  dadosProjecao.forEach(i => {
    i.votosProjetados = Math.round(valorProjecao * (i.peso / totalPeso));
    somaVotos += i.votosProjetados;
  });
  
  // Ajustar arredondamentos para bater o total exato
  const diferenca = valorProjecao - somaVotos;
  if (diferenca !== 0) {
    // Ajustar os itens com maior resíduo primeiro
    const itensParaAjuste = [...dadosProjecao]
      .map((item, index) => ({
        index,
        residuo: (valorProjecao * (item.peso / totalPeso)) % 1
      }))
      .sort((a, b) => diferenca > 0 ? b.residuo - a.residuo : a.residuo - b.residuo);
    
    for (let i = 0; i < Math.abs(diferenca) && i < itensParaAjuste.length; i++) {
      dadosProjecao[itensParaAjuste[i].index].votosProjetados += diferenca > 0 ? 1 : -1;
    }
  }
  
  // Atualizar diferenças e garantir que os pesos reflitam os votos arredondados
  dadosProjecao.forEach(i => {
    i.diferenca = i.votosProjetados - i.votos2018;
    i.peso = (i.votosProjetados / valorProjecao) * 100;
  });
  
  // Atualizar a tabela e informações
  atualizarTabelaProjecao();
  atualizarInfoProjecao();
}

/**
 * Atualiza a área de informações da projeção
 */
/**
 * Atualiza os votos projetados com base nos pesos atuais
 */
function atualizarVotosProjetados() {
  const totalPeso = dadosProjecao.reduce((sum, i) => sum + i.peso, 0);
  let somaVotos = 0;
  
  // Primeiro passe: calcular votos projetados baseados nos pesos
  dadosProjecao.forEach(i => {
    i.votosProjetados = Math.round(valorProjecao * (i.peso / totalPeso));
    somaVotos += i.votosProjetados;
  });
  
  // Ajustar arredondamentos para bater o total exato
  const diferenca = valorProjecao - somaVotos;
  if (diferenca !== 0) {
    // Ajustar os itens com maior resíduo primeiro
    const itensParaAjuste = [...dadosProjecao]
      .map((item, index) => ({
        index,
        residuo: (valorProjecao * (item.peso / totalPeso)) % 1
      }))
      .sort((a, b) => diferenca > 0 ? b.residuo - a.residuo : a.residuo - b.residuo);
    
    for (let i = 0; i < Math.abs(diferenca) && i < itensParaAjuste.length; i++) {
      dadosProjecao[itensParaAjuste[i].index].votosProjetados += diferenca > 0 ? 1 : -1;
    }
  }
  
  // Atualizar diferenças
  dadosProjecao.forEach(i => {
    i.diferenca = i.votosProjetados - i.votos2018;
  });
}

/**
 * Atualiza a área de informações da projeção
 */
function atualizarInfoProjecao() {
  const infoEl = document.getElementById("info-projecao");
  
  if (temValoresManuais) {
    // Mostrar informação com aviso quando há valores manuais
    infoEl.innerHTML = `Votos totais: <strong>${novoTotalProjecao.toLocaleString("pt-BR")}</strong> `;
    
    if (novoTotalProjecao > valorProjecao) {
      infoEl.innerHTML += `(+${(novoTotalProjecao - valorProjecao).toLocaleString("pt-BR")} ajustado)`;
      infoEl.classList.add("info-warning");
    } else {
      infoEl.classList.remove("info-warning");
    }
  } else {
    // Mostrar informação padrão
    infoEl.innerHTML = `Votos totais: <strong>${valorProjecao.toLocaleString("pt-BR")}</strong>`;
    infoEl.classList.remove("info-warning");
  }
}

/**
 * Atualiza a projeção quando um valor é editado manualmente
 */
function atualizaPorVotos(e) {
  const mun = e.target.dataset.mun;
  const novoVotos = parseInt(e.target.textContent.replace(/\D/g, "")) || 0;
  const item = dadosProjecao.find(i => i.municipio === mun);
  if (!item) return;
  
  // Valor original antes da edição
  const votosAnteriores = item.votosProjetados;
  
  // Se o novo valor for inválido ou igual ao anterior, restaurar o valor original
  if (isNaN(novoVotos) || novoVotos < 0) {
    e.target.textContent = votosAnteriores.toLocaleString("pt-BR");
    return;
  }
  
  // Se não houve mudança, não faz nada
  if (novoVotos === votosAnteriores) {
    e.target.textContent = votosAnteriores.toLocaleString("pt-BR");
    return;
  }
  
  // Atualizar o item atual
  item.votosProjetados = novoVotos;
  item.manual = true;
  temValoresManuais = true;
  
  // Calcular a diferença entre o novo total e o total anterior
  const somaVotosManuais = dadosProjecao
    .filter(i => i.manual)
    .reduce((sum, i) => sum + i.votosProjetados, 0);
  
  // Atualizar o total projetado se necessário
  if (somaVotosManuais > valorProjecao) {
    novoTotalProjecao = somaVotosManuais;
  } else {
    novoTotalProjecao = valorProjecao;
  }
  
  // Recalcular pesos para todos os itens
  const itensNaoManuais = dadosProjecao.filter(i => !i.manual);
  const somaVotosManuaisAtual = dadosProjecao
    .filter(i => i.manual)
    .reduce((sum, i) => sum + i.votosProjetados, 0);
  
  const votosRestantes = Math.max(0, novoTotalProjecao - somaVotosManuaisAtual);
  
  if (itensNaoManuais.length > 0) {
    // Calcular a soma dos pesos atuais para itens não manuais
    const somaPesosAtuais = itensNaoManuais.reduce((sum, i) => sum + i.peso, 0);
    
    // Se não temos pesos definidos, distribuir igualmente
    if (somaPesosAtuais <= 0) {
      const pesoPadrao = 100 / itensNaoManuais.length;
      itensNaoManuais.forEach(i => i.peso = pesoPadrao);
    }
    
    // Recalcular os votos para itens não manuais baseado nos pesos
    let somaVotosNaoManuais = 0;
    const novosVotosNaoManuais = [];
    
    // Primeiro passe: calcular votos baseados nos pesos
    itensNaoManuais.forEach(i => {
      const votos = Math.round(votosRestantes * (i.peso / 100));
      novosVotosNaoManuais.push({ item: i, votos });
      somaVotosNaoManuais += votos;
    });
    
    // Ajustar arredondamentos para bater o total exato
    const diferenca = votosRestantes - somaVotosNaoManuais;
    if (diferenca !== 0 && novosVotosNaoManuais.length > 0) {
      // Ordenar por resíduo para distribuir a diferença
      const itensOrdenados = novosVotosNaoManuais
        .map(({ item, votos }) => ({
          item,
          votos,
          residuo: (votosRestantes * (item.peso / 100)) % 1
        }))
        .sort((a, b) => diferenca > 0 ? b.residuo - a.residuo : a.residuo - b.residuo);
      
      // Ajustar os itens com maior resíduo primeiro
      for (let i = 0; i < Math.abs(diferenca) && i < itensOrdenados.length; i++) {
        itensOrdenados[i].votos += diferenca > 0 ? 1 : -1;
      }
    }
    
    // Aplicar os votos calculados e atualizar pesos
    novosVotosNaoManuais.forEach(({ item, votos }) => {
      item.votosProjetados = Math.max(0, votos);
      item.peso = (item.votosProjetados / novoTotalProjecao) * 100;
    });
  }
  
  // Atualizar diferenças e garantir consistência
  dadosProjecao.forEach(i => {
    i.diferenca = i.votosProjetados - i.votos2018;
    // Garantir que o peso reflita os votos arredondados
    i.peso = (i.votosProjetados / novoTotalProjecao) * 100;
  });
  
  // Atualizar a tabela e informações
  atualizarTabelaProjecao();
  atualizarInfoProjecao();
}

/* =========================================================
 *  GRÁFICOS (Chart.js)
 * ========================================================= */
function inicializarGraficos() {
  const paleta = ["#1FB8CD", "#FFC185", "#B4413C", "#ECEBD5", "#5D878F", "#DB4545",
                  "#D2BA4C", "#964325", "#944454", "#13343B"];

  /* Visão geral */
  chartVisaoGeral = new Chart(document.getElementById("chart-visao-geral"), {
    type: "bar",
    data: { labels: [], datasets: [
      { label: "2014", backgroundColor: paleta[0], data: [] },
      { label: "2018", backgroundColor: paleta[1], data: [] }
    ]},
    options: chartOptions()
  });

  /* Crescimento */
  chartCrescimento = new Chart(document.getElementById("chart-crescimento"), {
    type: "bar",
    data: { labels: [], datasets: [
      { label: "Crescimento Absoluto", backgroundColor: "#4CAF50", data: [] }
    ]},
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top" },
        tooltip: {
          callbacks: {
            title: function(context) {
              return context[0].label;
            },
            label: function(context) {
              return `Crescimento absoluto: ${context.parsed.x.toLocaleString("pt-BR")}`;
            }
          }
        }
      },
      scales: {
        x: { 
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return value.toLocaleString("pt-BR");
            }
          }
        },
        y: { 
          beginAtZero: true
        }
      }
    }
  });

  /* Queda */
  chartQueda = new Chart(document.getElementById("chart-queda"), {
    type: "bar",
    data: { labels: [], datasets: [
      { label: "Queda Absoluta", backgroundColor: "#DB4545", data: [] }
    ]},
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top" },
        tooltip: {
          callbacks: {
            title: function(context) {
              return context[0].label;
            },
            label: function(context) {
              return `Queda absoluta: ${context.parsed.x.toLocaleString("pt-BR")}`;
            }
          }
        }
      },
      scales: {
        x: { 
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return value.toLocaleString("pt-BR");
            }
          }
        },
        y: { 
          beginAtZero: true 
        }
      }
    }
  });

  atualizarGraficos();

  function chartOptions(indexAxis = "x") {
    return {
      indexAxis,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top" },
        tooltip: { mode: "index", intersect: false }
      },
      scales: {
        x: { beginAtZero: true },
        y: { beginAtZero: true }
      }
    };
  }
}

function atualizarGraficos() {
  const base = municipioFiltrado === "todos"
    ? dadosCombinados
    : dadosCombinados.filter(i => i.municipio === municipioFiltrado);

  /* Visão geral – Top 10 votos 2018 */
  const top10 = [...base].sort((a, b) => b.votos2018 - a.votos2018).slice(0, 10);
  chartVisaoGeral.data.labels                = top10.map(i => i.municipio);
  chartVisaoGeral.data.datasets[0].data      = top10.map(i => i.votos2014);
  chartVisaoGeral.data.datasets[1].data      = top10.map(i => i.votos2018);
  chartVisaoGeral.update();

  /* Crescimento – Top 10 absolutos positivos */
  const cresc = [...base].filter(i => i.variacaoAbs > 0)
                         .sort((a, b) => b.variacaoAbs - a.variacaoAbs)
                         .slice(0, 10);
  chartCrescimento.data.labels               = cresc.map(i => i.municipio);
  chartCrescimento.data.datasets[0].data     = cresc.map(i => i.variacaoAbs);
  chartCrescimento.update();

  /* Queda – Top 10 absolutos negativos */
  const queda = [...base].filter(i => i.variacaoAbs < 0)
                         .sort((a, b) => a.variacaoAbs - b.variacaoAbs)
                         .slice(0, 10);
  chartQueda.data.labels                     = queda.map(i => i.municipio);
  chartQueda.data.datasets[0].data           = queda.map(i => Math.abs(i.variacaoAbs));
  chartQueda.update();
}

/* =========================================================
 *  ABAS
 * ========================================================= */
function configurarAbas() {
  const tabs = document.querySelectorAll(".tab-btn");
  const panes = document.querySelectorAll(".tab-content");
  
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      // Remover classe ativa de todas as abas e painéis
      tabs.forEach(t => t.classList.remove("active"));
      panes.forEach(p => p.classList.remove("active"));
      
      // Adicionar classe ativa à aba e painel clicados
      tab.classList.add("active");
      const tabId = tab.dataset.tab;
      document.getElementById(tabId).classList.add("active");
    });
  });
}

/* =========================================================
 *  EVENTOS GERAIS
 * ========================================================= */
function configurarEventos() {
  document.getElementById("filtro-municipio").addEventListener("change", e => {
    municipioFiltrado = e.target.value;
    atualizarKPIs();
    atualizarGraficos();
    aplicarFiltros(termoBuscaAtual);
    calcularProjecao();
    atualizarTabelaProjecao();
  });
}
