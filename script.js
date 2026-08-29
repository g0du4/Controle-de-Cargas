
        // ==========================================
        // SISTEMA DE NAVEGAÇÃO
        // ==========================================
        function switchApp(appId) {
            const freteApp = document.getElementById('app-frete');
            const matrizApp = document.getElementById('app-matriz');
            const conferenciaApp = document.getElementById('app-conferencia');

            // Reseta todos antes de aplicar o estado do app selecionado
            freteApp.style.display = 'none';
            matrizApp.style.display = 'none';
            conferenciaApp.style.display = 'none';
            document.body.classList.remove('bg-gray-100');
            document.body.style.backgroundColor = '';

            if (appId === 'frete') {
                freteApp.style.display = 'block';
                document.body.classList.add('bg-gray-100'); 
            } else if (appId === 'matriz') {
                matrizApp.style.display = 'flex'; 
                document.body.style.backgroundColor = 'var(--matriz-bg)';
            } else if (appId === 'conferencia') {
                conferenciaApp.style.display = 'block';
                document.body.style.backgroundColor = '#EAF1E9';
            }
        }

        // ==========================================
        // DADOS E PERSISTÊNCIA (INTEGRADA)
        // ==========================================
        const defaultFreteCities = [
            { name: "Janaúba", p28: 15960, p24: 14490 }, { name: "Jaíba", p28: 17010, p24: 15435 },
            { name: "Delfinópolis", p28: 11340, p24: 10395 }, { name: "Araçuaí", p28: 15540, p24: 13965 },
            { name: "Pirapora", p28: 12600, p24: 11445 }, { name: "Lassance", p28: 11445, p24: 10395 }
        ];

        let freteCities = JSON.parse(localStorage.getItem('frete_cities')) || defaultFreteCities;
        let freteNotes  = JSON.parse(localStorage.getItem('frete_notes')) || [];
        let matrizColunasExtra = {}; 

        function saveFreteStorage() { localStorage.setItem('frete_cities', JSON.stringify(freteCities)); }
        function saveFreteNotesStorage() { localStorage.setItem('frete_notes', JSON.stringify(freteNotes)); }

        // ==========================================
        // APP 1: FRETE LÓGICA E RENDERIZAÇÃO
        // ==========================================
        function initFrete() { renderAdminTable(); calculateFrete(); }

        function renderAdminTable() {
            const tbody = document.getElementById('adminCitiesTableBody'); tbody.innerHTML = '';
            freteCities.forEach((city, index) => {
                tbody.innerHTML += `<tr><td class="p-2 font-medium text-gray-900">${city.name}</td><td class="p-2">${city.p28}</td><td class="p-2">${city.p24}</td><td class="p-2 text-center"><button onclick="deleteCity(${index})" class="text-red-600 hover:text-red-800 font-medium">Excluir</button></td></tr>`;
            });
        }

        function addNewCity() {
            const name = document.getElementById('newCityName').value.trim();
            const p28 = parseFloat(document.getElementById('newCityP28').value);
            const p24 = parseFloat(document.getElementById('newCityP24').value);
            if (!name || isNaN(p28) || isNaN(p24)) return alert("Preencha corretamente.");
            if (freteCities.some(c => c.name.toLowerCase() === name.toLowerCase())) return alert("Município já cadastrado!");
            freteCities.push({ name, p28, p24 }); saveFreteStorage();
            document.getElementById('newCityName').value = ''; document.getElementById('newCityP28').value = ''; document.getElementById('newCityP24').value = '';
            renderAdminTable(); calculateFrete();
        }

        function deleteCity(index) {
            if (confirm(`Excluir município "${freteCities[index].name}"?`)) { freteCities.splice(index, 1); saveFreteStorage(); renderAdminTable(); calculateFrete(); }
        }

        // Atualiza campos in-line do Frete e sincroniza de volta pra Matriz se for vinculado
        function updateNoteField(index, field, value) {
            if (field === 'weight') freteNotes[index][field] = Math.max(0, parseFloat(value) || 0);
            else freteNotes[index][field] = value;
            
            const colId = freteNotes[index].colId;
            if (colId && matrizColunasExtra[colId]) {
                if (field === 'place') matrizColunasExtra[colId].nome = value;
                if (field === 'number') matrizColunasExtra[colId].nf = value;
                if (field === 'weight') matrizColunasExtra[colId].kg = value;
                saveMatrizState();
            }

            saveFreteNotesStorage(); calculateFrete();
        }

        // Inserção com TODOS os campos opcionais
        function addInlineFreteNote() {
            const number = document.getElementById('inlineNumber').value.trim();
            const city = document.getElementById('inlineCity').value || '';
            const place = document.getElementById('inlinePlace').value.trim();
            const weight = parseFloat(document.getElementById('inlineWeight').value) || 0;

            freteNotes.push({ colId: null, city, number, place, weight });
            saveFreteNotesStorage(); calculateFrete();
        }

        function removeFreteNote(index) {
            const note = freteNotes[index];
            if (note.colId && matrizColunasExtra[note.colId]) {
                matrizColunasExtra[note.colId].includeFrete = false;
                saveMatrizState();
            }
            freteNotes.splice(index, 1);
            saveFreteNotesStorage(); calculateFrete();
        }

        function calculateFrete() {
            const selectedCarretaType = document.querySelector('input[name="carretaType"]:checked').value;
            const totalWeight = freteNotes.reduce((sum, n) => sum + n.weight, 0);
            document.getElementById('totalWeightDisplay').innerText = totalWeight.toLocaleString('pt-BR') + ' KG';

            const tbody = document.getElementById('notesTableBody'); tbody.innerHTML = '';
            let totalDistributed = 0;

            freteNotes.forEach((note, index) => {
                const cityData = freteCities.find(c => c.name === note.city);
                let valorRateio = 0;
                if (cityData && totalWeight > 0) {
                    const freteReferencia = selectedCarretaType === 'p28' ? cityData.p28 : cityData.p24;
                    valorRateio = (note.weight / totalWeight) * freteReferencia;
                }
                totalDistributed += valorRateio;

                let cityOptions = '<option value="">Sem Destino...</option>';
                freteCities.forEach(city => {
                    const isSelected = city.name === note.city ? 'selected' : '';
                    cityOptions += `<option value="${city.name}" ${isSelected}>${city.name}</option>`;
                });

                tbody.innerHTML += `
                    <tr class="hover:bg-gray-50 border-b border-gray-100 ${note.colId ? 'bg-blue-50' : ''}">
                        <td class="p-2"><input type="text" value="${note.number}" onchange="updateNoteField(${index}, 'number', this.value)" class="w-full bg-transparent border border-transparent hover:border-gray-300 focus:bg-white focus:border-blue-500 rounded p-1 font-semibold text-gray-700 outline-none transition" placeholder="S/N"></td>
                        <td class="p-2"><select onchange="updateNoteField(${index}, 'city', this.value)" class="w-full bg-transparent border border-transparent hover:border-gray-300 focus:bg-white focus:border-blue-500 rounded p-1 font-medium text-blue-800 outline-none transition cursor-pointer">${cityOptions}</select></td>
                        <td class="p-2"><input type="text" value="${note.place}" onchange="updateNoteField(${index}, 'place', this.value)" class="w-full bg-transparent border border-transparent hover:border-gray-300 focus:bg-white focus:border-blue-500 rounded p-1 text-gray-600 outline-none transition" placeholder="Local/Nome"></td>
                        <td class="p-2"><input type="number" step="any" value="${note.weight}" onchange="updateNoteField(${index}, 'weight', this.value)" class="w-full bg-transparent border border-transparent hover:border-gray-300 focus:bg-white focus:border-blue-500 rounded p-1 text-gray-600 outline-none transition" placeholder="0"></td>
                        <td class="p-3 text-right font-bold text-green-700 whitespace-nowrap">${valorRateio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        <td class="p-3 text-center"><button onclick="removeFreteNote(${index})" class="text-red-500 hover:text-red-700 font-medium transition">Remover</button></td>
                    </tr>`;
            });

            let newCityOptions = '<option value="" disabled selected>Selecione o Destino...</option>';
            freteCities.forEach(city => { newCityOptions += `<option value="${city.name}">${city.name}</option>`; });

            tbody.innerHTML += `
                <tr class="bg-blue-50/40 border-t-2 border-blue-100">
                    <td class="p-2"><input type="text" id="inlineNumber" placeholder="Nº Nota" class="w-full bg-white border border-gray-300 rounded p-1.5 font-semibold outline-none"></td>
                    <td class="p-2"><select id="inlineCity" class="w-full bg-white border border-gray-300 rounded p-1.5 font-medium outline-none cursor-pointer">${newCityOptions}</select></td>
                    <td class="p-2"><input type="text" id="inlinePlace" placeholder="Cliente/Local" class="w-full bg-white border border-gray-300 rounded p-1.5 outline-none"></td>
                    <td class="p-2"><input type="number" id="inlineWeight" step="any" placeholder="Ex: 1500" class="w-full bg-white border border-gray-300 rounded p-1.5 outline-none"></td>
                    <td class="p-3 text-right text-gray-400 font-mono text-xs italic align-middle">-</td>
                    <td class="p-2 text-center align-middle"><button onclick="addInlineFreteNote()" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition whitespace-nowrap">+ Incluir</button></td>
                </tr>`;
            
            document.getElementById('totalDistributedDisplay').innerText = totalDistributed.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }


        // ==========================================
        // APP 2: MATRIZ LÓGICA & PERSISTÊNCIA
        // ==========================================
        const matrizAlturaMin = 40; 
        const matrizDegrau = 35;           
        let matrizColunaAlvo = null;

        function matrizInit() { loadMatrizState(); }

        // Salvar tudo da Matriz no LocalStorage
        function saveMatrizState() {
            const data = { colunas: [], linhas: [] };
            
            document.querySelectorAll('#linhaTitulos th[id]').forEach(th => {
                const id = th.id;
                const title = th.querySelector('.editable-text').value;
                const extra = matrizColunasExtra[id] || { nome: '', nf: '', kg: '', includeFrete: false, legendas: [] };
                data.colunas.push({ id, title, ...extra });
            });

            document.querySelectorAll('#corpoMatriz tr').forEach((tr, index) => {
                const rowId = tr.id || ('row_' + Date.now() + '_' + index); tr.id = rowId;
                const titulo = tr.querySelector('.row-title').innerText;
                const cells = {};
                tr.querySelectorAll('.check-cell .tri-check').forEach((check, colIndex) => {
                    cells[data.colunas[colIndex].id] = check.getAttribute('data-state');
                });
                data.linhas.push({ id: rowId, titulo, cells });
            });

            localStorage.setItem('matriz_data', JSON.stringify(data));
        }

        // Carregar Matriz do LocalStorage
        function loadMatrizState() {
            const saved = localStorage.getItem('matriz_data');
            const data = saved ? JSON.parse(saved) : null;
            
            document.querySelectorAll('#linhaTitulos th[id]').forEach(e => e.remove());
            document.getElementById('corpoMatriz').innerHTML = '';
            matrizColunasExtra = {};

            if (!data || (data.colunas.length === 0 && data.linhas.length === 0)) {
                matrizAdicionarLinhaCustom("Seguro"); matrizAdicionarLinhaCustom("Romaneio");
                matrizAdicionarLinhaCustom("Nota de caixa"); matrizAdicionarLinhaCustom("Boleto");
                matrizAdicionarColuna(); matrizAdicionarColuna(); matrizAdicionarColuna();
                return;
            }

            data.colunas.forEach((col, index) => {
                matrizColunasExtra[col.id] = { nome: col.nome, nf: col.nf, kg: col.kg, includeFrete: col.includeFrete, legendas: col.legendas || [] };
                renderHeaderColumn(col.id, col.title);
            });

            data.linhas.forEach(linha => {
                const tr = document.createElement('tr'); tr.id = linha.id;
                let html = `<td class="row-title" contenteditable="true" onblur="saveMatrizState()">${linha.titulo}</td>`;
                data.colunas.forEach(col => {
                    const state = linha.cells[col.id] || 'blank';
                    let char = state === 'green' ? '\u2713' : (state === 'red' ? '\u2715' : '');
                    let cls = state === 'green' ? 'cell-green' : (state === 'red' ? 'cell-red' : '');
                    html += `<td class="check-cell ${cls}"><span class="tri-check" data-state="${state}" onclick="matrizCiclarEstado(this)">${char}</span></td>`;
                });
                html += `<td style="text-align: center;"><button class="btn-delete" onclick="matrizDeletarLinha(this)">✕</button></td>`;
                tr.innerHTML = html;
                document.getElementById('corpoMatriz').appendChild(tr);
            });

            matrizRenderEscadinha(); configHoverEvents();
        }

        function matrizZerarTudo() {
            if (confirm("⚠️ TEM CERTEZA? Isso vai apagar todas as colunas, linhas da matriz e remover os itens vinculados ao Frete.")) {
                localStorage.removeItem('matriz_data');
                freteNotes = freteNotes.filter(n => !n.colId); 
                saveFreteNotesStorage(); calculateFrete();
                loadMatrizState(); // Recarrega vazio (padrão)
            }
        }

        function matrizCheckboxHTML() { return `<span class="tri-check" data-state="blank" onclick="matrizCiclarEstado(this)"></span>`; }

        function matrizRenderEscadinha() {
            const linhaTitulos = document.getElementById('linhaTitulos');
            const tabela = document.getElementById('matrizEscada');
            const totalColunasDados = linhaTitulos.cells.length - 2;
            if (totalColunasDados <= 0) return;

            const alturaMaxima = matrizAlturaMin + (totalColunasDados * matrizDegrau);
            tabela.style.marginTop = `${alturaMaxima + 20}px`;

            for (let i = 1; i <= totalColunasDados; i++) {
                const th = linhaTitulos.cells[i];
                const guia = th.querySelector('.line-guide');
                const branch = th.querySelector('.tree-branch');
                const calcAltura = matrizAlturaMin + ((totalColunasDados - i) * matrizDegrau);
                if(guia && branch){
                    guia.style.height = `${calcAltura}px`;
                    branch.style.top = `-${calcAltura}px`;
                }
            }
        }

        function renderHeaderColumn(idCol, title) {
            const linhaTitulos = document.getElementById('linhaTitulos');
            const numColuna = linhaTitulos.cells.length - 1;
            const novoTh = document.createElement('th'); novoTh.id = idCol;
            novoTh.innerHTML = `
                <div class="tree-branch">
                    <div class="line-guide" onclick="matrizAbrirModal('${idCol}')"></div>
                    <div class="title-container">
                        <input type="text" class="editable-text" value="${title || 'Carga ' + numColuna}" oninput="matrizAjustarInput(this); saveMatrizState()">
                        <span class="info-icon" onclick="matrizAbrirModal('${idCol}')">📝</span>
                    </div>
                </div>`;
            linhaTitulos.insertBefore(novoTh, linhaTitulos.cells[linhaTitulos.cells.length - 1]);
            setTimeout(() => matrizAjustarInput(novoTh.querySelector('.editable-text')), 10);
        }

        function matrizAdicionarColuna() {
            const idCol = 'col_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            matrizColunasExtra[idCol] = { nome: '', nf: '', kg: '', includeFrete: false, legendas: [] };
            renderHeaderColumn(idCol, '');

            document.querySelectorAll('#corpoMatriz tr').forEach(linha => {
                const novaCelula = document.createElement('td'); novaCelula.className = 'check-cell';
                novaCelula.innerHTML = matrizCheckboxHTML();
                linha.insertBefore(novaCelula, linha.cells[linha.cells.length - 1]);
            });
            matrizRenderEscadinha(); configHoverEvents(); saveMatrizState();
        }

        function matrizAjustarInput(input) { input.style.width = Math.max(70, (input.value.length * 8)) + "px"; }

        function matrizAbrirModal(idCol) {
            matrizColunaAlvo = idCol;
            const nomeColuna = document.getElementById(idCol).querySelector('.editable-text').value;
            document.getElementById('modalTitle').innerText = `Configurar - ${nomeColuna}`;
            
            const extra = matrizColunasExtra[idCol] || { nome: '', nf: '', kg: '', includeFrete: false, legendas: [] };
            
            document.getElementById('modalNome').value = extra.nome || '';
            document.getElementById('modalNF').value = extra.nf || '';
            document.getElementById('modalKG').value = extra.kg || '';
            document.getElementById('modalIncluirFrete').checked = extra.includeFrete || false;
            
            const lista = document.getElementById('listaLegendas'); lista.innerHTML = '';
            if(!extra.legendas || extra.legendas.length === 0) matrizAdicionarCampoLegenda("");
            else extra.legendas.forEach(txt => matrizAdicionarCampoLegenda(txt));

            document.getElementById('modalLegenda').classList.add('active');
        }

        function matrizAdicionarCampoLegenda(valor = "") {
            const lista = document.getElementById('listaLegendas');
            const item = document.createElement('div'); item.className = 'legend-item';
            item.innerHTML = `<textarea placeholder="Digite a legenda..." rows="2">${valor}</textarea><button class="btn-remove-legend" onclick="matrizRemoverCampoLegenda(this)">✕</button>`;
            lista.appendChild(item); lista.scrollTop = lista.scrollHeight;
        }

        function matrizRemoverCampoLegenda(btn) { btn.closest('.legend-item').remove(); }
        function matrizFecharModal() { document.getElementById('modalLegenda').classList.remove('active'); matrizColunaAlvo = null; }

        function matrizSalvarEFecharModal() {
            if (!matrizColunaAlvo) return;
            const textos = []; document.querySelectorAll('#listaLegendas textarea').forEach(tx => { if (tx.value.trim() !== "") textos.push(tx.value); });
            
            const nome = document.getElementById('modalNome').value.trim();
            const nf = document.getElementById('modalNF').value.trim();
            const kg = document.getElementById('modalKG').value;
            const includeFrete = document.getElementById('modalIncluirFrete').checked;
            
            matrizColunasExtra[matrizColunaAlvo] = { nome, nf, kg, includeFrete, legendas: textos };
           

        //Compara title aberto com objetos colunas e altera tanto do localstorage como no titulo
           var texto = document.getElementById('modalTitle').textContent;
            texto = texto.slice(13);
            const elementos = document.querySelectorAll('.title-container');
            const col = JSON.parse(localStorage.getItem('matriz_data')).colunas ;

            
            
             if (nome) {
                    elementos[col.findIndex(m => m.title === texto )].children[0].value = nome
                }        

            // INTEGRAÇÃO COM FRETE AUTOMÁTICA
            const existingIndex = freteNotes.findIndex(n => n.colId === matrizColunaAlvo);
            if (includeFrete) {
                if (existingIndex >= 0) {
                    freteNotes[existingIndex].number = nf; freteNotes[existingIndex].place = nome; freteNotes[existingIndex].weight = parseFloat(kg) || 0;
                } else {
                    freteNotes.push({ colId: matrizColunaAlvo, city: 'Janaúba', number: nf, place: nome, weight: parseFloat(kg) || 0 });
                }
            } else {
                if (existingIndex >= 0) freteNotes.splice(existingIndex, 1);
            }
            saveFreteNotesStorage(); calculateFrete();
            
            saveMatrizState(); matrizFecharModal();
        }

        function matrizAdicionarLinhaCustom(nome) {
            const totalCols = document.getElementById('linhaTitulos').cells.length - 2;
            const novaLinha = document.createElement('tr');
            let html = `<td class="row-title" contenteditable="true" onblur="saveMatrizState()">${nome}</td>`;
            for (let i = 0; i < totalCols; i++) html += `<td class="check-cell">${matrizCheckboxHTML()}</td>`;
            html += `<td style="text-align: center;"><button class="btn-delete" onclick="matrizDeletarLinha(this)">✕</button></td>`;
            novaLinha.innerHTML = html;
            document.getElementById('corpoMatriz').appendChild(novaLinha);
        }

        function matrizAdicionarLinha() { matrizAdicionarLinhaCustom("Nova Linha"); saveMatrizState(); configHoverEvents(); }

        function matrizCiclarEstado(el) {
            const td = el.closest('td'); const estado = el.getAttribute('data-state');
            if (estado === 'blank') { el.setAttribute('data-state', 'green'); el.textContent = '\u2713'; td.classList.remove('cell-red'); td.classList.add('cell-green'); } 
            else if (estado === 'green') { el.setAttribute('data-state', 'red'); el.textContent = '\u2715'; td.classList.remove('cell-green'); td.classList.add('cell-red'); } 
            else { el.setAttribute('data-state', 'blank'); el.textContent = ''; td.classList.remove('cell-green', 'cell-red'); }
            saveMatrizState();
        }

        function matrizDeletarLinha(btn) { btn.closest('tr').remove(); saveMatrizState(); }

        // Eventos de Hover otimizados
        function configHoverEvents() {
            const colunas = document.querySelectorAll('#linhaTitulos th[id]');
            colunas.forEach((coluna) => {
                // Remove the old listener logic effectively by replacing clone
                const clone = coluna.cloneNode(true);
                coluna.parentNode.replaceChild(clone, coluna);
                
                const lineGuide = clone.querySelector('.line-guide');
                const contain   = clone.querySelector('.title-container');
                
                if (lineGuide) {
                    const celulasDoCorpo = document.querySelectorAll(`#corpoMatriz td:nth-child(${clone.cellIndex + 1})`);
                    const elementosDaColuna = [clone, ...celulasDoCorpo];
                    
                    elementosDaColuna.forEach(el => {
                        el.addEventListener('mouseenter', () => {
                            lineGuide.style.borderTopColor = '#407dd9'; lineGuide.style.borderLeftColor = '#407dd9';
                            lineGuide.style.boxShadow = '-10px -9px 13px -7px rgba(0, 0, 0, 0.3), inset 7px 5px 14px -7px rgba(0, 0, 0, 0.3)';
                            lineGuide.style.setProperty('--matriz-line', '#407dd9');
                            contain.style.boxShadow = 'rgba(0, 85, 255, 0.3) 3px -3px 9px 2px';
                        });
                        el.addEventListener('mouseleave', () => {
                            lineGuide.style.borderTopColor = ''; lineGuide.style.borderLeftColor = '';
                            lineGuide.style.boxShadow = ''; lineGuide.style.setProperty('--matriz-line', '');
                            contain.style.boxShadow = '';
                        });
                    }); 
                }
            });
        }

        // ==========================================
        // INICIALIZADOR MESTRE DO ARQUIVO
        // ==========================================
        window.onload = function() {
            initFrete();
            matrizInit();
            switchApp('frete'); 
        };
   

        // =========================================
        //    APP 3: CONFERÊNCIA DE CARGA (isolado em IIFE)
        // ========================================= -->
    
(function () {
  'use strict';

  var STORAGE_KEY = 'conferencias-de-frutas-v2';
  var PRODUTOS = ['PRATA 1A', 'PRATA 2A', 'NANICA', 'PRATA ORG', 'NANICA ORG', 'MAÇÃ', 'MAÇÃ ORG', 'OUTRAS'];

  var state = {
    conferences: [],
    view: 'list',
    activeId: null,
    newFormOpen: false,
    newNotaFormOpen: false
  };
  var saveTimer = null;

  /* ---------- ícones (SVG inline) ---------- */
  var ICONS = {
    trash: '<svg viewBox="0 0 24 24" width="SZ" height="SZ" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>',
    plus: '<svg viewBox="0 0 24 24" width="SZ" height="SZ" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
    chevronleft: '<svg viewBox="0 0 24 24" width="SZ" height="SZ" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>',
    scale: '<svg viewBox="0 0 24 24" width="SZ" height="SZ" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"></path><path d="M5 7h14"></path><path d="M5 7l-3 7a3.5 3.5 0 0 0 7 0z"></path><path d="M19 7l-3 7a3.5 3.5 0 0 0 7 0z"></path><path d="M8 21h8"></path></svg>',
    check: '<svg viewBox="0 0 24 24" width="SZ" height="SZ" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    alert: '<svg viewBox="0 0 24 24" width="SZ" height="SZ" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    package: '<svg viewBox="0 0 24 24" width="SZ" height="SZ" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5z"></path><path d="M3 8v8l9 5 9-5V8"></path><path d="M12 13v8"></path></svg>',
    cloudoff: '<svg viewBox="0 0 24 24" width="SZ" height="SZ" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.61 16.95A5 5 0 0 0 18 10h-1.26a8 8 0 0 0-7.05-6"></path><path d="M5 5L2 2"></path><path d="M2 2l20 20"></path><path d="M4.11 5.11A7.001 7.001 0 0 0 4 19h13"></path></svg>',
    calc: '<svg viewBox="0 0 24 24" width="SZ" height="SZ" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="8" y1="10" x2="8" y2="10.01"></line><line x1="12" y1="10" x2="12" y2="10.01"></line><line x1="16" y1="10" x2="16" y2="14"></line><line x1="8" y1="14" x2="8" y2="14.01"></line><line x1="12" y1="14" x2="12" y2="14.01"></line><line x1="8" y1="18" x2="12" y2="18"></line><line x1="16" y1="18" x2="16" y2="18.01"></line></svg>'
  };
  function icon(name, size) {
    var s = String(size || 16);
    return (ICONS[name] || '').split('SZ').join(s);
  }

  /* ---------- helpers ---------- */
  function uid(prefix) { return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
  function escapeHtml(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function parseNum(v) {
    if (v === '' || v === null || v === undefined) return 0;
    var n = Number(String(v).trim().replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }
  function formatKg(n) {
    var v = Number(n) || 0;
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function formatDateBR(iso) {
    if (!iso) return '—';
    var parts = iso.split('-');
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  function computeTotals(conf) {
    var map = {};
    function ensure(key) {
      if (!map[key]) map[key] = { produto: key, totalNota: 0, totalConferencia: 0 };
      return map[key];
    }
    conf.notas.forEach(function (n) {
      n.itens.forEach(function (it) {
        ensure(it.produto || 'OUTRAS').totalNota += parseNum(it.qtdNota);
      });
    });
    conf.pesagens.forEach(function (p) {
      ensure(p.produto || 'OUTRAS').totalConferencia += parseNum(p.caixas) * parseNum(p.pesoCaixa);
    });
    var out = Object.keys(map).map(function (k) {
      var r = map[k];
      return { produto: r.produto, totalNota: r.totalNota, totalConferencia: r.totalConferencia, diff: r.totalConferencia - r.totalNota };
    });
    out.sort(function (a, b) { return a.produto.localeCompare(b.produto, 'pt-BR'); });
    return out;
  }
  function grandTotals(conf) {
    var totals = computeTotals(conf);
    var gn = 0, gc = 0;
    totals.forEach(function (t) { gn += t.totalNota; gc += t.totalConferencia; });
    return { nota: gn, conferencia: gc, diff: gc - gn };
  }
  function conferenceStatus(conf) {
    var totals = computeTotals(conf);
    if (totals.length === 0) return 'vazio';
    return totals.some(function (t) { return Math.abs(t.diff) > 0.001; }) ? 'diverge' : 'ok';
  }
  /* ---------- calculadora mini ---------- */
  var calcState = { display: '0', stored: null, operator: null, justCalculated: false, targetEl: null };

  function calcButtonsHTML() {
    return '' +
      '<div class="fcf-calc-display" id="calc-display">0</div>' +
      '<div class="fcf-calc-grid">' +
      '<button type="button" class="fcf-calc-key fcf-calc-op" data-calc="C">C</button>' +
      '<button type="button" class="fcf-calc-key fcf-calc-op" data-calc="back">⌫</button>' +
      '<button type="button" class="fcf-calc-key fcf-calc-op" data-calc="%">%</button>' +
      '<button type="button" class="fcf-calc-key fcf-calc-op" data-calc="/">÷</button>' +
      '<button type="button" class="fcf-calc-key" data-calc="7">7</button>' +
      '<button type="button" class="fcf-calc-key" data-calc="8">8</button>' +
      '<button type="button" class="fcf-calc-key" data-calc="9">9</button>' +
      '<button type="button" class="fcf-calc-key fcf-calc-op" data-calc="*">×</button>' +
      '<button type="button" class="fcf-calc-key" data-calc="4">4</button>' +
      '<button type="button" class="fcf-calc-key" data-calc="5">5</button>' +
      '<button type="button" class="fcf-calc-key" data-calc="6">6</button>' +
      '<button type="button" class="fcf-calc-key fcf-calc-op" data-calc="-">−</button>' +
      '<button type="button" class="fcf-calc-key" data-calc="1">1</button>' +
      '<button type="button" class="fcf-calc-key" data-calc="2">2</button>' +
      '<button type="button" class="fcf-calc-key" data-calc="3">3</button>' +
      '<button type="button" class="fcf-calc-key fcf-calc-op" data-calc="+">+</button>' +
      '<button type="button" class="fcf-calc-key" data-calc="0" style="grid-column:span 2;">0</button>' +
      '<button type="button" class="fcf-calc-key" data-calc=".">.</button>' +
      '<button type="button" class="fcf-calc-key fcf-calc-op fcf-calc-eq" data-calc="=">=</button>' +
      '</div>' +
      '<button type="button" class="fcf-btn fcf-btn-primary fcf-calc-use" id="calc-use">Usar valor</button>';
  }
  function calcUpdateDisplay() {
    var d = document.getElementById('calc-display');
    if (d) d.textContent = calcState.display;
  }
  function calcReset() {
    calcState.display = '0'; calcState.stored = null; calcState.operator = null; calcState.justCalculated = false;
  }
  function calcInputDigit(d) {
    if (calcState.justCalculated) { calcState.display = '0'; calcState.justCalculated = false; }
    calcState.display = (calcState.display === '0') ? d : calcState.display + d;
  }
  function calcInputDot() {
    if (calcState.justCalculated) { calcState.display = '0'; calcState.justCalculated = false; }
    if (calcState.display.indexOf('.') === -1) calcState.display += '.';
  }
  function calcBackspace() {
    calcState.display = calcState.display.length <= 1 ? '0' : calcState.display.slice(0, -1);
  }
  function calcPercent() {
    calcState.display = calcFormatResult((parseFloat(calcState.display) || 0) / 100);
  }
  function calcCompute(a, b, op) {
    if (op === '+') return a + b;
    if (op === '-') return a - b;
    if (op === '*') return a * b;
    if (op === '/') return b === 0 ? 0 : a / b;
    return b;
  }
  function calcFormatResult(n) {
    return String(Math.round(n * 1e6) / 1e6);
  }
  function calcApplyOperator(op) {
    var current = parseFloat(calcState.display) || 0;
    if (calcState.stored === null) {
      calcState.stored = current;
    } else if (!calcState.justCalculated) {
      calcState.stored = calcCompute(calcState.stored, current, calcState.operator);
      calcState.display = calcFormatResult(calcState.stored);
    }
    calcState.operator = op;
    calcState.justCalculated = false;
    calcState.display = '0';
  }
  function calcEquals() {
    if (calcState.operator === null || calcState.stored === null) return;
    var current = parseFloat(calcState.display) || 0;
    calcState.display = calcFormatResult(calcCompute(calcState.stored, current, calcState.operator));
    calcState.stored = null; calcState.operator = null; calcState.justCalculated = true;
  }
  function openCalc(triggerEl, targetInput) {
    var pop = document.getElementById('calc-popover');
    calcReset();
    calcState.targetEl = targetInput;
    var startVal = targetInput.value;
    if (startVal !== '' && !isNaN(parseNum(startVal))) calcState.display = String(parseNum(startVal));
    pop.innerHTML = calcButtonsHTML();
    calcUpdateDisplay();
    pop.classList.remove('fcf-hidden');
    positionCalc(pop, triggerEl);
  }
  function closeCalc() {
    var pop = document.getElementById('calc-popover');
    pop.classList.add('fcf-hidden');
    pop.innerHTML = '';
    calcState.targetEl = null;
  }
  function positionCalc(pop, triggerEl) {
    var rect = triggerEl.getBoundingClientRect();
    var popW = 196, popH = 300;
    var left = rect.left, top = rect.bottom + 6;
    if (left + popW > window.innerWidth - 8) left = window.innerWidth - popW - 8;
    if (left < 8) left = 8;
    if (top + popH > window.innerHeight - 8) top = rect.top - popH - 6;
    if (top < 8) top = 8;
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }
  function onCalcClick(e) {
    e.stopPropagation();
    var btn = e.target.closest('[data-calc]');
    if (btn) {
      var key = btn.getAttribute('data-calc');
      if (key === 'C') calcReset();
      else if (key === 'back') calcBackspace();
      else if (key === '%') calcPercent();
      else if (key === '=') calcEquals();
      else if (key === '+' || key === '-' || key === '*' || key === '/') calcApplyOperator(key);
      else if (key === '.') calcInputDot();
      else calcInputDigit(key);
      calcUpdateDisplay();
      return;
    }
    if (e.target.id === 'calc-use' || e.target.closest('#calc-use')) {
      if (calcState.targetEl) {
        calcState.targetEl.value = calcState.display;
        calcState.targetEl.dispatchEvent(new Event('input', { bubbles: true }));
        calcState.targetEl.focus();
      }
      closeCalc();
    }
  }

  function getActiveConf() { return state.conferences.find(function (c) { return c.id === state.activeId; }); }
  function getNota(conf, notaId) { return conf.notas.find(function (n) { return n.id === notaId; }); }
  function getItem(nota, itemId) { return nota.itens.find(function (it) { return it.id === itemId; }); }
  function getPesagem(conf, pesId) { return conf.pesagens.find(function (p) { return p.id === pesId; }); }

  /* ---------- persistência (localStorage do navegador) ---------- */
  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      state.conferences = (parsed || []).map(function (c) {
        return {
          id: c.id, nome: c.nome, data: c.data,
          notas: (c.notas || []).map(function (n) {
            return { id: n.id, numero: n.numero, data: n.data, itens: (n.itens || []) };
          }),
          pesagens: c.pesagens || []
        };
      });
    } catch (e) { /* nenhum dado salvo ainda ou dado inválido */ }
  }
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.conferences));
      setIndicator('saved');
    } catch (e) {
      setIndicator('error');
    }
  }
  function scheduleSave() {
    setIndicator('saving');
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveState, 450);
  }
  function setIndicator(status) {
    var el = document.getElementById('save-indicator');
    if (!el) return;
    if (status === 'saving') { el.className = 'fcf-save-state'; el.innerHTML = 'Salvando…'; }
    else if (status === 'error') { el.className = 'fcf-save-state error'; el.innerHTML = icon('cloudoff', 13) + ' Falha ao salvar'; }
    else { el.className = 'fcf-save-state'; el.innerHTML = 'Salvo'; }
  }

  /* ---------- pequenas peças de render ---------- */
  function diffLabelHTML(diff) {
    if (Math.abs(diff) < 0.001) return '<span class="fcf-diff-label fcf-diff-ok">OK</span>';
    if (diff < 0) return '<span class="fcf-diff-label fcf-diff-falta">FALTA ' + formatKg(Math.abs(diff)) + ' kg</span>';
    return '<span class="fcf-diff-label fcf-diff-sobra">SOBRA ' + formatKg(diff) + ' kg</span>';
  }
  function balanceHTML(diff, base) {
    var denom = Math.max(Math.abs(base), 1);
    var ratio = Math.max(-1, Math.min(1, diff / denom));
    var offset = ratio * 34;
    var color = 'var(--accent)';
    if (diff < -0.001) color = 'var(--danger)';
    else if (diff > 0.001) color = 'var(--amber)';
    return '<div class="fcf-balance-track"><div class="fcf-balance-mid"></div>' +
      '<div class="fcf-balance-marker" style="left:calc(50% + ' + offset + 'px);background:' + color + ';"></div></div>';
  }
  function chipHTML(status) {
    if (status === 'ok') return '<span class="fcf-chip fcf-chip-ok">' + icon('check', 12) + ' Confere</span>';
    if (status === 'diverge') return '<span class="fcf-chip fcf-chip-diverge">' + icon('alert', 12) + ' Divergência</span>';
    return '<span class="fcf-chip fcf-chip-vazio">Sem itens</span>';
  }
  function produtoOptionsHTML() {
    var options = '';
    for (var i = 0; i < PRODUTOS.length; i++) options += '<option value="' + PRODUTOS[i] + '">' + PRODUTOS[i] + '</option>';
    return options;
  }

  /* ---------- painel geral ---------- */
  function renderListHTML() {
    var confs = state.conferences;
    var count = confs.length;
    var html = '<div class="fcf-main">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">';
    html += '<div><div style="font-family:\'Fraunces\',serif;font-size:20px;font-weight:600;">Painel geral</div>';
    html += '<div style="font-size:13px;color:var(--ink-soft);margin-top:2px;">' + count + (count === 1 ? ' conferência registrada' : ' conferências registradas') + '</div></div>';
    if (!state.newFormOpen) {
      html += '<button class="fcf-btn fcf-btn-primary" data-action="show-new-conf-form">' + icon('plus', 15) + ' Nova conferência</button>';
    }
    html += '</div>';

    if (state.newFormOpen) {
      html += '<div class="fcf-new-form">';
      html += '<input class="fcf-input" id="new-conf-name" placeholder="Conferência ' + String(count + 1).padStart(2, '0') + '">';
      html += '<button class="fcf-btn fcf-btn-primary" data-action="create-conference">Criar</button>';
      html += '<button class="fcf-btn fcf-btn-ghost" data-action="cancel-new-conf">Cancelar</button>';
      html += '</div>';
    }

    if (count === 0) {
      html += '<div class="fcf-empty">' + icon('package', 30) + '<h3>Nenhuma conferência ainda</h3><div>Crie a primeira para começar a lançar as notas.</div></div>';
    } else {
      html += '<div class="fcf-grid">';
      var list = confs.slice().reverse();
      for (var i = 0; i < list.length; i++) html += renderConfCardHTML(list[i]);
      html += '</div>';
      html += '<div style="margin-top:36px;text-align:center;"><button class="fcf-btn fcf-btn-ghost fcf-btn-sm" data-action="clear-all" style="color:var(--ink-faint);">Apagar todos os dados</button></div>';
    }
    html += '</div>';
    return html;
  }
  function renderConfCardHTML(c) {
    var status = conferenceStatus(c);
    return '<div class="fcf-conf-card" data-action="open-conference" data-id="' + c.id + '">' +
      '<button class="fcf-icon-btn" data-action="delete-conference" data-id="' + c.id + '" aria-label="Excluir conferência">' + icon('trash', 14) + '</button>' +
      '<div class="fcf-conf-name">' + escapeHtml(c.nome) + '</div>' +
      '<div class="fcf-conf-date">' + formatDateBR(c.data) + '</div>' +
      '<div class="fcf-conf-meta"><span class="fcf-notas-count">' + c.notas.length + (c.notas.length === 1 ? ' nota' : ' notas') + ' · ' + c.pesagens.length + (c.pesagens.length === 1 ? ' pesagem' : ' pesagens') + '</span>' + chipHTML(status) + '</div>' +
      '</div>';
  }

  /* ---------- detalhe da conferência ---------- */
  function renderDetailHTML() {
    var conf = getActiveConf();
    if (!conf) { state.view = 'list'; return renderListHTML(); }
    var html = '<div class="fcf-main">';
    html += '<button class="fcf-back" data-action="back">' + icon('chevronleft', 16) + ' Painel geral</button>';
    html += '<div class="fcf-detail-header">';
    html += '<div style="flex:1;min-width:240px;">';
    html += '<input class="fcf-name-input" data-field="conf-nome" value="' + escapeHtml(conf.nome) + '">';
    html += '<div style="margin-top:4px;"><input class="fcf-date-input" type="date" data-field="conf-data" value="' + escapeHtml(conf.data) + '"></div>';
    html += '</div>';
    html += '<button class="fcf-btn fcf-btn-danger fcf-btn-sm" data-action="delete-conference" data-id="' + conf.id + '">' + icon('trash', 13) + ' Excluir conferência</button>';
    html += '</div>';

    html += '<div class="fcf-section-title">' + icon('scale', 14) + ' Totais da conferência</div>';
    html += '<div id="totals-section">' + renderTotalsSectionHTML(conf) + '</div>';

    html += '<div class="fcf-two-col">';
    html += '<div>';
    html += '<div class="fcf-section-title">Notas (' + conf.notas.length + ')</div>';
    html += '<div id="add-nota-area">' + renderAddNotaFormHTML(conf) + '</div>';
    html += '<div id="notas-list" style="margin-top:14px;">' + renderNotasListHTML(conf) + '</div>';
    html += '</div>';
    html += '<div>';
    html += '<div class="fcf-section-title">Conferência (pesagens)</div>';
    html += '<div id="pesagens-area">' + renderPesagensSectionHTML(conf) + '</div>';
    html += '</div>';
    html += '</div>';

    html += '</div>';
    return html;
  }

  function renderResumoHTML(g) {
    var diffClass = Math.abs(g.diff) < 0.001 ? 'fcf-diff-ok' : (g.diff < 0 ? 'fcf-diff-falta' : 'fcf-diff-sobra');
    var diffText = (g.diff > 0.001 ? '+' : '') + formatKg(g.diff) + ' kg';
    return '<div class="fcf-resumo">' +
      '<div class="fcf-resumo-item"><div class="fcf-resumo-label">Total nota</div><div class="fcf-resumo-value">' + formatKg(g.nota) + ' kg</div></div>' +
      '<div class="fcf-resumo-item"><div class="fcf-resumo-label">Total conferência</div><div class="fcf-resumo-value">' + formatKg(g.conferencia) + ' kg</div></div>' +
      '<div class="fcf-resumo-item"><div class="fcf-resumo-label">Diferença geral</div><div class="fcf-resumo-value ' + diffClass + '">' + diffText + '</div></div>' +
      '</div>';
  }
  function renderTotalsSectionHTML(conf) {
    var totals = computeTotals(conf);
    var g = grandTotals(conf);
    var html = renderResumoHTML(g);
    if (totals.length === 0) {
      html += '<div class="fcf-empty-notas" style="margin-top:12px;">Adicione notas e pesagens para ver os totais por produto.</div>';
    } else {
      html += '<div class="fcf-table-wrap" style="margin-top:14px;"><table class="fcf-table"><thead><tr>' +
        '<th>Produto</th><th class="num">Nota (kg)</th><th class="num">Conferência (kg)</th><th class="num">Diferença</th><th>Balanço</th>' +
        '</tr></thead><tbody>';
      for (var i = 0; i < totals.length; i++) {
        var t = totals[i];
        html += '<tr><td>' + escapeHtml(t.produto) + '</td>' +
          '<td class="mono">' + formatKg(t.totalNota) + '</td>' +
          '<td class="mono">' + formatKg(t.totalConferencia) + '</td>' +
          '<td class="mono">' + diffLabelHTML(t.diff) + '</td>' +
          '<td>' + balanceHTML(t.diff, t.totalNota) + '</td></tr>';
      }
      html += '</tbody></table></div>';
    }
    return html;
  }

  /* ---------- notas (produto + peso declarado) ---------- */
  function renderAddNotaFormHTML(conf) {
    if (!state.newNotaFormOpen) {
      return '<button class="fcf-btn fcf-btn-ghost" data-action="show-new-nota-form">' + icon('plus', 14) + ' Nova nota</button>';
    }
    var placeholder = 'Nota ' + String(conf.notas.length + 1).padStart(2, '0');
    return '<div class="fcf-new-form">' +
      '<input class="fcf-input" id="new-nota-numero" placeholder="' + placeholder + '">' +
      '<button class="fcf-btn fcf-btn-primary" data-action="create-nota">Adicionar</button>' +
      '<button class="fcf-btn fcf-btn-ghost" data-action="cancel-new-nota">Cancelar</button>' +
      '</div>';
  }
  function renderNotasListHTML(conf) {
    if (conf.notas.length === 0) return '<div class="fcf-empty-notas">Nenhuma nota lançada ainda nesta conferência.</div>';
    var list = conf.notas.slice().reverse();
    var html = '';
    for (var i = 0; i < list.length; i++) html += '<div class="fcf-nota-card" id="nota-card-' + list[i].id + '">' + renderNotaCardInnerHTML(list[i]) + '</div>';
    return html;
  }
  function renderNotaCardInnerHTML(nota) {
    var html = '<div class="fcf-nota-header">';
    html += '<input class="fcf-input" style="font-weight:600;max-width:200px;" data-field="nota-numero" data-nota-id="' + nota.id + '" value="' + escapeHtml(nota.numero) + '">';
    html += '<input class="fcf-input fcf-input-mono" type="date" data-field="nota-data" data-nota-id="' + nota.id + '" value="' + escapeHtml(nota.data) + '">';
    html += '<button class="fcf-icon-btn" style="margin-left:auto;" data-action="delete-nota" data-nota-id="' + nota.id + '" aria-label="Excluir nota">' + icon('trash', 14) + '</button>';
    html += '</div><div class="fcf-nota-body">';
    if (nota.itens.length > 0) {
      html += '<div class="fcf-table-wrap" style="margin-bottom:12px;"><table class="fcf-table"><thead><tr>' +
        '<th>Produto</th><th class="num">Qtd (kg)</th><th></th>' +
        '</tr></thead><tbody>';
      for (var i = 0; i < nota.itens.length; i++) html += renderItemRowHTML(nota.id, nota.itens[i]);
      html += '</tbody></table></div>';
    }
    html += renderAddItemFormHTML(nota.id);
    html += '</div>';
    return html;
  }
  function renderItemRowHTML(notaId, item) {
    return '<tr>' +
      '<td>' + escapeHtml(item.produto) + '</td>' +
      '<td class="mono"><span class="fcf-qty-wrap"><input class="fcf-input fcf-input-mono fcf-qty-input" data-field="item-qtd" data-nota-id="' + notaId + '" data-item-id="' + item.id + '" value="' + escapeHtml(item.qtdNota) + '">' +
      '<button type="button" class="fcf-calc-trigger" data-action="open-calc" title="Calculadora">' + icon('calc', 12) + '</button></span></td>' +
      '<td><button class="fcf-icon-btn" data-action="delete-item" data-nota-id="' + notaId + '" data-item-id="' + item.id + '" aria-label="Remover item">' + icon('trash', 13) + '</button></td>' +
      '</tr>';
  }
  function renderAddItemFormHTML(notaId) {
    return '<div class="fcf-add-row" data-add-item-row data-nota-id="' + notaId + '">' +
      '<select class="fcf-input" data-role="add-item-produto" data-nota-id="' + notaId + '">' + produtoOptionsHTML() + '</select>' +
      '<input class="fcf-input fcf-hidden" data-role="add-item-custom" data-nota-id="' + notaId + '" placeholder="Nome do produto">' +
      '<span class="fcf-qty-wrap"><input class="fcf-input fcf-input-mono fcf-qty-input" data-role="add-item-qtd" data-nota-id="' + notaId + '" placeholder="Qtd (kg)" inputmode="decimal">' +
      '<button type="button" class="fcf-calc-trigger" data-action="open-calc" title="Calculadora">' + icon('calc', 12) + '</button></span>' +
      '<button class="fcf-btn fcf-btn-primary fcf-btn-sm" data-action="add-item" data-nota-id="' + notaId + '">' + icon('plus', 14) + ' Adicionar</button>' +
      '</div>';
  }

  /* ---------- pesagens (caixas x peso da caixa) ---------- */
  function renderPesagensSectionHTML(conf) {
    var html = '';
    if (conf.pesagens.length > 0) {
      html += '<div class="fcf-table-wrap" style="margin-bottom:12px;"><table class="fcf-table"><thead><tr>' +
        '<th>Produto</th><th class="num">Caixas</th><th class="num">Peso cx (kg)</th><th class="num">Total (kg)</th><th></th>' +
        '</tr></thead><tbody>';
      var list = conf.pesagens.slice().reverse();
      for (var i = 0; i < list.length; i++) html += renderPesagemRowHTML(list[i]);
      html += '</tbody></table></div>';
    }
    html += renderAddPesagemFormHTML();
    return html;
  }
  function renderPesagemRowHTML(p) {
    var total = parseNum(p.caixas) * parseNum(p.pesoCaixa);
    return '<tr>' +
      '<td>' + escapeHtml(p.produto) + '</td>' +
      '<td class="mono"><input class="fcf-input fcf-input-mono fcf-qty-input" data-field="pes-caixas" data-pesagem-id="' + p.id + '" value="' + escapeHtml(p.caixas) + '"></td>' +
      '<td class="mono"><input class="fcf-input fcf-input-mono fcf-qty-input" data-field="pes-peso" data-pesagem-id="' + p.id + '" value="' + escapeHtml(p.pesoCaixa) + '"></td>' +
      '<td class="mono total-cell">' + formatKg(total) + '</td>' +
      '<td><button class="fcf-icon-btn" data-action="delete-pesagem" data-pesagem-id="' + p.id + '" aria-label="Remover pesagem">' + icon('trash', 13) + '</button></td>' +
      '</tr>';
  }
  function renderAddPesagemFormHTML() {
    return '<div class="fcf-add-row" data-add-pesagem-row>' +
      '<select class="fcf-input" data-role="pesagem-produto">' + produtoOptionsHTML() + '</select>' +
      '<input class="fcf-input fcf-hidden" data-role="pesagem-custom" placeholder="Nome do produto">' +
      '<input class="fcf-input fcf-input-mono fcf-qty-input" data-role="pesagem-caixas" placeholder="Caixas" inputmode="decimal">' +
      '<input class="fcf-input fcf-input-mono fcf-qty-input" data-role="pesagem-peso" placeholder="Peso cx (kg)" inputmode="decimal">' +
      '<button class="fcf-btn fcf-btn-primary fcf-btn-sm" data-action="add-pesagem">' + icon('plus', 14) + ' Adicionar</button>' +
      '</div>';
  }

  /* ---------- render principal ---------- */
  function render() {
    var app = document.getElementById('app');
    var mainHtml = state.view === 'list' ? renderListHTML() : renderDetailHTML();
    app.innerHTML =
      '<div class="fcf-topbar">' +
      '<div class="fcf-brand"><div class="fcf-brand-mark">' + icon('scale', 18) + '</div>' +
      '<div><div class="fcf-title">Conferência de Carga</div><div class="fcf-subtitle">Nota × conferência, produto por produto</div></div></div>' +
      '<div class="fcf-save-state" id="save-indicator">Salvo</div>' +
      '</div>' + mainHtml +
      '<div class="fcf-footnote">Os dados ficam salvos neste navegador, neste computador — não são enviados a nenhum servidor.</div>';
  }

  /* ---------- eventos ---------- */
  function onClick(e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var action = el.getAttribute('data-action');

    if (action === 'open-conference') {
      state.activeId = el.getAttribute('data-id');
      state.view = 'detail';
      state.newNotaFormOpen = false;
      render();
    } else if (action === 'delete-conference') {
      e.stopPropagation();
      var id = el.getAttribute('data-id');
      if (!confirm('Excluir esta conferência e todos os dados dela? Essa ação não pode ser desfeita.')) return;
      state.conferences = state.conferences.filter(function (c) { return c.id !== id; });
      if (state.activeId === id) { state.view = 'list'; state.activeId = null; }
      saveState(); render();
    } else if (action === 'show-new-conf-form') {
      state.newFormOpen = true; render();
      var inp = document.getElementById('new-conf-name'); if (inp) inp.focus();
    } else if (action === 'cancel-new-conf') {
      state.newFormOpen = false; render();
    } else if (action === 'create-conference') {
      var nameInput = document.getElementById('new-conf-name');
      var name = nameInput ? nameInput.value.trim() : '';
      var nome = name || ('Conferência ' + String(state.conferences.length + 1).padStart(2, '0'));
      state.conferences.push({ id: uid('conf'), nome: nome, data: todayISO(), notas: [], pesagens: [] });
      state.newFormOpen = false;
      saveState(); render();
    } else if (action === 'clear-all') {
      if (!confirm('Apagar TODOS os dados de todas as conferências? Essa ação não pode ser desfeita.')) return;
      state.conferences = [];
      saveState(); render();
    } else if (action === 'back') {
      state.view = 'list'; state.activeId = null; state.newNotaFormOpen = false;
      render();
    } else if (action === 'show-new-nota-form') {
      state.newNotaFormOpen = true;
      var conf = getActiveConf();
      document.getElementById('add-nota-area').innerHTML = renderAddNotaFormHTML(conf);
      var ni = document.getElementById('new-nota-numero'); if (ni) ni.focus();
    } else if (action === 'cancel-new-nota') {
      state.newNotaFormOpen = false;
      var conf2 = getActiveConf();
      document.getElementById('add-nota-area').innerHTML = renderAddNotaFormHTML(conf2);
    } else if (action === 'create-nota') {
      var conf3 = getActiveConf();
      var numInput = document.getElementById('new-nota-numero');
      var numero = numInput ? numInput.value.trim() : '';
      var notaCount = conf3.notas.length + 1;
      conf3.notas.push({ id: uid('nota'), numero: numero || ('Nota ' + String(notaCount).padStart(2, '0')), data: todayISO(), itens: [] });
      state.newNotaFormOpen = false;
      saveState();
      document.getElementById('add-nota-area').innerHTML = renderAddNotaFormHTML(conf3);
      document.getElementById('notas-list').innerHTML = renderNotasListHTML(conf3);
      document.getElementById('totals-section').innerHTML = renderTotalsSectionHTML(conf3);
    } else if (action === 'delete-nota') {
      if (!confirm('Excluir esta nota e todos os itens dela?')) return;
      var confN = getActiveConf();
      var notaId = el.getAttribute('data-nota-id');
      confN.notas = confN.notas.filter(function (n) { return n.id !== notaId; });
      saveState();
      document.getElementById('notas-list').innerHTML = renderNotasListHTML(confN);
      document.getElementById('totals-section').innerHTML = renderTotalsSectionHTML(confN);
    } else if (action === 'add-item') {
      var confI = getActiveConf();
      var notaIdI = el.getAttribute('data-nota-id');
      var notaI = getNota(confI, notaIdI);
      var row = el.closest('[data-add-item-row]');
      var produtoSel = row.querySelector('[data-role="add-item-produto"]');
      var customInp = row.querySelector('[data-role="add-item-custom"]');
      var qtdInp = row.querySelector('[data-role="add-item-qtd"]');
      var produto = produtoSel.value;
      var isOutras = produto === 'OUTRAS';
      var qtd = qtdInp.value;
      if (qtd === '') return;
      var label = isOutras ? ((customInp.value || '').trim().toUpperCase() || 'OUTRAS') : produto;
      notaI.itens.push({ id: uid('item'), produto: label, qtdNota: qtd });
      saveState();
      document.getElementById('nota-card-' + notaIdI).innerHTML = renderNotaCardInnerHTML(notaI);
      document.getElementById('totals-section').innerHTML = renderTotalsSectionHTML(confI);
      var freshItemSelect = document.querySelector('#nota-card-' + notaIdI + ' [data-role="add-item-produto"]');
      if (freshItemSelect) freshItemSelect.focus();
    } else if (action === 'delete-item') {
      var confD = getActiveConf();
      var notaIdD = el.getAttribute('data-nota-id');
      var itemIdD = el.getAttribute('data-item-id');
      var notaD = getNota(confD, notaIdD);
      notaD.itens = notaD.itens.filter(function (it) { return it.id !== itemIdD; });
      saveState();
      document.getElementById('nota-card-' + notaIdD).innerHTML = renderNotaCardInnerHTML(notaD);
      document.getElementById('totals-section').innerHTML = renderTotalsSectionHTML(confD);
    } else if (action === 'add-pesagem') {
      var confP = getActiveConf();
      var rowP = el.closest('[data-add-pesagem-row]');
      var produtoSelP = rowP.querySelector('[data-role="pesagem-produto"]');
      var customInpP = rowP.querySelector('[data-role="pesagem-custom"]');
      var caixasInp = rowP.querySelector('[data-role="pesagem-caixas"]');
      var pesoInp = rowP.querySelector('[data-role="pesagem-peso"]');
      var produtoP = produtoSelP.value;
      var isOutrasP = produtoP === 'OUTRAS';
      var caixas = caixasInp.value;
      var peso = pesoInp.value;
      if (caixas === '' && peso === '') return;
      var labelP = isOutrasP ? ((customInpP.value || '').trim().toUpperCase() || 'OUTRAS') : produtoP;
      confP.pesagens.push({ id: uid('pes'), produto: labelP, caixas: caixas, pesoCaixa: peso });
      saveState();
      document.getElementById('pesagens-area').innerHTML = renderPesagensSectionHTML(confP);
      document.getElementById('totals-section').innerHTML = renderTotalsSectionHTML(confP);
      var freshPesSelect = document.querySelector('#pesagens-area [data-role="pesagem-produto"]');
      if (freshPesSelect) freshPesSelect.focus();
    } else if (action === 'open-calc') {
      e.stopPropagation();
      var calcWrap = el.closest('.fcf-qty-wrap');
      var calcTarget = calcWrap ? calcWrap.querySelector('input') : null;
      if (!calcTarget) return;
      var calcPop = document.getElementById('calc-popover');
      if (!calcPop.classList.contains('fcf-hidden') && calcState.targetEl === calcTarget) closeCalc();
      else openCalc(el, calcTarget);
    } else if (action === 'delete-pesagem') {
      var confPD = getActiveConf();
      var pesId = el.getAttribute('data-pesagem-id');
      confPD.pesagens = confPD.pesagens.filter(function (p) { return p.id !== pesId; });
      saveState();
      document.getElementById('pesagens-area').innerHTML = renderPesagensSectionHTML(confPD);
      document.getElementById('totals-section').innerHTML = renderTotalsSectionHTML(confPD);
    }
  }

  function onChange(e) {
    var el = e.target;
    if (!el.matches) return;
    if (el.matches('[data-role="add-item-produto"]')) {
      var row = el.closest('[data-add-item-row]');
      var customInp = row.querySelector('[data-role="add-item-custom"]');
      if (el.value === 'OUTRAS') { customInp.classList.remove('fcf-hidden'); customInp.focus(); }
      else { customInp.classList.add('fcf-hidden'); customInp.value = ''; }
    } else if (el.matches('[data-role="pesagem-produto"]')) {
      var rowP = el.closest('[data-add-pesagem-row]');
      var customInpP = rowP.querySelector('[data-role="pesagem-custom"]');
      if (el.value === 'OUTRAS') { customInpP.classList.remove('fcf-hidden'); customInpP.focus(); }
      else { customInpP.classList.add('fcf-hidden'); customInpP.value = ''; }
    }
  }

  function onInput(e) {
    var el = e.target;
    var field = el.getAttribute('data-field');
    if (!field) return;

    if (field === 'conf-nome') { getActiveConf().nome = el.value; scheduleSave(); }
    else if (field === 'conf-data') { getActiveConf().data = el.value; scheduleSave(); }
    else if (field === 'nota-numero') { getNota(getActiveConf(), el.getAttribute('data-nota-id')).numero = el.value; scheduleSave(); }
    else if (field === 'nota-data') { getNota(getActiveConf(), el.getAttribute('data-nota-id')).data = el.value; scheduleSave(); }
    else if (field === 'item-qtd') {
      var conf = getActiveConf();
      var nota = getNota(conf, el.getAttribute('data-nota-id'));
      var item = getItem(nota, el.getAttribute('data-item-id'));
      item.qtdNota = el.value;
      var totalsSection = document.getElementById('totals-section');
      if (totalsSection) totalsSection.innerHTML = renderTotalsSectionHTML(conf);
      scheduleSave();
    } else if (field === 'pes-caixas' || field === 'pes-peso') {
      var confP = getActiveConf();
      var pes = getPesagem(confP, el.getAttribute('data-pesagem-id'));
      if (field === 'pes-caixas') pes.caixas = el.value; else pes.pesoCaixa = el.value;

      var tr = el.closest('tr');
      var totalCell = tr.querySelector('.total-cell');
      totalCell.textContent = formatKg(parseNum(pes.caixas) * parseNum(pes.pesoCaixa));

      var totalsSectionP = document.getElementById('totals-section');
      if (totalsSectionP) totalsSectionP.innerHTML = renderTotalsSectionHTML(confP);
      scheduleSave();
    }
  }

  function onKeydown(e) {
    if (e.key !== 'Enter') return;
    var el = e.target;
    if (el.id === 'new-conf-name') { e.preventDefault(); var b1 = document.querySelector('[data-action="create-conference"]'); if (b1) b1.click(); }
    else if (el.id === 'new-nota-numero') { e.preventDefault(); var b2 = document.querySelector('[data-action="create-nota"]'); if (b2) b2.click(); }
    else if (el.getAttribute && el.getAttribute('data-role') && el.getAttribute('data-role').indexOf('add-item-') === 0) {
      e.preventDefault();
      var notaId = el.getAttribute('data-nota-id');
      var btn = document.querySelector('[data-action="add-item"][data-nota-id="' + notaId + '"]');
      if (btn) btn.click();
    } else if (el.getAttribute && el.getAttribute('data-role') && el.getAttribute('data-role').indexOf('pesagem-') === 0) {
      e.preventDefault();
      var btn2 = document.querySelector('[data-action="add-pesagem"]');
      if (btn2) btn2.click();
    }
  }

  /* ---------- init ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    loadState();
    render();
    var app = document.getElementById('app');
    app.addEventListener('click', onClick);
    app.addEventListener('input', onInput);
    app.addEventListener('change', onChange);
    app.addEventListener('keydown', onKeydown);

    var calcPop = document.createElement('div');
    calcPop.id = 'calc-popover';
    calcPop.className = 'fcf-calc-popover fcf-hidden';
    document.body.appendChild(calcPop);
    calcPop.addEventListener('click', onCalcClick);

    document.addEventListener('click', function (e) {
      var pop = document.getElementById('calc-popover');
      if (!pop || pop.classList.contains('fcf-hidden')) return;
      if (pop.contains(e.target)) return;
      if (e.target.closest && e.target.closest('[data-action="open-calc"]')) return;
      closeCalc();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var pop = document.getElementById('calc-popover');
        if (pop && !pop.classList.contains('fcf-hidden')) closeCalc();
      }
    });
  });
})();

  