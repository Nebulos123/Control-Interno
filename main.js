const SUPABASE_URL = 'https://ybrwwgkouxdgdfpdofin.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlicnd3Z2tvdXhkZ2RmcGRvZmluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MjU3MzksImV4cCI6MjA3NTEwMTczOX0.oxBJ8P1lyu8fL6eSFYRatCiP4XRg2xtdUJa8pqjNvxo';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const loginContainer = document.getElementById('login-container'), mainContent = document.getElementById('main-content'), modal = document.getElementById('modal-via'), searchBox = document.getElementById('search-box'), filterButtons = document.querySelectorAll('.filter-buttons button'), tooltipProblema = document.getElementById('tooltip-problema'), loginForm = document.getElementById('login-form'), loginButton = document.getElementById('login-button'), loginError = document.getElementById('login-error'), logoutButton = document.getElementById('logout-button'), userEmailDisplay = document.getElementById('user-email-display'), userRoleDisplay = document.getElementById('user-role-display'), closeButton = document.querySelector('.close-button'), formNovedad = document.getElementById('form-novedad');

const adminTasksContainer = document.getElementById('admin-tasks-container'),
      addPresetTaskButton = document.getElementById('add-preset-task-button'),
      newPresetTaskInput = document.getElementById('new-preset-task-input'),
      presetTasksList = document.getElementById('preset-tasks-list'),
      presetTasksLoader = document.getElementById('preset-tasks-loader'),
      selectTareaPredeterminada = document.getElementById('select-tarea-predeterminada'),
      marcarResueltaInput = document.getElementById('marcar-resuelta-input');

const reportGeneratorContainer = document.getElementById('report-generator-container');
    
let currentUserEmail = null, currentUserRole = 'operator', filtroActivo = 'todos', canalVias = null, todasLasVias = [], viaActualModal = null;
let tareasPredeterminadas = [];
let tareasPendientes = [];
let tooltipTimer = null; 

const esAdmin = () => currentUserRole === 'admin';

const MAX_POROTOS = 20; let porotoCount = 0; const porotosContainer = document.getElementById('porotos-container'), porotoCounterDisplay = document.getElementById('poroto-counter'), porotoJar = document.getElementById('poroto-jar'); function addPoroto() { if (porotoCount >= MAX_POROTOS) return; porotoCount++; localStorage.setItem('porotoCount', porotoCount); const poroto = document.createElement('div'); poroto.className = 'poroto'; porotosContainer.appendChild(poroto); updatePorotoCounter(); if (porotoCount === MAX_POROTOS) { porotoJar.classList.add('jar-full-animation'); mostrarNotificacion('¡Frasco lleno! Buen trabajo equipo. 🎉', 'success'); setTimeout(resetJar, 2000); } } function resetJar() { porotoJar.classList.remove('jar-full-animation'); const porotos = porotosContainer.querySelectorAll('.poroto'); porotos.forEach(p => p.classList.add('poroto-exit')); setTimeout(() => { porotosContainer.innerHTML = ''; porotoCount = 0; localStorage.setItem('porotoCount', 0); updatePorotoCounter(); }, 500); } function updatePorotoCounter() { porotoCounterDisplay.textContent = `${porotoCount} / ${MAX_POROTOS}`; } function renderJarState() { const savedCount = parseInt(localStorage.getItem('porotoCount')) || 0; porotoCount = savedCount; porotosContainer.innerHTML = ''; for (let i = 0; i < porotoCount; i++) { const poroto = document.createElement('div'); poroto.className = 'poroto'; poroto.style.animation = 'none'; porotosContainer.appendChild(poroto); } updatePorotoCounter(); }

function mostrarTooltip(viaId, targetElement, status) {
    tooltipProblema.className = `tooltip-${status}`;
    const tareasDeLaVia = tareasPendientes.filter(t => t.via_id === viaId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (tareasDeLaVia.length === 0) {
        tooltipProblema.innerHTML = '<strong>No hay tareas pendientes.</strong>';
    } else {
        tooltipProblema.innerHTML = `<strong>Última Tarea Pendiente:</strong> ${tareasDeLaVia[0].descripcion}`;
    }
    const rect = targetElement.getBoundingClientRect();
    tooltipProblema.style.left = `${rect.left + window.scrollX}px`;
    tooltipProblema.style.top = `${rect.bottom + window.scrollY + 5}px`;
    tooltipProblema.classList.add('visible');
}
function ocultarTooltip() { tooltipProblema.classList.remove('visible'); }

async function cargarYRenderizarTareasPredeterminadas() { if (!esAdmin()) return; presetTasksLoader.style.display = 'flex'; presetTasksList.innerHTML = ''; try { const { data, error } = await supabaseClient.from('tareas_predeterminadas').select('id, descripcion').order('descripcion', { ascending: true }); if (error) throw error; tareasPredeterminadas = data; if (data.length === 0) { presetTasksList.innerHTML = '<li>No hay tareas predeterminadas.</li>'; } else { data.forEach(task => { const li = document.createElement('li'); li.innerHTML = `<span>${task.descripcion}</span><button data-id="${task.id}" class="delete-preset-task">Eliminar</button>`; presetTasksList.appendChild(li); }); } } catch (error) { console.error("Error al cargar tareas predeterminadas:", error); mostrarNotificacion("No se pudieron cargar las tareas predeterminadas.", "error"); } finally { presetTasksLoader.style.display = 'none'; } }
async function agregarTareaPredeterminada() { const descripcion = newPresetTaskInput.value.trim(); if (!descripcion) { mostrarNotificacion("La descripción no puede estar vacía.", "error"); return; } addPresetTaskButton.disabled = true; try { const { error } = await supabaseClient.from('tareas_predeterminadas').insert([{ descripcion }]); if (error) throw error; mostrarNotificacion("Tarea predeterminada agregada.", "success"); newPresetTaskInput.value = ''; } catch (error) { console.error("Error al agregar tarea predeterminada:", error); mostrarNotificacion("Error al guardar la tarea.", "error"); } finally { addPresetTaskButton.disabled = false; } }
async function eliminarTareaPredeterminada(id) { if (!confirm("¿Seguro que quieres eliminar esta tarea predeterminada?")) return; try { const { error } = await supabaseClient.from('tareas_predeterminadas').delete().eq('id', id); if (error) throw error; mostrarNotificacion("Tarea predeterminada eliminada.", "success"); } catch (error) { console.error("Error al eliminar tarea predeterminada:", error); mostrarNotificacion("Error al eliminar la tarea.", "error"); } }

async function inicializarPanelesYDatos() { 
    await cargarVias(); 
    if (esAdmin()) { 
        adminTasksContainer.style.display = 'block'; 
        reportGeneratorContainer.style.display = 'block'; 
        await cargarYRenderizarTareasPredeterminadas(); 
    } else { 
        adminTasksContainer.style.display = 'none'; 
        reportGeneratorContainer.style.display = 'none'; 
        const { data, error } = await supabaseClient.from('tareas_predeterminadas').select('id, descripcion'); 
        if (!error) { tareasPredeterminadas = data; } 
    } 
}

async function cargarVias() {
    document.querySelectorAll('.grupo-vias .loader-container').forEach(loader => loader.style.display = 'flex');
    try {
        const [viasRes, tareasRes] = await Promise.all([
            supabaseClient.from('vias').select(`id, numero_via, status, modelo_barrera`).order('numero_via', { ascending: true }),
            supabaseClient.from('novedades').select(`id, via_id, descripcion, created_at`).eq('resuelta', false)
        ]);
        if (viasRes.error) throw viasRes.error;
        if (tareasRes.error) throw tareasRes.error;
        
        todasLasVias = viasRes.data;
        tareasPendientes = tareasRes.data; 

        document.querySelectorAll('.vias-grid').forEach(g => g.innerHTML = '');

        for (const via of todasLasVias) {
            const viaBox = document.createElement('div');
            viaBox.className = `via-box status-${via.status}`;
            viaBox.dataset.viaId = via.id;
            viaBox.dataset.viaStatus = via.status;
            const modeloTexto = via.modelo_barrera || '';
            let barreraHTML = '';
            if(modeloTexto) {
                barreraHTML = `<div class="barrera-info" title="Modelo: ${modeloTexto}"><svg class="barrera-icono" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg"><path d="M6 30 V 11 H 16 V 6 H 6 V 0 H 4 V 6 H 0 V 11 H 4 V 30 Z M 16 11 H 30 V 8 H 16 Z" fill="#d8dee9" stroke="none"></path></svg><span class="barrera-modelo-nombre">${modeloTexto}</span></div>`;
            }
            viaBox.innerHTML = `${via.numero_via}${barreraHTML}`;
            
            if (via.status === 'problema' || via.status === 'revisar') {
                viaBox.addEventListener('mouseenter', () => {
                    clearTimeout(tooltipTimer);
                    tooltipTimer = setTimeout(() => {
                        mostrarTooltip(Number(via.id), viaBox, via.status);
                    }, 300); 
                });
                viaBox.addEventListener('mouseleave', () => {
                    clearTimeout(tooltipTimer);
                    ocultarTooltip();
                });
            }
            
            viaBox.addEventListener('click', () => mostrarModal(via));
            const grupoId = via.numero_via <= 40 ? 'grupo-1-40' : via.numero_via <= 44 ? 'grupo-43-44' : via.numero_via <= 47 ? 'grupo-46-47' : 'grupo-50-51';
            document.getElementById(grupoId).appendChild(viaBox);
        }
        actualizarDashboard();
        filtrarVias();
    } catch (error) {
        console.error('Error al cargar datos iniciales:', error);
        mostrarNotificacion('No se pudieron cargar los datos.', 'error');
    } finally {
        document.querySelectorAll('.grupo-vias .loader-container').forEach(loader => loader.style.display = 'none');
    }
}
async function buscarProblemaGlobal() { const searchTerm = document.getElementById('global-search-box').value.trim(); const resultsContainer = document.getElementById('global-search-results-container'), resultsList = document.getElementById('global-search-results-list'), loader = document.getElementById('global-search-loader'), noResultsMessage = document.getElementById('no-global-results-message'); if (!searchTerm) { mostrarNotificacion('Por favor, ingresa un término de búsqueda.', 'error'); return; } resultsContainer.style.display = 'block'; loader.style.display = 'flex'; resultsList.innerHTML = ''; noResultsMessage.style.display = 'none'; try { const { data, error } = await supabaseClient.from('novedades').select(`id, descripcion, created_at, resuelta, resolved_at, resolved_by, user_email, vias ( numero_via )`).ilike('descripcion', `%${searchTerm}%`).order('created_at', { ascending: false }); if (error) throw error; if (data.length > 0) { data.forEach(novedad => { const li = document.createElement('li'); const fechaCreacion = new Date(novedad.created_at).toLocaleString('es-AR'); let metaInfo = `<span class="resultado-meta"><span class="fecha">${fechaCreacion}</span> - Creado por ${novedad.user_email || 'Sistema'}</span>`; if(novedad.resuelta && novedad.resolved_at) { const fechaResolucion = new Date(novedad.resolved_at).toLocaleString('es-AR'); metaInfo += `<span class="resultado-meta">Resuelto por ${novedad.resolved_by} el ${fechaResolucion}</span>`; } li.innerHTML = `<div><span class="resultado-via-numero">Vía ${novedad.vias.numero_via}</span><span class="estado-tag ${novedad.resuelta ? 'resuelta' : ''}">${novedad.resuelta ? 'Resuelto' : 'Pendiente'}</span></div><p class="resultado-descripcion">${novedad.descripcion}</p>${metaInfo}`; resultsList.appendChild(li); }); } else { noResultsMessage.style.display = 'block'; } } catch (error) { console.error('Error en la búsqueda global:', error); mostrarNotificacion('Ocurrió un error al realizar la búsqueda.', 'error'); } finally { loader.style.display = 'none'; } }
async function mostrarModal(via) {
    viaActualModal = via;
    document.getElementById('modal-title').textContent = `Tareas y Novedades - Vía ${via.numero_via}`;
    document.getElementById('via-id-input').value = via.id;
    document.getElementById('status-via').value = via.status;
    document.getElementById('descripcion-novedad').value = '';
    marcarResueltaInput.checked = false; 
    selectTareaPredeterminada.value = "";
    const barreraForm = document.getElementById('barrera-form-section');
    if (esAdmin()) {
        barreraForm.style.display = 'block';
        document.getElementById('modelo-barrera-input').value = via.modelo_barrera || '';
    } else {
        barreraForm.style.display = 'none';
    }
    selectTareaPredeterminada.innerHTML = '<option value="">-- Escribir tarea manualmente --</option>';
    if (tareasPredeterminadas.length > 0) {
        tareasPredeterminadas.forEach(task => {
            const option = document.createElement('option');
            option.value = task.descripcion;
            option.textContent = task.descripcion;
            selectTareaPredeterminada.appendChild(option);
        });
    }
    document.getElementById('status-via').disabled = false;
    document.getElementById('tab-pendientes').click();
    modal.style.display = 'block';
    await cargarNovedadesModal();
}
async function guardarModeloBarrera() { const botonGuardar = document.getElementById('guardar-modelo-barrera'); const nuevoModelo = document.getElementById('modelo-barrera-input').value.trim(); if (!viaActualModal) return; botonGuardar.disabled = true; botonGuardar.textContent = 'Guardando...'; try { const { error } = await supabaseClient.from('vias').update({ modelo_barrera: nuevoModelo }).eq('id', viaActualModal.id); if (error) throw error; viaActualModal.modelo_barrera = nuevoModelo; mostrarNotificacion('Modelo de barrera actualizado con éxito.', 'success'); } catch (error) { console.error('Error al guardar el modelo de la barrera:', error); mostrarNotificacion('No se pudo guardar el modelo de la barrera.', 'error'); } finally { botonGuardar.disabled = false; botonGuardar.textContent = 'Guardar Modelo'; } }
async function cargarNovedadesModal(historialPage = 1) { const listaPendientes = document.getElementById('lista-pendientes'), listaHistorial = document.getElementById('lista-historial'), loaders = document.querySelectorAll('.novedades-container .loader-container'); loaders.forEach(l => l.style.display = 'flex'); listaPendientes.innerHTML = ''; listaHistorial.innerHTML = ''; try { const { data: pendientes, error: errPend } = await supabaseClient.from('novedades').select('*').eq('via_id', viaActualModal.id).eq('resuelta', false).order('created_at', { ascending: true }); if (errPend) throw errPend; if (pendientes.length > 0) { pendientes.forEach(n => listaPendientes.appendChild(crearItemNovedad(n, false))); } else { listaPendientes.innerHTML = '<li>No hay tareas pendientes.</li>'; } const NOVEDADES_PER_PAGE = 5, from = (historialPage - 1) * NOVEDADES_PER_PAGE, to = from + NOVEDADES_PER_PAGE - 1, textoBusqueda = document.getElementById('historial-search').value.trim(), fechaSeleccionada = document.getElementById('historial-date-picker').value; let queryHistorial = supabaseClient.from('novedades').select('*', { count: 'exact' }).eq('via_id', viaActualModal.id).eq('resuelta', true); if (textoBusqueda) queryHistorial = queryHistorial.ilike('descripcion', `%${textoBusqueda}%`); if (fechaSeleccionada) { const fechaInicio = `${fechaSeleccionada}T00:00:00`, fechaFin = `${fechaSeleccionada}T23:59:59`; queryHistorial = queryHistorial.gte('created_at', fechaInicio).lte('created_at', fechaFin); } const { data: resueltas, count, error: errRes } = await queryHistorial.order('created_at', { ascending: false }).range(from, to); if (errRes) throw errRes; if (resueltas.length > 0) { resueltas.forEach(n => listaHistorial.appendChild(crearItemNovedad(n, true))); } else { listaHistorial.innerHTML = '<li>No hay historial de tareas resueltas.</li>'; } renderizarControlesPaginacion(historialPage, count, NOVEDADES_PER_PAGE); } catch (error) { console.error("Error cargando novedades:", error); mostrarNotificacion('Error al cargar las tareas.', 'error'); } finally { loaders.forEach(l => l.style.display = 'none'); } }
function crearItemNovedad(novedad, esResuelta) { const item = document.createElement('li'); item.className = esResuelta ? 'novedad-resuelta' : 'novedad-pendiente'; item.dataset.novedadId = novedad.id; const fechaCreacion = new Date(novedad.created_at).toLocaleString('es-AR'); let infoAuditoria = ''; if (esResuelta && novedad.resolved_at && novedad.resolved_by) { const fechaResolucion = new Date(novedad.resolved_at).toLocaleString('es-AR'); infoAuditoria = `<span class="meta-info resuelta-info">Resuelta por ${novedad.resolved_by} el ${fechaResolucion}</span>`; } let botonesAccion = ''; const puedeEditar = esAdmin() || novedad.user_email === currentUserEmail; if (!esResuelta) { botonesAccion += `<button class="btn-resolver" title="Marcar como Resuelta">✔️</button>`; } if (puedeEditar) { botonesAccion += `<button class="btn-editar" title="Editar">✏️</button>`; } if (esAdmin()) { botonesAccion += `<button class="btn-eliminar" title="Eliminar">🗑️</button>`; } item.innerHTML = `<div class="novedad-contenido"><span class="meta-info">Creada por ${novedad.user_email || 'Sistema'} el ${fechaCreacion}</span>${infoAuditoria}<p class="descripcion-texto">${novedad.descripcion}</p></div><div class="novedad-acciones">${botonesAccion}</div>`; return item; }

async function resolverNovedad(novedadId) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) { mostrarNotificacion('Sesión inválida', 'error'); return; }
    const updatePayload = { resuelta: true, resolved_at: new Date().toISOString(), resolved_by: user.email };
    const { error } = await supabaseClient.from('novedades').update(updatePayload).eq('id', novedadId);
    if (error) { mostrarNotificacion('Error al resolver la tarea.', 'error'); return; }
    addPoroto();
    mostrarNotificacion('Muy Bien, ¡te ganaste 1 poroto! 🥳');
    const { count } = await supabaseClient.from('novedades').select('*', { count: 'exact', head: true }).eq('via_id', viaActualModal.id).eq('resuelta', false);
    if (count === 0 && viaActualModal.status !== 'normal') {
        const { error: updateError } = await supabaseClient.from('vias').update({ status: 'normal' }).eq('id', viaActualModal.id);
        if (!updateError) {
            mostrarNotificacion(`Vía ${viaActualModal.numero_via} pasada a estado Normal.`, 'success');
        }
    }
}
async function manejarEliminarNovedad(novedadId) {
    if (!esAdmin()) { mostrarNotificacion('No tienes permisos para eliminar.', 'error'); return; }
    if (confirm("¿Seguro que desea eliminar esta tarea/novedad?")) {
        try {
            const { data: novedad, error: fetchError } = await supabaseClient.from('novedades').select('via_id').eq('id', novedadId).single();
            if (fetchError || !novedad) throw new Error("No se pudo encontrar la tarea para obtener su vía.");
            const viaIdAfectada = novedad.via_id;
            const { error: deleteError } = await supabaseClient.from('novedades').delete().eq('id', novedadId);
            if (deleteError) throw deleteError;
            mostrarNotificacion("Eliminado con éxito.");
            const { count, error: countError } = await supabaseClient.from('novedades').select('*', { count: 'exact', head: true }).eq('via_id', viaIdAfectada).eq('resuelta', false);
            if (countError) throw countError;
            if (count === 0) {
                const { data: via, error: viaError } = await supabaseClient.from('vias').select('status').eq('id', viaIdAfectada).single();
                if(via && via.status !== 'normal') {
                    const { error: updateViaError } = await supabaseClient.from('vias').update({ status: 'normal' }).eq('id', viaIdAfectada);
                    if (!updateViaError) {
                        mostrarNotificacion(`La vía ha vuelto al estado 'Normal'.`, 'success');
                    }
                }
            }
        } catch (error) {
            console.error("Error en el proceso de eliminación:", error);
            mostrarNotificacion("Error al eliminar la tarea.", 'error');
        }
    }
}
async function guardarEdicionNovedad(itemLi, novedadId) {
    const nuevoTexto = itemLi.querySelector('.edit-textarea').value.trim();
    if(nuevoTexto){
        const { error } = await supabaseClient.from('novedades').update({ descripcion: nuevoTexto }).eq('id', novedadId);
        if(error) mostrarNotificacion('Error al guardar la edición.', 'error');
        else { mostrarNotificacion('Tarea actualizada.'); }
    } else {
        mostrarNotificacion('La descripción no puede estar vacía.', 'error');
    }
}
function mostrarEditorNovedad(itemLi) { const contenido = itemLi.querySelector('.novedad-contenido'), textoActual = contenido.querySelector('.descripcion-texto').innerText; itemLi.querySelector('.novedad-acciones').style.display = 'none'; contenido.innerHTML = `<div class="edit-container"><textarea class="edit-textarea">${textoActual}</textarea><div class="edit-actions"><button class="btn-guardar-edicion">Guardar</button><button class="btn-cancelar-edicion">Cancelar</button></div></div>`; }
function mostrarNotificacion(mensaje, tipo = 'success') { const container = document.getElementById('toast-container'), toast = document.createElement('div'); toast.className = `toast ${tipo}`; toast.textContent = mensaje; container.appendChild(toast); setTimeout(() => toast.classList.add('show'), 100); setTimeout(() => { toast.classList.remove('show'); toast.addEventListener('transitionend', () => toast.remove()); }, 3000); }
function actualizarDashboard() { const counts = todasLasVias.reduce((acc, via) => { acc[via.status] = (acc[via.status] || 0) + 1; return acc; }, {}); document.getElementById('stat-count-problema').textContent = counts.problema || 0; document.getElementById('stat-count-revisar').textContent = counts.revisar || 0; document.getElementById('stat-count-normal').textContent = counts.normal || 0; }
function renderizarControlesPaginacion(currentPage, totalItems, perPage) { const paginationContainer = document.getElementById('historial-pagination'); paginationContainer.innerHTML = ''; const totalPages = Math.ceil(totalItems / perPage); if (totalPages <= 1) return; const prevButton = document.createElement('button'); prevButton.textContent = 'Anterior'; prevButton.disabled = currentPage === 1; prevButton.onclick = () => cargarNovedadesModal(currentPage - 1); const pageInfo = document.createElement('span'); pageInfo.textContent = `Página ${currentPage} de ${totalPages}`; const nextButton = document.createElement('button'); nextButton.textContent = 'Siguiente'; nextButton.disabled = currentPage === totalPages; nextButton.onclick = () => cargarNovedadesModal(currentPage + 1); paginationContainer.append(prevButton, pageInfo, nextButton); }

async function descargarReporteCSV() {
    const startDateInput = document.getElementById('report-start-date');
    const endDateInput = document.getElementById('report-end-date');
    const downloadButton = document.getElementById('download-report-button');

    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (!startDate || !endDate) {
        mostrarNotificacion('Por favor, selecciona una fecha de inicio y una de fin.', 'error');
        return;
    }

    downloadButton.disabled = true;
    downloadButton.textContent = 'Generando...';

    try {
        const endDateAdjusted = new Date(endDate);
        endDateAdjusted.setHours(23, 59, 59, 999);

        const { data, error } = await supabaseClient
            .from('novedades')
            .select('*, vias(numero_via)')
            .eq('resuelta', true)
            .gte('resolved_at', new Date(startDate).toISOString())
            .lte('resolved_at', endDateAdjusted.toISOString())
            .order('resolved_at', { ascending: true });

        if (error) throw error;

        if (data.length === 0) {
            mostrarNotificacion('No hay tareas resueltas en el rango de fechas seleccionado.', 'success');
            startDateInput.value = '';
            endDateInput.value = '';
            return;
        }
        
        const headers = [
            'ID Tarea', 'Numero de Via', 'Descripcion', 'Creado Por',
            'Fecha de Creacion', 'Resuelto Por', 'Fecha de Resolucion'
        ];

        const csvRows = [headers.join(';')];

        data.forEach(novedad => {
            const cleanText = (text) => {
                if (!text) return '';
                let cleaned = text.toString().replace(/"/g, '""');
                cleaned = cleaned.replace(/(\r\n|\n|\r)/gm, " ");
                return `"${cleaned}"`;
            };
            
            const row = [
                novedad.id,
                novedad.vias ? novedad.vias.numero_via : 'N/A',
                cleanText(novedad.descripcion),
                novedad.user_email || 'Sistema',
                new Date(novedad.created_at).toLocaleString('es-AR'),
                novedad.resolved_by || 'N/A',
                new Date(novedad.resolved_at).toLocaleString('es-AR')
            ];
            csvRows.push(row.join(';'));
        });
        
        const bom = '\uFEFF'; 
        const csvContent = bom + csvRows.join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `reporte_tareas_resueltas_${startDate}_a_${endDate}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        mostrarNotificacion('Reporte descargado con éxito.', 'success');
        
        startDateInput.value = '';
        endDateInput.value = '';

    } catch (error) {
        console.error('Error generando el reporte:', error);
        mostrarNotificacion('No se pudo generar el reporte.', 'error');
    } finally {
        downloadButton.disabled = false;
        downloadButton.textContent = 'Descargar Reporte';
    }
}

const handleLogin = async (event) => { event.preventDefault(); loginButton.disabled = true; loginButton.textContent = 'Accediendo...'; loginError.style.display = 'none'; const email = document.getElementById('email').value, password = document.getElementById('password').value; try { const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password }); if (error) throw error; const { data: profile, error: profileError } = await supabaseClient.from('profiles').select('role').eq('id', data.user.id).single(); if (profileError) throw profileError; loginContainer.style.display = 'none'; mainContent.style.display = 'block'; currentUserEmail = data.user.email; currentUserRole = profile.role || 'operator'; userEmailDisplay.textContent = currentUserEmail; userRoleDisplay.textContent = currentUserRole; await inicializarPanelesYDatos(); escucharCambiosVias(); } catch (error) { console.error('Error de login:', error.message); loginError.style.display = 'block'; mostrarNotificacion('Usuario o contraseña incorrectos.', 'error'); } finally { loginButton.disabled = false; loginButton.textContent = 'Acceder'; } };
const checkUser = async () => { const { data: { session } } = await supabaseClient.auth.getSession(); if (session) { const { data: profile, error: profileError } = await supabaseClient.from('profiles').select('role').eq('id', session.user.id).single(); if (profileError) { await handleLogout(); return; } loginContainer.style.display = 'none'; mainContent.style.display = 'block'; currentUserEmail = session.user.email; currentUserRole = profile.role || 'operator'; userEmailDisplay.textContent = currentUserEmail; userRoleDisplay.textContent = currentUserRole; await inicializarPanelesYDatos(); escucharCambiosVias(); } else { loginContainer.style.display = 'block'; mainContent.style.display = 'none'; } };
const handleLogout = async () => { if (canalVias) { supabaseClient.removeChannel(canalVias); canalVias = null; } await supabaseClient.auth.signOut(); mainContent.style.display = 'none'; loginContainer.style.display = 'block'; adminTasksContainer.style.display = 'none'; currentUserEmail = null; currentUserRole = 'operator'; };
function cerrarModal() { modal.style.display = 'none'; viaActualModal = null; }

async function manejarSubmitNovedad(event) {
    event.preventDefault();
    const submitButton = event.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Guardando...';
    try {
        const idVia = document.getElementById('via-id-input').value;
        const nuevaDescripcion = document.getElementById('descripcion-novedad').value.trim();
        const nuevoStatus = document.getElementById('status-via').value;
        const marcarComoResuelta = marcarResueltaInput.checked;
        if (!nuevaDescripcion) {
            mostrarNotificacion('La descripción de la tarea no puede estar vacía.', 'error');
            return;
        }
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) { mostrarNotificacion('Sesión expirada.', 'error'); return; }
        const insertPayload = {
            via_id: idVia,
            descripcion: nuevaDescripcion,
            user_email: user.email,
            resuelta: marcarComoResuelta
        };
        if (marcarComoResuelta) {
            insertPayload.resolved_at = new Date().toISOString();
            insertPayload.resolved_by = user.email;
        }
        const { error: insertError } = await supabaseClient.from('novedades').insert([insertPayload]);
        if (insertError) throw insertError;
        
        if (marcarComoResuelta) {
            addPoroto();
            mostrarNotificacion('Tarea agregada y resuelta. ¡Te ganaste 1 poroto! 🥳');
        } else {
            mostrarNotificacion('Tarea agregada con éxito!');
        }
        if (nuevoStatus !== viaActualModal.status) {
            const { error: updateError } = await supabaseClient.from('vias').update({ status: nuevoStatus }).eq('id', idVia);
            if (updateError) throw updateError;
        }
        document.getElementById('descripcion-novedad').value = '';
        marcarResueltaInput.checked = false; 
        selectTareaPredeterminada.value = "";
    } catch (error) {
        console.error('Error al guardar:', error);
        mostrarNotificacion('Error al guardar la tarea.', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Guardar';
    }
}

function filtrarVias() {
    const textoBusqueda = searchBox.value.toLowerCase();
    document.querySelectorAll('.grupo-vias').forEach(grupo => {
        let viasVisibles = 0;
        const viasEnGrupo = grupo.querySelectorAll('.via-box');
        viasEnGrupo.forEach(via => {
            const coincideBusqueda = via.textContent.toLowerCase().includes(textoBusqueda);
            const coincideFiltro = (filtroActivo === 'todos') || (via.dataset.viaStatus === filtroActivo);
            if (coincideBusqueda && coincideFiltro) {
                via.style.display = 'block';
                viasVisibles++;
            } else {
                via.style.display = 'none';
            }
        });
        const mensajeVacio = grupo.querySelector('.no-results-message');
        mensajeVacio.style.display = viasVisibles === 0 ? 'block' : 'none';
    })
}

function escucharCambiosVias() {
    if (canalVias) { console.log("Ya existe un canal, no se creará uno nuevo."); return; }
    canalVias = supabaseClient.channel('cambios-db-general')
        .on('postgres_changes', { event: '*', schema: 'public' }, async (payload) => {
            console.log('Cambio en tiempo real detectado:', payload);
            if (payload.table === 'vias' || payload.table === 'novedades') {
                console.log('Refrescando datos de vías y tareas pendientes...');
                await cargarVias(); 
                if (modal.style.display === 'block' && viaActualModal) {
                    console.log('Modal abierto, refrescando su contenido...');
                    await cargarNovedadesModal();
                }
            }
            if (payload.table === 'tareas_predeterminadas') {
                console.log('Refrescando lista de tareas predeterminadas...');
                const { data, error } = await supabaseClient.from('tareas_predeterminadas').select('id, descripcion');
                if (!error && data) { tareasPredeterminadas = data; }
                if (esAdmin()) { await cargarYRenderizarTareasPredeterminadas(); }
                if (modal.style.display === 'block') {
                    selectTareaPredeterminada.innerHTML = '<option value="">-- Escribir tarea manualmente --</option>';
                    tareasPredeterminadas.forEach(task => {
                        const option = document.createElement('option');
                        option.value = task.descripcion;
                        option.textContent = task.descripcion;
                        selectTareaPredeterminada.appendChild(option);
                    });
                }
            }
        
        }).subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                console.log('¡Conectado al canal de tiempo real para todos los cambios!');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('Error en el canal de tiempo real:', err);
            } else {
                console.log('Estado del canal en tiempo real:', status);
            }
        });
}


document.addEventListener('DOMContentLoaded', () => { 
    document.getElementById('footer-year').textContent = new Date().getFullYear(); 
    renderJarState(); 
    checkUser(); 
    loginForm.addEventListener('submit', handleLogin); 
    logoutButton.addEventListener('click', handleLogout); 
    closeButton.addEventListener('click', cerrarModal); 
    window.addEventListener('click', (event) => { if (event.target == modal) { cerrarModal(); } }); 
    formNovedad.addEventListener('submit', manejarSubmitNovedad); 
    searchBox.addEventListener('input', filtrarVias); 
    filterButtons.forEach(button => { button.addEventListener('click', () => { filterButtons.forEach(btn => btn.classList.remove('active')); button.classList.add('active'); filtroActivo = button.id.replace('filter-', ''); filtrarVias(); }); }); 
    document.getElementById('tab-pendientes').addEventListener('click', (e) => { document.getElementById('content-pendientes').classList.add('active'); document.getElementById('content-historial').classList.remove('active'); e.target.classList.add('active'); document.getElementById('tab-historial').classList.remove('active'); }); 
    document.getElementById('tab-historial').addEventListener('click', (e) => { document.getElementById('content-historial').classList.add('active'); document.getElementById('content-pendientes').classList.remove('active'); e.target.classList.add('active'); document.getElementById('tab-pendientes').classList.remove('active'); }); 
    document.getElementById('historial-search').addEventListener('input', () => cargarNovedadesModal(1)); 
    document.getElementById('historial-date-picker').addEventListener('change', () => cargarNovedadesModal(1)); 
    const globalSearchButton = document.getElementById('global-search-button'), globalSearchBox = document.getElementById('global-search-box'); 
    globalSearchButton.addEventListener('click', buscarProblemaGlobal); 
    globalSearchBox.addEventListener('keyup', (event) => { if (event.key === 'Enter') { buscarProblemaGlobal(); } }); 
    globalSearchBox.addEventListener('input', () => { if (globalSearchBox.value.trim() === '') { document.getElementById('global-search-results-container').style.display = 'none'; } }); 
    document.getElementById('guardar-modelo-barrera').addEventListener('click', guardarModeloBarrera); 
    document.querySelector('.tasks-section').addEventListener('click', async (e) => { const target = e.target, itemLi = target.closest('li'); if (!itemLi) return; const novedadId = itemLi.dataset.novedadId; if (target.classList.contains('btn-resolver')) { if (confirm("¿Marcar esta tarea como resuelta?")) { await resolverNovedad(novedadId); } } else if (target.classList.contains('btn-eliminar')) { await manejarEliminarNovedad(novedadId); } else if (target.classList.contains('btn-editar')) { mostrarEditorNovedad(itemLi); } else if (target.classList.contains('btn-guardar-edicion')) { await guardarEdicionNovedad(itemLi, novedadId); } else if (target.classList.contains('btn-cancelar-edicion')) { await cargarNovedadesModal(); } });
    selectTareaPredeterminada.addEventListener('change', (e) => { if (e.target.value) { document.getElementById('descripcion-novedad').value = e.target.value; } });
    addPresetTaskButton.addEventListener('click', agregarTareaPredeterminada);
    newPresetTaskInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') { agregarTareaPredeterminada(); } });
    presetTasksList.addEventListener('click', (e) => { if (e.target.classList.contains('delete-preset-task')) { const id = e.target.dataset.id; eliminarTareaPredeterminada(id); } });
    
    // Lógica para el acordeón
    const accordionHeader = document.querySelector('.accordion-header');
    if (accordionHeader) {
        const toggleBtn = document.getElementById('toggle-preset-tasks');
        const content = document.getElementById('preset-tasks-content');

        accordionHeader.addEventListener('click', () => {
            toggleBtn.classList.toggle('open');
            content.classList.toggle('open');
        });
    }

    const downloadReportBtn = document.getElementById('download-report-button');
    if(downloadReportBtn) {
        downloadReportBtn.addEventListener('click', descargarReporteCSV);
    }

    // =========================================================================
    // ====== CORRECCIÓN: INICIALIZACIÓN Y EVENTOS DE MÓVILES (MOVIDO AQUÍ) =====
    // =========================================================================

    // --- Array para los móviles
    let moviles = [];

    // --- Se declaran las variables de los elementos del DOM AHORA, que ya existen.
    const openMovilesModalBtn = document.getElementById('open-moviles-modal-btn');
    const modalMoviles = document.getElementById('modal-moviles');
    const closeModalMovilesBtn = modalMoviles.querySelector('.close-button');
    const btnAgregarMovil = document.getElementById('btn-agregar-movil');
    const selectMovil = document.getElementById('select-movil');
    const infoMovilSeleccionado = document.getElementById('info-movil-seleccionado');
    const infoPatente = document.getElementById('info-patente');
    const formCargaCombustible = document.getElementById('form-carga-combustible');
    const inputTicket = document.getElementById('input-ticket');
    const inputKilometraje = document.getElementById('input-kilometraje');
    const historialCargas = document.getElementById('historial-cargas');

    // --- Funciones de Móviles (pueden definirse aquí o fuera, pero es más limpio aquí)
    const cargarDatosMoviles = () => {
        const movilesGuardados = localStorage.getItem('movilesSector');
        if (movilesGuardados) {
            moviles = JSON.parse(movilesGuardados);
        }
    };
    const guardarDatosMoviles = () => {
        localStorage.setItem('movilesSector', JSON.stringify(moviles));
    };
    const renderizarDetallesMovil = () => {
        const nombreMovilSeleccionado = selectMovil.value;
        const movil = moviles.find(m => m.nombre === nombreMovilSeleccionado);
        if (movil) {
            infoMovilSeleccionado.style.display = 'block';
            infoPatente.textContent = movil.patente;
            historialCargas.innerHTML = '';
            if (movil.cargasCombustible && movil.cargasCombustible.length > 0) {
                movil.cargasCombustible.slice().reverse().forEach(carga => {
                    const li = document.createElement('li');
                    li.innerHTML = `<strong>Ticket:</strong> ${carga.ticket} - <strong>KM:</strong> ${carga.kilometraje}`;
                    historialCargas.appendChild(li);
                });
            } else {
                historialCargas.innerHTML = '<li>No hay cargas registradas para este móvil.</li>';
            }
        } else {
            infoMovilSeleccionado.style.display = 'none';
        }
    };
    const renderizarSelectMoviles = () => {
        selectMovil.innerHTML = '';
        if (moviles.length > 0) {
            moviles.forEach(movil => {
                const option = document.createElement('option');
                option.value = movil.nombre;
                option.textContent = movil.nombre;
                selectMovil.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.textContent = 'No hay móviles cargados';
            option.disabled = true;
            selectMovil.appendChild(option);
        }
        renderizarDetallesMovil();
    };

    // --- Carga inicial y Event Listeners de Móviles
    cargarDatosMoviles();

    openMovilesModalBtn.addEventListener('click', () => {
        modalMoviles.style.display = 'block';
        renderizarSelectMoviles();
    });

    closeModalMovilesBtn.addEventListener('click', () => {
        modalMoviles.style.display = 'none';
    });
    
    window.addEventListener('click', (event) => {
        if (event.target === modalMoviles) {
            modalMoviles.style.display = 'none';
        }
    });

    btnAgregarMovil.addEventListener('click', () => {
        const nombre = prompt('Ingrese el nombre del nuevo móvil (ej: MOVIL RICCHERI):');
        if (!nombre || nombre.trim() === "") return;
        const patente = prompt(`Ingrese la patente para ${nombre}:`);
        if (!patente || patente.trim() === "") return;
        const nombreNormalizado = nombre.trim().toUpperCase();
        if (moviles.some(m => m.nombre === nombreNormalizado)) {
            mostrarNotificacion('Error: Ya existe un móvil con ese nombre.', 'error');
            return;
        }
        const nuevoMovil = {
            nombre: nombreNormalizado,
            patente: patente.trim().toUpperCase(),
            cargasCombustible: []
        };
        moviles.push(nuevoMovil);
        moviles.sort((a, b) => a.nombre.localeCompare(b.nombre));
        guardarDatosMoviles();
        renderizarSelectMoviles();
        selectMovil.value = nuevoMovil.nombre;
        renderizarDetallesMovil();
        mostrarNotificacion(`Móvil "${nuevoMovil.nombre}" agregado correctamente.`);
    });

    selectMovil.addEventListener('change', renderizarDetallesMovil);

    formCargaCombustible.addEventListener('submit', (e) => {
        e.preventDefault();
        const nombreMovilSeleccionado = selectMovil.value;
        const movil = moviles.find(m => m.nombre === nombreMovilSeleccionado);
        if (!movil) {
            mostrarNotificacion('Error: Por favor, seleccione un móvil válido.', 'error');
            return;
        }
        const ticket = inputTicket.value.trim();
        const kilometraje = inputKilometraje.value;
        if (!ticket || !kilometraje) {
            mostrarNotificacion('Error: Ticket y kilometraje son obligatorios.', 'error');
            return;
        }
        const nuevaCarga = { ticket: ticket, kilometraje: parseInt(kilometraje) };
        movil.cargasCombustible.push(nuevaCarga);
        guardarDatosMoviles();
        renderizarDetallesMovil();
        formCargaCombustible.reset();
        mostrarNotificacion('Carga de combustible registrada.');
    });
    // =========================================================================
    // ============================= FIN DE LA CORRECCIÓN ======================
    // =========================================================================
});
