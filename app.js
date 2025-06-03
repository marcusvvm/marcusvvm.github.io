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
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const resp = await fetch("municipios_dados.json");
    if (!resp.ok) throw new Error("Não consegui ler municipios_dados.json");
    dadosEleitorais.municipios = await resp.json();
    // Só processamos e inicializamos se os dados forem carregados com sucesso
    processarDados();
    inicializarFiltroMunicipios();
    atualizarKPIs();
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
    
    // Se for um dos KPIs de crescimento e o valor for negativo, aplicar classe para texto vermelho
    if ((id === "kpi-cresc-absoluto") && v < 0) {
      element.classList.add("valor-negativo");
    } else {
      element.classList.remove("valor-negativo");
    }
  }
  
  function setKpiPct(id, p) { 
    const element = document.getElementById(id);
    element.textContent = `${p.toFixed(2).replace(".", ",")}%`;
    
    // Se for um dos KPIs de crescimento percentual e o valor for negativo, aplicar classe para texto vermelho
    if ((id === "kpi-cresc-percentual") && p < 0) {
      element.classList.add("valor-negativo");
    } else {
      element.classList.remove("valor-negativo");
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
  document.querySelectorAll(".filter-buttons .btn").forEach(b => b.classList.remove("active"));
  document.getElementById(`btn-${tipo}`).classList.add("active");
  aplicarFiltros(termoBuscaAtual);
}

function aplicarFiltros(buscaTxt = "") {
  let arr = [...dadosCombinados];

  if (municipioFiltrado !== "todos") arr = arr.filter(i => i.municipio === municipioFiltrado);
  if (buscaTxt.trim() !== "") {
    const t = buscaTxt.toLowerCase();
    arr = arr.filter(i => i.municipio.toLowerCase().includes(t));
  }

  switch (filtroAtual) {
    case "crescimento": arr = arr.filter(i => i.variacaoAbs > 0); break;
    case "queda":       arr = arr.filter(i => i.variacaoAbs < 0); break;
    case "sem-votos":   arr = arr.filter(i => i.votos2018 === 0); break;
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
          <td>${formatSigned(i.variacaoPerc.toFixed(2).replace(".", ","))}%</td>
        </tr>
      `);
    });
  }

  const tot = Math.ceil(dadosFiltrados.length / itensPorPagina) || 1;
  document.getElementById("info-paginacao").textContent = `Página ${paginaAtual} de ${tot}`;
  document.getElementById("btn-anterior").disabled = paginaAtual === 1;
  document.getElementById("btn-proximo").disabled  = paginaAtual === tot;

  function formatSigned(v) { return v > 0 ? `+${v}` : `${v}`; }
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
    const vA = a[ordemAtualProjecao.coluna], vB = b[ordemAtualProjecao.coluna];
    if (ordemAtualProjecao.coluna === "municipio")
      return ordemAtualProjecao.direcao === "asc" ? vA.localeCompare(vB, "pt-BR") : vB.localeCompare(vA, "pt-BR");
    return ordemAtualProjecao.direcao === "asc" ? vA - vB : vB - vA;
  });

  const tbody = document.querySelector("#tabela-projecao tbody");
  tbody.innerHTML = "";

  const ini = (paginaAtualProjecao - 1) * itensPorPaginaProjecao;
  const fim = ini + itensPorPaginaProjecao;
  ord.slice(ini, fim).forEach(i => {
    // Adicionar classes para destacar valores manuais
    const classeManual = i.manual ? "valor-manual" : "";
    
    tbody.insertAdjacentHTML("beforeend", `
      <tr>
        <td>${i.municipio}</td>
        <td>${i.votos2018.toLocaleString("pt-BR")}</td>
        <td contenteditable="true" class="peso-edit" data-mun="${i.municipio}">${i.peso.toFixed(2).replace(".", ",")}</td>
        <td contenteditable="true" class="proj-edit ${classeManual}" data-mun="${i.municipio}">${i.votosProjetados.toLocaleString("pt-BR")}</td>
        <td class="diferenca-valor">+${i.diferenca.toLocaleString("pt-BR")}</td>
      </tr>
    `);
  });

  document.querySelectorAll(".peso-edit").forEach(c => {
    c.onblur = atualizaPorPeso;
    c.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); c.blur(); } };
  });
  document.querySelectorAll(".proj-edit").forEach(c => {
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
  const novo = parseFloat(e.target.textContent.replace(",", ".")) || 0;
  const item = dadosProjecao.find(i => i.municipio === mun);
  if (!item) return;
  
  // Valor original antes da edição
  const valorOriginal = item.peso;
  
  // Atualizar o peso
  item.peso = novo;
  
  // Calcular os novos votos projetados baseado no peso
  const votosProjetados = Math.round(valorProjecao * novo / 100);
  
  // Se o valor projetado mudou significativamente, marcamos como manual
  if (Math.abs(votosProjetados - item.votosProjetados) > 0) {
    item.votosProjetados = votosProjetados;
    item.manual = true;
    temValoresManuais = true;
    
    // Recalcular a diferença entre votos projetados e votos 2018
    item.diferenca = votosProjetados - item.votos2018;
    
    // Recalcular o novo total, similar à função atualizaPorVotos
    novoTotalProjecao = valorProjecao;
    
    // Verificar se há outros valores manuais
    let somaValoresManuais = dadosProjecao.reduce((sum, i) => {
      if (i.manual) {
        return sum + i.votosProjetados;
      }
      return sum;
    }, 0);
    
    if (somaValoresManuais > valorProjecao) {
      novoTotalProjecao = somaValoresManuais;
    }
    
    // Atualizar a área de informações
    atualizarInfoProjecao();
  } else {
    item.votosProjetados = votosProjetados;
  }
  
  atualizarTabelaProjecao();
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
  const novo = parseInt(e.target.textContent.replace(/\D/g, "")) || 0;
  const item = dadosProjecao.find(i => i.municipio === mun);
  if (!item) return;
  
  // Valor original antes da edição
  const valorOriginal = item.votosProjetados;
  
  // Delta entre o valor manual e o original
  const delta = novo - valorOriginal;
  
  // Atualizar o valor editado e marcar como manual
  item.votosProjetados = novo;
  item.manual = true;
  temValoresManuais = true;
  
  // Recalcular a diferença entre votos projetados e votos 2018
  item.diferenca = novo - item.votos2018;
  
  // Calcular o novo total
  novoTotalProjecao = valorProjecao;
  if (novo > valorProjecao) {
    // Se o valor manual excede o valor da projeção, ajustamos o total
    novoTotalProjecao = valorProjecao + delta;
  }
  
  // Verificar se há valores manuais adicionais que excedem a projeção
  const somaValoresManuais = dadosProjecao.reduce((sum, i) => {
    if (i.manual && i.municipio !== mun) {
      return sum + i.votosProjetados;
    }
    return sum;
  }, novo); // Começamos com o valor atual que acabou de ser editado
  
  // Se a soma dos valores manuais excede valorProjecao, ajustamos novoTotal
  if (somaValoresManuais > valorProjecao) {
    novoTotalProjecao = somaValoresManuais;
  }
  
  // Atualizar o peso do município editado
  item.peso = novoTotalProjecao ? (novo / novoTotalProjecao) * 100 : 0;
  
  // Recalcular os votos e pesos para os demais municípios
  let somaPesosMunicipiosNaoEditados = 0;
  let somaVotosMunicipiosEditados = 0;
  
  // Identificar municípios editados manualmente e somar seus pesos e votos
  dadosProjecao.forEach(i => {
    if (i.manual) {
      somaVotosMunicipiosEditados += i.votosProjetados;
    } else {
      somaPesosMunicipiosNaoEditados += i.peso;
    }
  });
  
  // Recalcular os valores para municípios não editados
  const valorRestante = novoTotalProjecao - somaVotosMunicipiosEditados;
  
  // Lista temporária para armazenar os novos valores com resíduos
  const municipiosParaAjuste = [];
  
  dadosProjecao.forEach(i => {
    if (!i.manual) {
      // Recalcular o peso proporcional
      const pesoAjustado = somaPesosMunicipiosNaoEditados > 0 ?
        (i.peso / somaPesosMunicipiosNaoEditados) * 100 : 0;
      
      // Calcular o novo valor projetado
      const votosProjetadosExato = valorRestante * pesoAjustado / 100;
      const votosProjetadosArredondado = Math.round(votosProjetadosExato);
      
      i.votosProjetados = votosProjetadosArredondado;
      i.peso = novoTotalProjecao ? (i.votosProjetados / novoTotalProjecao) * 100 : 0;
      
      // Recalcular a diferença entre votos projetados e votos 2018
      i.diferenca = i.votosProjetados - i.votos2018;
      
      municipiosParaAjuste.push({
        indice: dadosProjecao.indexOf(i),
        residuo: votosProjetadosExato - votosProjetadosArredondado
      });
    }
  });
  
  // Verificar se precisamos ajustar para que a soma bata exatamente com novoTotalProjecao
  const somaTodosVotos = dadosProjecao.reduce((sum, i) => sum + i.votosProjetados, 0);
  let diferencaFinal = novoTotalProjecao - somaTodosVotos;
  
  if (diferencaFinal !== 0 && municipiosParaAjuste.length > 0) {
    // Ordenar por resíduo
    municipiosParaAjuste.sort((a, b) => 
      diferencaFinal > 0 ? b.residuo - a.residuo : a.residuo - b.residuo
    );
    
    // Distribuir a diferença
    for (let i = 0; i < Math.abs(diferencaFinal) && i < municipiosParaAjuste.length; i++) {
      const municipio = dadosProjecao[municipiosParaAjuste[i].indice];
      municipio.votosProjetados += diferencaFinal > 0 ? 1 : -1;
      municipio.peso = novoTotalProjecao ? (municipio.votosProjetados / novoTotalProjecao) * 100 : 0;
    }
  }
  
  // Verificar soma final para garantir que bate com novoTotalProjecao
  const somaFinal = dadosProjecao.reduce((sum, i) => sum + i.votosProjetados, 0);
  console.log(`Novo total: ${novoTotalProjecao}, Soma final: ${somaFinal}`);
  
  // Atualizar a área de informações
  atualizarInfoProjecao();
  
  // Atualizar a tabela
  atualizarTabelaProjecao();
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
      tabs.forEach(t => t.classList.remove("active"));
      panes.forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab).classList.add("active");
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
