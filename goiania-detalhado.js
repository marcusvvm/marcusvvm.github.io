// Módulo Goiânia Detalhado
class GoianiaDetalhado {
  constructor() {
    // Dados brutos carregados do JSON
    this.dadosBrutos = [];
    
    // Dados agrupados por nível (zona, local, secao)
    this.dadosAgrupados = {
      zona: new Map(),
      local: new Map(),
      secao: new Map()
    };
    
    // Estado atual da navegação
    this.estado = {
      nivelAtual: 'zona',
      nivelAnterior: null,
      itemSelecionado: null,
      anoSelecionado: '2018',
      historico: []
    };
    
    // Referências aos elementos do DOM
    this.refs = {
      grafico: document.getElementById('grafico-pizza'),
      breadcrumb: document.getElementById('breadcrumb'),
      detalhesLista: document.getElementById('detalhes-lista'),
      anoSelecionado: document.getElementById('ano-selecionado'),
      estatisticas: {
        aptos: document.getElementById('estatistica-aptos'),
        comparecimento: document.getElementById('estatistica-comparecimento'),
        abstencoes: document.getElementById('estatistica-abstencoes'),
        votos: document.getElementById('estatistica-votos'),
        porcentagem: document.getElementById('estatistica-porcentagem')
      }
    };
    
    // Instância do gráfico
    this.grafico = null;
    
    // Inicialização
    this.inicializar();
  }
  
  async inicializar() {
    // Carregar dados do JSON
    await this.carregarDados();
    
    // Processar dados
    this.processarDados();
    
    // Configurar eventos
    this.configurarEventos();
    
    // Renderizar visualização inicial
    this.atualizarVisualizacao();
  }
  
  async carregarDados() {
    try {
      const resposta = await fetch('goiania-2014-2018.json');
      this.dadosBrutos = await resposta.json();
      console.log('Dados carregados com sucesso:', this.dadosBrutos.length, 'registros');
    } catch (erro) {
      console.error('Erro ao carregar dados:', erro);
      alert('Erro ao carregar os dados. Por favor, verifique o console para mais detalhes.');
    }
  }
  
  processarDados() {
    // Limpar dados agrupados
    this.dadosAgrupados.zona.clear();
    this.dadosAgrupados.local.clear();
    this.dadosAgrupados.secao.clear();
    
    // Filtrar dados pelo ano selecionado
    const dadosFiltrados = this.dadosBrutos.filter(item => item.ANO === this.estado.anoSelecionado);
    
    // Agrupar por zona
    dadosFiltrados.forEach(item => {
      const chaveZona = `Zona ${item.ZONA}`;
      const chaveLocal = `${item.LOCAL} (${item.ENDERECO})`;
      const chaveSecao = `Seção ${item.SECAO}`;
      
      // Atualizar totais por zona
      if (!this.dadosAgrupados.zona.has(chaveZona)) {
        this.dadosAgrupados.zona.set(chaveZona, {
          aptos: 0,
          comparecimento: 0,
          abstencoes: 0,
          votos: 0,
          locais: new Set(),
          secoes: new Set()
        });
      }
      
      const zona = this.dadosAgrupados.zona.get(chaveZona);
      zona.aptos += parseInt(item['APTOS A VOTAR']) || 0;
      zona.comparecimento += parseInt(item.COMPARECIMENTO) || 0;
      zona.abstencoes += parseInt(item.ABSTENCOES) || 0;
      zona.votos += parseInt(item['VOTOS (NO CANDIDATO)']) || 0;
      zona.locais.add(chaveLocal);
      zona.secoes.add(chaveSecao);
      
      // Agrupar por local
      if (!this.dadosAgrupados.local.has(chaveLocal)) {
        this.dadosAgrupados.local.set(chaveLocal, {
          zona: chaveZona,
          aptos: 0,
          comparecimento: 0,
          abstencoes: 0,
          votos: 0,
          secoes: new Set()
        });
      }
      
      const local = this.dadosAgrupados.local.get(chaveLocal);
      local.aptos += parseInt(item['APTOS A VOTAR']) || 0;
      local.comparecimento += parseInt(item.COMPARECIMENTO) || 0;
      local.abstencoes += parseInt(item.ABSTENCOES) || 0;
      local.votos += parseInt(item['VOTOS (NO CANDIDATO)']) || 0;
      local.secoes.add(chaveSecao);
      
      // Agrupar por seção
      const chaveCompletaSecao = `${chaveZona} > ${chaveLocal} > ${chaveSecao}`;
      this.dadosAgrupados.secao.set(chaveCompletaSecao, {
        zona: chaveZona,
        local: chaveLocal,
        secao: chaveSecao,
        aptos: parseInt(item['APTOS A VOTAR']) || 0,
        comparecimento: parseInt(item.COMPARECIMENTO) || 0,
        abstencoes: parseInt(item.ABSTENCOES) || 0,
        votos: parseInt(item['VOTOS (NO CANDIDATO)']) || 0
      });
    });
    
    console.log('Dados processados:', this.dadosAgrupados);
  }
  
  configurarEventos() {
    // Evento de mudança de ano
    this.refs.anoSelecionado.addEventListener('change', (event) => {
      this.estado.anoSelecionado = event.target.value;
      this.processarDados();
      this.resetarNavegacao();
      this.atualizarVisualizacao();
    });
    
    // Evento de clique no breadcrumb
    this.refs.breadcrumb.addEventListener('click', (event) => {
      const item = event.target.closest('.breadcrumb-item');
      if (!item || !item.dataset.nivel) return;
      
      const nivel = item.dataset.nivel;
      const indice = this.estado.historico.findIndex(h => h.nivel === nivel);
      
      if (indice !== -1) {
        // Navegar para o nível no histórico
        this.estado.historico = this.estado.historico.slice(0, indice + 1);
        this.estado.nivelAtual = nivel;
        this.estado.itemSelecionado = indice >= 0 ? this.estado.historico[indice].item : null;
        this.atualizarVisualizacao();
      }
    });
  }
  
  resetarNavegacao() {
    this.estado = {
      ...this.estado,
      nivelAtual: 'zona',
      nivelAnterior: null,
      itemSelecionado: null,
      historico: []
    };
  }
  
  atualizarVisualizacao() {
    this.atualizarBreadcrumb();
    this.atualizarGrafico();
    this.atualizarListaItens();
    this.atualizarEstatisticas();
  }
  
  atualizarBreadcrumb() {
    const { nivelAtual, itemSelecionado, historico } = this.estado;
    let breadcrumbHTML = '';
    
    // Item inicial (Zonas Eleitorais)
    breadcrumbHTML += `
      <span class="breadcrumb-item ${nivelAtual === 'zona' ? 'active' : ''}" 
            data-nivel="zona">
        Zonas Eleitorais
      </span>`;
    
    // Adicionar itens do histórico
    historico.forEach((item, index) => {
      const isUltimo = index === historico.length - 1;
      const itemTexto = item.nivel === 'zona' 
        ? `Zona ${item.item.replace('Zona ', '')}` 
        : item.nivel === 'local' 
          ? item.item.split(' (')[0] 
          : item.item;
      
      breadcrumbHTML += `
        <span class="breadcrumb-separator">›</span>
        <span class="breadcrumb-item ${isUltimo ? 'active' : ''}" 
              data-nivel="${item.nivel}" 
              data-item="${item.item}">
          ${itemTexto}
        </span>`;
    });
    
    this.refs.breadcrumb.innerHTML = breadcrumbHTML;
  }
  
  atualizarGrafico() {
    const { nivelAtual, itemSelecionado } = this.estado;
    let dadosGrafico = [];
    
    if (nivelAtual === 'zona') {
      // Mostrar todas as zonas
      dadosGrafico = Array.from(this.dadosAgrupados.zona.entries())
        .map(([zona, dados]) => ({
          label: zona,
          value: dados.votos,
          dados: dados
        }));
    } else if (nivelAtual === 'local' && itemSelecionado) {
      // Mostrar locais da zona selecionada
      const zona = this.dadosAgrupados.zona.get(itemSelecionado);
      if (zona) {
        dadosGrafico = Array.from(zona.locais)
          .map(local => {
            const dadosLocal = this.dadosAgrupados.local.get(local);
            return {
              label: local.split(' (')[0], // Remove o endereço para o rótulo
              value: dadosLocal.votos,
              dados: dadosLocal
            };
          });
      }
    } else if (nivelAtual === 'secao' && itemSelecionado) {
      // Mostrar seções do local selecionado
      const local = this.dadosAgrupados.local.get(itemSelecionado);
      if (local) {
        dadosGrafico = Array.from(local.secoes)
          .map(secao => {
            const chaveCompleta = `${local.zona} > ${itemSelecionado} > ${secao}`;
            const dadosSecao = this.dadosAgrupados.secao.get(chaveCompleta);
            return {
              label: secao,
              value: dadosSecao.votos,
              dados: dadosSecao
            };
          });
      }
    }
    
    // Ordenar por valor decrescente
    dadosGrafico.sort((a, b) => b.value - a.value);
    
    // Configurar cores para o gráfico
    const cores = this.gerarCores(dadosGrafico.length);
    
    // Configuração do gráfico
    const config = {
      type: 'pie',
      data: {
        labels: dadosGrafico.map(item => item.label),
        datasets: [{
          data: dadosGrafico.map(item => item.value),
          backgroundColor: cores,
          borderColor: '#fff',
          borderWidth: 1,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 12,
              padding: 15,
              font: {
                size: 11
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percent = Math.round((value / total) * 100);
                return `${label}: ${value.toLocaleString('pt-BR')} votos (${percent}%)`;
              }
            }
          }
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const item = dadosGrafico[index];
            this.navegarParaProximoNivel(item);
          }
        }
      }
    };
    
    // Destruir gráfico existente se existir
    if (this.grafico) {
      this.grafico.destroy();
    }
    
    // Criar novo gráfico
    const ctx = this.refs.grafico.getContext('2d');
    this.grafico = new Chart(ctx, config);
  }
  
  atualizarListaItens() {
    const { nivelAtual, itemSelecionado } = this.estado;
    let itens = [];
    
    if (nivelAtual === 'zona') {
      // Listar todas as zonas
      itens = Array.from(this.dadosAgrupados.zona.entries())
        .map(([zona, dados]) => ({
          label: zona,
          valor: dados.votos,
          dados: dados
        }));
    } else if (nivelAtual === 'local' && itemSelecionado) {
      // Listar locais da zona selecionada
      const zona = this.dadosAgrupados.zona.get(itemSelecionado);
      if (zona) {
        itens = Array.from(zona.locais)
          .map(local => {
            const dadosLocal = this.dadosAgrupados.local.get(local);
            return {
              label: local,
              valor: dadosLocal.votos,
              dados: dadosLocal
            };
          });
      }
    } else if (nivelAtual === 'secao' && itemSelecionado) {
      // Listar seções do local selecionado
      const local = this.dadosAgrupados.local.get(itemSelecionado);
      if (local) {
        itens = Array.from(local.secoes)
          .map(secao => {
            const chaveCompleta = `${local.zona} > ${itemSelecionado} > ${secao}`;
            const dadosSecao = this.dadosAgrupados.secao.get(chaveCompleta);
            return {
              label: secao,
              valor: dadosSecao.votos,
              dados: dadosSecao
            };
          });
      }
    }
    
    // Ordenar por valor decrescente
    itens.sort((a, b) => b.valor - a.valor);
    
    // Gerar HTML da lista
    const listaHTML = itens.map(item => `
      <div class="detalhe-item" data-item="${item.label}">
        <span class="nome">${item.label}</span>
        <span class="valor">${item.valor.toLocaleString('pt-BR')} votos</span>
      </div>
    `).join('');
    
    this.refs.detalhesLista.innerHTML = listaHTML || '<div class="sem-dados">Nenhum item encontrado</div>';
    
    // Adicionar eventos de clique nos itens
    document.querySelectorAll('.detalhe-item').forEach(item => {
      item.addEventListener('click', () => {
        const itemSelecionado = itens.find(i => i.label === item.dataset.item);
        if (itemSelecionado) {
          this.navegarParaProximoNivel(itemSelecionado);
        }
      });
    });
  }
  
  atualizarEstatisticas() {
    const { nivelAtual, itemSelecionado } = this.estado;
    let estatisticas = {
      aptos: 0,
      comparecimento: 0,
      abstencoes: 0,
      votos: 0,
      porcentagem: 0
    };
    
    // Calcular estatísticas com base no nível atual e item selecionado
    if (nivelAtual === 'zona' && itemSelecionado) {
      const dados = this.dadosAgrupados.zona.get(itemSelecionado);
      if (dados) {
        estatisticas = {
          aptos: dados.aptos,
          comparecimento: dados.comparecimento,
          abstencoes: dados.abstencoes,
          votos: dados.votos,
          porcentagem: (dados.votos / dados.comparecimento) * 100 || 0
        };
      }
    } else if (nivelAtual === 'local' && itemSelecionado) {
      const dados = this.dadosAgrupados.local.get(itemSelecionado);
      if (dados) {
        estatisticas = {
          aptos: dados.aptos,
          comparecimento: dados.comparecimento,
          abstencoes: dados.abstencoes,
          votos: dados.votos,
          porcentagem: (dados.votos / dados.comparecimento) * 100 || 0
        };
      }
    } else if (nivelAtual === 'secao' && itemSelecionado) {
      const chaveCompleta = this.estado.historico
        .map(h => h.item)
        .concat(itemSelecionado)
        .join(' > ');
      
      const dados = this.dadosAgrupados.secao.get(chaveCompleta);
      if (dados) {
        estatisticas = {
          aptos: dados.aptos,
          comparecimento: dados.comparecimento,
          abstencoes: dados.abstencoes,
          votos: dados.votos,
          porcentagem: (dados.votos / dados.comparecimento) * 100 || 0
        };
      }
    } else {
      // Estatísticas totais (todas as zonas)
      let totalAptos = 0;
      let totalComparecimento = 0;
      let totalAbstencoes = 0;
      let totalVotos = 0;
      
      this.dadosAgrupados.zona.forEach(zona => {
        totalAptos += zona.aptos;
        totalComparecimento += zona.comparecimento;
        totalAbstencoes += zona.abstencoes;
        totalVotos += zona.votos;
      });
      
      estatisticas = {
        aptos: totalAptos,
        comparecimento: totalComparecimento,
        abstencoes: totalAbstencoes,
        votos: totalVotos,
        porcentagem: (totalVotos / totalComparecimento) * 100 || 0
      };
    }
    
    // Atualizar a interface
    this.refs.estatisticas.aptos.textContent = estatisticas.aptos.toLocaleString('pt-BR');
    this.refs.estatisticas.comparecimento.textContent = estatisticas.comparecimento.toLocaleString('pt-BR');
    this.refs.estatisticas.abstencoes.textContent = estatisticas.abstencoes.toLocaleString('pt-BR');
    this.refs.estatisticas.votos.textContent = estatisticas.votos.toLocaleString('pt-BR');
    this.refs.estatisticas.porcentagem.textContent = estatisticas.porcentagem.toFixed(2).replace('.', ',') + '%';
  }
  
  navegarParaProximoNivel(item) {
    const { nivelAtual } = this.estado;
    let proximoNivel = null;
    
    // Determinar o próximo nível com base no nível atual
    if (nivelAtual === 'zona') {
      proximoNivel = 'local';
    } else if (nivelAtual === 'local') {
      proximoNivel = 'secao';
    } else {
      // Nível máximo atingido (seção)
      return;
    }
    
    // Atualizar estado
    this.estado.nivelAnterior = nivelAtual;
    this.estado.nivelAtual = proximoNivel;
    this.estado.itemSelecionado = item.label;
    
    // Adicionar ao histórico se não for uma navegação para trás
    if (!this.estado.historico.some(h => h.nivel === nivelAtual && h.item === item.label)) {
      this.estado.historico.push({
        nivel: nivelAtual,
        item: item.label
      });
    }
    
    // Atualizar a visualização
    this.atualizarVisualizacao();
  }
  
  gerarCores(quantidade) {
    // Gerar cores aleatórias para o gráfico
    const cores = [];
    const baseHue = Math.floor(Math.random() * 360);
    
    for (let i = 0; i < quantidade; i++) {
      const hue = (baseHue + (i * (360 / quantidade))) % 360;
      const saturation = 70 + Math.floor(Math.random() * 20);
      const lightness = 50 + Math.floor(Math.random() * 20);
      cores.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    }
    
    return cores;
  }
}

// Inicializar o módulo quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  // Verificar se estamos na aba correta
  const urlParams = new URLSearchParams(window.location.search);
  const abaAtiva = urlParams.get('aba') || 'visao-geral';
  
  if (abaAtiva === 'goiania-detalhado') {
    // Inicializar o módulo
    window.goianiaDetalhado = new GoianiaDetalhado();
  }
});
