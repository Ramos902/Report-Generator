"use strict";

/**
 * Utilitários para seleção de elementos no DOM
 */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

/**
 * Estado Global e Gerenciamento de Dados
 */
const state = {
  chaveBase: 'plantao-',
  // Retorna a chave do LocalStorage baseada na data atual selecionada
  get chave() { 
    return this.chaveBase + ($('#dataPlantao').value || hojeISO()); 
  },
  data: {
    dataPlantao: '',
    rondas: { r1: '', r2: '', r3: '' },
    atividades: [], // {id, numero, texto, criadoEm}
    chamados: [],   // {id, numero, texto, criadoEm}
    infos: []       // {id, texto, criadoEm}
  }
};

/**
 * Retorna a data atual no formato YYYY-MM-DD ajustada pelo fuso local
 */
function hojeISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const d2 = new Date(d.getTime() - off * 60 * 1000);
  return d2.toISOString().slice(0, 10);
}

/**
 * Normaliza a estrutura de dados (para compatibilidade com versões anteriores ou importações falhas)
 */
function normalizarData(obj) {
  obj.rondas = obj.rondas || { r1: '', r2: '', r3: '' };
  
  const mapItem = (a) => {
    if (!a) return null;
    if (typeof a === 'string') return { id: crypto.randomUUID(), numero: '', texto: a, criadoEm: new Date().toISOString() };
    return { 
      id: a.id || crypto.randomUUID(), 
      numero: (a.numero || a.num || '') + '', 
      texto: a.texto || a.descricao || '', 
      criadoEm: a.criadoEm || new Date().toISOString() 
    };
  };

  obj.atividades = (obj.atividades || []).map(mapItem).filter(Boolean);
  obj.chamados = (obj.chamados || []).map(mapItem).filter(Boolean);
  obj.infos = (obj.infos || []).map(a => ({ 
    id: a.id || crypto.randomUUID(), 
    texto: a.texto || a || '', 
    criadoEm: a.criadoEm || new Date().toISOString() 
  }));
  
  return obj;
}

/**
 * Salva o estado atual no LocalStorage
 */
function salvar() {
  state.data.dataPlantao = $('#dataPlantao').value;
  state.data.rondas.r1 = $('#ronda1').value;
  state.data.rondas.r2 = $('#ronda2').value;
  state.data.rondas.r3 = $('#ronda3').value;
  
  try { 
    localStorage.setItem(state.chave, JSON.stringify(state.data)); 
  } catch(e) { 
    console.error('Erro ao salvar no localStorage', e); 
  }
}

/**
 * Carrega os dados do LocalStorage para a data selecionada
 */
function carregar() {
  const bruto = localStorage.getItem(state.chave);
  if (bruto) {
    try { 
      state.data = normalizarData(JSON.parse(bruto)); 
    } catch(e) { 
      console.error('Erro ao fazer parse dos dados', e); 
    }
  } else {
    // Se não há dados, inicializa vazio
    state.data = normalizarData({});
  }
  
  // Popula a interface
  $('#ronda1').value = state.data.rondas.r1 || '';
  $('#ronda2').value = state.data.rondas.r2 || '';
  $('#ronda3').value = state.data.rondas.r3 || '';
  
  renderListas();
}

/**
 * Reseta os dados da data atual
 */
function resetarData() {
  state.data = { 
    dataPlantao: $('#dataPlantao').value, 
    rondas: { r1: '', r2: '', r3: '' }, 
    atividades: [], 
    chamados: [], 
    infos: [] 
  };
  salvar();
  carregar();
}

/**
 * Lógica de Navegação em Abas (Tabs)
 */
function ativarTab(nome) {
  // Ajusta estilização dos botões
  $$('.tab-btn').forEach(btn => {
    const ativo = btn.dataset.tab === nome;
    if (ativo) {
      btn.classList.add('active-tab', 'text-blue-600', 'dark:text-blue-400');
      btn.classList.remove('text-slate-500');
    } else {
      btn.classList.remove('active-tab', 'text-blue-600', 'dark:text-blue-400');
      btn.classList.add('text-slate-500');
    }
  });

  // Mostra a aba correta
  $$('.tab-pane').forEach(p => p.classList.add('hidden'));
  const pane = $('#tab-' + nome);
  if (pane) pane.classList.remove('hidden');
}

/**
 * Helpers para formatação e criação de objetos
 */
function normalizaNumero(v) { return String(v || '').replace(/\D+/g, ''); }
function criarItem(texto) { return { id: crypto.randomUUID(), texto, criadoEm: new Date().toISOString() }; }
function criarAtividade(numero, texto) { return { id: crypto.randomUUID(), numero: normalizaNumero(numero), texto, criadoEm: new Date().toISOString() }; }

/**
 * Exibe as notificações temporárias em tela
 */
function feedback(msg) {
  const div = document.createElement('div');
  div.textContent = msg;
  div.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xl font-medium text-sm toast-enter-active z-50';
  document.body.appendChild(div);
  
  setTimeout(() => { 
    div.classList.replace('toast-enter-active', 'toast-leave-active'); 
    setTimeout(() => div.remove(), 300); 
  }, 2000);
}

/**
 * ========================================================
 * Funções de Renderização de Listas (DOM Inject)
 * ========================================================
 */

function criarElementoLista(item, tipoLista) {
  const li = document.createElement('li');
  li.className = 'group flex flex-col sm:flex-row gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 transition-all hover:border-slate-300 dark:hover:border-slate-700';

  // O input de número só existe para Atividades e Chamados
  const inputBaseClasses = 'px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all';
  
  let row = document.createElement('div');
  row.className = 'flex flex-1 gap-3 flex-col sm:flex-row';

  if (tipoLista === 'atividades' || tipoLista === 'chamados') {
    const num = document.createElement('input');
    num.type = 'text';
    num.inputMode = 'numeric';
    num.placeholder = 'Nº';
    num.className = `${inputBaseClasses} sm:w-32`;
    num.value = item.numero || '';
    num.addEventListener('input', () => { 
      item.numero = normalizaNumero(num.value); 
      num.value = item.numero; 
      salvar(); 
    });
    row.appendChild(num);
  }

  const ta = document.createElement('textarea');
  ta.className = `${inputBaseClasses} flex-1 resize-y min-h-[42px]`;
  ta.placeholder = 'Descrição...';
  ta.value = item.texto || '';
  ta.addEventListener('input', () => { 
    item.texto = ta.value; 
    salvar(); 
  });
  row.appendChild(ta);

  // Botão excluir e data
  const aside = document.createElement('div');
  aside.className = 'flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 min-w-[80px]';
  
  const del = document.createElement('button');
  del.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition-colors';
  del.textContent = 'Remover';
  del.addEventListener('click', () => {
    if (!confirm('Excluir este item?')) return;
    const idx = state.data[tipoLista].findIndex(x => x.id === item.id);
    if (idx > -1) { 
      state.data[tipoLista].splice(idx, 1); 
      salvar(); 
      renderListas(); 
    }
  });

  aside.appendChild(del);
  li.appendChild(row);
  li.appendChild(aside);

  return li;
}

function renderAtividades() {
  const el = $('#listaAtividades'); el.innerHTML = '';
  state.data.atividades.forEach(item => el.appendChild(criarElementoLista(item, 'atividades')));
}

function renderChamados() {
  const el = $('#listaChamados'); el.innerHTML = '';
  state.data.chamados.forEach(item => el.appendChild(criarElementoLista(item, 'chamados')));
}

function renderInfos() {
  const el = $('#listaInfos'); el.innerHTML = '';
  state.data.infos.forEach(item => el.appendChild(criarElementoLista(item, 'infos')));
}

function renderListas() {
  renderAtividades();
  renderChamados();
  renderInfos();
}

/**
 * ========================================================
 * Geração de Relatório
 * ========================================================
 */

function bulletsAtividades(arr) {
  if (!arr || arr.length === 0) return '• (sem registros)';
  return arr.map(x => `• Chamado (${x.numero || 's/n'}) - ${String(x.texto || '').trim()}`).join('\n');
}

function bullets(arr) {
  if (!arr || arr.length === 0) return '• (sem registros)';
  return arr.map(x => `• ${String(x.texto || '').trim()}`).join('\n');
}

function gerarRelatorio() {
  const d = $('#dataPlantao').value || hojeISO();
  const r1 = (state.data.rondas.r1 || '').trim();
  const r2 = (state.data.rondas.r2 || '').trim();
  const r3 = (state.data.rondas.r3 || '').trim();

  const texto = 
`RELATÓRIO DE PLANTÃO – ${d}

RONDAS:
- Ronda 1: ${r1 || '(sem registros)'}
- Ronda 2: ${r2 || '(sem registros)'}
- Ronda 3: ${r3 || '(sem registros)'}

ATIVIDADES REALIZADAS (exceções):
${bulletsAtividades(state.data.atividades)}

CHAMADOS NÃO SOLUCIONADOS E JUSTIFICATIVA:
${bulletsAtividades(state.data.chamados)}

INFORMAÇÕES RELEVANTES PARA O PRÓXIMO PLANTONISTA:
${bullets(state.data.infos)}
`;

  $('#saidaRelatorio').value = texto;
  return texto;
}

async function copiarRelatorio() {
  const txt = $('#saidaRelatorio').value || gerarRelatorio();
  try {
    await navigator.clipboard.writeText(txt);
    feedback('Relatório copiado com sucesso!');
  } catch(e) {
    // Fallback caso a API moderna não seja suportada
    try { 
      $('#saidaRelatorio').select(); 
      document.execCommand('copy'); 
      feedback('Relatório copiado!'); 
    } catch(err) { 
      feedback('Selecione e copie o texto manualmente.'); 
    }
  }
}

/**
 * ========================================================
 * Importação e Exportação
 * ========================================================
 */

function exportJSON() {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); 
  a.href = URL.createObjectURL(blob);
  a.download = `plantao-${$('#dataPlantao').value || hojeISO()}.json`;
  a.click();
}

function exportTXT() {
  const txt = gerarRelatorio();
  const blob = new Blob([txt], { type: 'text/plain' });
  const a = document.createElement('a'); 
  a.href = URL.createObjectURL(blob);
  a.download = `relatorio-${$('#dataPlantao').value || hojeISO()}.txt`;
  a.click();
}

/**
 * ========================================================
 * Inicialização e Event Listeners
 * ========================================================
 */

window.addEventListener('DOMContentLoaded', () => {
  // Inicialização básica
  $('#dataPlantao').value = hojeISO();
  carregar();
  salvar();
  ativarTab('rondas');

  // Auto-save Rondas
  ['#ronda1', '#ronda2', '#ronda3'].forEach(sel => {
    $(sel).addEventListener('input', salvar);
  });

  // Click nas Abas
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => ativarTab(btn.dataset.tab));
  });

  // Eventos: Adicionar Atividade
  $('#btnAddAtividade').addEventListener('click', () => {
    const num = normalizaNumero($('#inputChamadoAtividade').value);
    const txt = $('#inputAtividade').value.trim();
    if (!txt) return feedback('Descreva a atividade.'), $('#inputAtividade').focus();
    if (!num) return feedback('Informe o chamado.'), $('#inputChamadoAtividade').focus();
    
    state.data.atividades.unshift(criarAtividade(num, txt));
    $('#inputChamadoAtividade').value = '';
    $('#inputAtividade').value = '';
    salvar(); renderAtividades(); $('#inputChamadoAtividade').focus();
  });

  // Eventos: Adicionar Chamado Pendente
  $('#btnAddChamado').addEventListener('click', () => {
    const num = normalizaNumero($('#inputChamadoNum').value);
    const txt = $('#inputChamadoDesc').value.trim();
    if (!txt) return feedback('Descreva a justificativa.'), $('#inputChamadoDesc').focus();
    if (!num) return feedback('Informe o chamado.'), $('#inputChamadoNum').focus();
    
    state.data.chamados.unshift(criarAtividade(num, txt));
    $('#inputChamadoNum').value = '';
    $('#inputChamadoDesc').value = '';
    salvar(); renderChamados(); $('#inputChamadoNum').focus();
  });

  // Eventos: Adicionar Informações Extras
  $('#btnAddInfo').addEventListener('click', () => {
    const txt = $('#inputInfo').value.trim();
    if (!txt) return feedback('Informe o detalhe.');
    
    state.data.infos.unshift(criarItem(txt));
    $('#inputInfo').value = '';
    salvar(); renderInfos(); $('#inputInfo').focus();
  });

  // Eventos de teclado (Enter nos inputs) para UX rápida
  const atrelarEnter = (inputId, btnId, proximoInputId = null) => {
    $(inputId).addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        proximoInputId ? $(proximoInputId).focus() : $(btnId).click();
      }
    });
  };

  atrelarEnter('#inputChamadoAtividade', null, '#inputAtividade');
  atrelarEnter('#inputAtividade', '#btnAddAtividade');
  atrelarEnter('#inputChamadoNum', null, '#inputChamadoDesc');
  atrelarEnter('#inputChamadoDesc', '#btnAddChamado');
  atrelarEnter('#inputInfo', '#btnAddInfo');

  // Gerenciamento de Relatório e Exportação
  $('#btnGerar').addEventListener('click', () => { gerarRelatorio(); feedback('Relatório atualizado.'); });
  $('#btnCopiar').addEventListener('click', copiarRelatorio);
  $('#btnExportarJSON').addEventListener('click', exportJSON);
  $('#btnExportarTXT').addEventListener('click', exportTXT);

  // Importação JSON
  $('#inputImportar').addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        if (obj && typeof obj === 'object') {
          state.data = normalizarData(Object.assign({ dataPlantao: $('#dataPlantao').value, rondas: {r1:'',r2:'',r3:''}, atividades: [], chamados: [], infos: [] }, obj));
          salvar(); carregar(); feedback('Importação concluída!');
        }
      } catch(err) { feedback('Arquivo JSON inválido.'); }
    };
    reader.readAsText(file);
    e.target.value = ''; // reseta input de arquivo
  });

  // Limpar dados e trocar data
  $('#btnLimpar').addEventListener('click', () => {
    if (confirm('Atenção: limpar todos os dados da data selecionada?')) {
      try { localStorage.removeItem(state.chave); } catch(e){}
      resetarData(); feedback('Dados removidos.');
    }
  });

  $('#btnNovaData').addEventListener('click', () => { carregar(); feedback('Data carregada.'); });
  $('#dataPlantao').addEventListener('change', () => { carregar(); feedback('Visualizando nova data.'); });

  // Atalhos de teclado globais
  window.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault(); ativarTab('relatorio'); gerarRelatorio(); feedback('Relatório (Ctrl+B).');
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault(); salvar(); feedback('Salvo manualmente.');
    }
  });
});