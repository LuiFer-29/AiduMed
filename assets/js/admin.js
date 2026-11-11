(async function () {
  'use strict';
  var sb = App.sb;
  var sesion = await App.requerirSesion();
  var $ = function (id) { return document.getElementById(id); };
  var esc = App.escapar;
  $('correo-sesion').textContent = sesion.user.email;
  $('salir').addEventListener('click', App.salir);

  if (!(await App.esAdmin())) { $('cargando').hidden = true; $('sin-permiso').hidden = false; return; }

  // Por seguridad, la sesión de administrador dura 8 horas; después pide la contraseña otra vez.
  var HORAS = 8;
  if (Date.now() - Date.parse(sesion.user.last_sign_in_at || 0) > HORAS * 3600 * 1000) {
    await sb.auth.signOut();
    location.replace('/cuenta?modo=entrar&expirada=1&siguiente=%2Fadmin');
    return;
  }

  // ---------- Menú: Médicos activos / Registros / Vacaciones de cada año ----------
  var medicos = [];
  var sinRegistro = [];
  var FILTROS = {
    borrador: ['Registro incompleto', 'Crearon su cuenta pero no han terminado el formulario (o ni siquiera lo empiezan: «Solo cuenta»). No requieren acción; puede escribirles para animarlos.'],
    en_revision: ['Por revisar', 'Enviaron su registro completo y esperan su revisión.'],
    rechazado: ['Requieren cambios', 'Les pidió corregir algo; esperan que lo reenvíen.'],
    aprobado: ['Aprobados', 'Usted ya los aprobó; falta configurar y probar su asistente de WhatsApp. Cuando esté funcionando, márquelos como activos.'],
    todos: ['Todos', 'Todos los médicos registrados, en cualquier estado.'],
    activo: ['Activos', 'Su asistente ya está funcionando y recibiendo citas. Cualquier cambio aquí debe ser excepcional.'],
    pausado: ['Pausados', 'Su asistente está detenido temporalmente.'],
    fotos: ['Fotos por aprobar', 'Médicos aprobados que subieron una foto de perfil nueva. No se publica hasta que usted la apruebe.']
  };
  // Registros: en el orden en que avanza el proceso. Activos: los que ya operan.
  var PAGINAS = {
    registros: { titulo: 'Registros', filtros: ['borrador', 'en_revision', 'rechazado', 'aprobado', 'todos'], flujo: 4 },
    activos: { titulo: 'Médicos activos', filtros: ['activo', 'pausado', 'fotos'], flujo: 0 }
  };
  var seccion = 'activos';
  var filtro = 'activo';
  function mostrarSeccion() {
    var h = location.hash.replace('#', '');
    if (new URLSearchParams(location.search).get('fotos') && !h) h = 'activos';
    seccion = ['vacaciones', 'registros', 'costos'].indexOf(h) >= 0 ? h : 'activos';
    $('vista-medicos').hidden = seccion === 'vacaciones' || seccion === 'costos';
    $('vista-vacaciones').hidden = seccion !== 'vacaciones';
    $('vista-costos').hidden = seccion !== 'costos';
    document.querySelectorAll('.panel-menu [data-seccion]').forEach(function (a) {
      if (a.dataset.seccion === seccion) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (seccion === 'vacaciones') return;
    if (seccion === 'costos') { if (medicos.length) cargarCostos(); return; }
    $('titulo-medicos').textContent = PAGINAS[seccion].titulo;
    if (new URLSearchParams(location.search).get('fotos') && seccion === 'activos') filtro = 'fotos';
    else filtro = seccion === 'activos' ? 'activo' : (cuenta('en_revision') ? 'en_revision' : 'borrador');
    if (medicos.length || sinRegistro.length) pintar();
  }
  window.addEventListener('hashchange', mostrarSeccion);

  function conFoto() { return medicos.filter(function (m) { return !!m.foto_pendiente_path; }); }
  function fecha(t) { return t ? new Date(t).toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; }

  function cuenta(f) {
    return f === 'todos' ? medicos.length + sinRegistro.length : f === 'fotos' ? conFoto().length
      : medicos.filter(function (m) { return m.estado === f; }).length + (f === 'borrador' ? sinRegistro.length : 0);
  }
  function pintarFiltros() {
    var pag = PAGINAS[seccion] || PAGINAS.activos;
    $('filtros').classList.toggle('filtros-flujo', !!pag.flujo);
    $('filtros').innerHTML = pag.filtros.map(function (f, i) {
      var n = cuenta(f);
      if (f === 'fotos' && !n && filtro !== 'fotos') return '';
      var flecha = pag.flujo && i > 0 && i < pag.flujo ? '<span class="flecha-flujo" aria-hidden="true">›</span>' : '';
      var separador = pag.flujo && i === pag.flujo ? '<span class="separador-flujo" aria-hidden="true"></span>' : '';
      return flecha + separador + '<button type="button" data-f="' + f + '" aria-pressed="' + (filtro === f) + '">' + FILTROS[f][0] + ' (' + n + ')</button>';
    }).join('');
    $('filtros').querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { filtro = b.dataset.f; pintar(); });
    });
    $('filtro-ayuda').textContent = FILTROS[filtro] ? FILTROS[filtro][1] : '';
  }

  function pintar() {
    pintarFiltros();
    var porRevisar = cuenta('en_revision'), fotos = cuenta('fotos');
    $('menu-revisar').textContent = porRevisar; $('menu-revisar').hidden = !porRevisar; $('menu-revisar').title = porRevisar + ' registros por revisar';
    $('menu-fotos').textContent = fotos; $('menu-fotos').hidden = !fotos; $('menu-fotos').title = fotos + (fotos === 1 ? ' foto por aprobar' : ' fotos por aprobar');
    var lista = filtro === 'fotos' ? conFoto() : medicos.filter(function (m) { return filtro === 'todos' || m.estado === filtro; });
    var cuentas = (filtro === 'borrador' || filtro === 'todos') ? sinRegistro : [];
    if (!lista.length && !cuentas.length) { $('filas').innerHTML = '<tr><td colspan="6" class="vacio">No hay médicos en este estado.</td></tr>'; return; }
    $('filas').innerHTML = lista.map(function (m) {
      var e = App.estados[m.estado] || App.estados.borrador;
      return '<tr data-id="' + m.id + '" tabindex="0">' +
        '<td><strong>' + esc([m.titulo, m.nombre].filter(Boolean).join(' ') || m.correo) + '</strong><br><span class="ayuda">' + esc(m.correo) + '</span></td>' +
        '<td>' + esc(m.especialidad === 'Otra' ? m.especialidad_otra : m.especialidad) + '</td>' +
        '<td>' + esc(m.plan) + '</td>' +
        '<td>' + esc(m.whatsapp_consultorio || '—') + '</td>' +
        '<td>' + fecha(m.enviado_at) + '</td>' +
        '<td><span class="estado ' + e.clase + '">' + e.texto + '</span>' + (m.foto_pendiente_path ? '<br><span class="estado estado-ambar" style="margin-top:6px">Foto por aprobar</span>' : '') + '</td></tr>';
    }).join('') + cuentas.map(function (c) {
      // Cuentas que crearon usuario pero aún no guardan el primer paso del formulario (no tienen ficha).
      return '<tr class="fila-cuenta">' +
        '<td><strong>' + esc(c.correo) + '</strong><br><span class="ayuda">' + (c.confirmada ? 'Correo confirmado' : 'Correo sin confirmar') + '</span></td>' +
        '<td colspan="3" class="ayuda">Aún no empieza el formulario de registro.</td>' +
        '<td>' + fecha(c.creada) + '</td>' +
        '<td><span class="estado estado-gris">Solo cuenta</span></td></tr>';
    }).join('');
    $('filas').querySelectorAll('tr[data-id]').forEach(function (tr) {
      var abrir = function () { verDetalle(tr.dataset.id); };
      tr.addEventListener('click', abrir);
      tr.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') abrir(); });
    });
  }

  async function cargar() {
    var r = await sb.from('medicos').select('*').order('enviado_at', { ascending: false, nullsFirst: false });
    if (r.error) { $('cargando').textContent = 'No se pudo cargar la lista: ' + r.error.message; return; }
    medicos = r.data;
    var c = await sb.rpc('cuentas_sin_registro');
    sinRegistro = c.error ? [] : c.data || [];
    $('cargando').hidden = true;
    $('panel').hidden = false;
    mostrarSeccion();
    pintar();
  }

  async function urlImagen(bucket, ruta) {
    if (!ruta) return null;
    var r = await sb.storage.from(bucket).createSignedUrl(ruta, 600);
    return r.error ? null : r.data.signedUrl;
  }

  function cerrar() { $('detalle-fondo').hidden = true; document.body.style.overflow = ''; }
  $('detalle-fondo').addEventListener('click', function (ev) { if (ev.target === this) cerrar(); });
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    if (!$('visor').hidden) cerrarVisor(); else cerrar();
  });

  // ---------- Visor del carné: centrado, con zoom y giro ----------
  var zoom = 1, giro = 0;
  function aplicarVisor() {
    var img = $('visor-img');
    img.style.transform = 'rotate(' + giro + 'deg)';
    img.classList.toggle('ampliada', zoom > 1);
    img.style.width = zoom > 1 ? (zoom * 100) + '%' : '';
    $('visor-zoom').textContent = zoom > 1 ? 'Reducir' : 'Ampliar';
  }
  function abrirVisor(src) {
    zoom = 1; giro = 0;
    $('visor-img').src = src;
    aplicarVisor();
    $('visor').hidden = false;
    $('visor-cerrar').focus();
  }
  function cerrarVisor() { $('visor').hidden = true; }
  $('visor-cerrar').addEventListener('click', cerrarVisor);
  $('visor-zoom').addEventListener('click', function () { zoom = zoom > 1 ? 1 : 2; aplicarVisor(); });
  $('visor-girar').addEventListener('click', function () { giro = (giro + 90) % 360; aplicarVisor(); });
  $('visor').addEventListener('click', function (ev) { if (ev.target === this || ev.target.classList.contains('visor-lienzo')) cerrarVisor(); });

  async function verDetalle(id) {
    var m = medicos.find(function (x) { return x.id === id; });
    if (!m) return;
    var urls = await Promise.all([urlImagen('carnes', m.carne_path), urlImagen('fotos', m.foto_path), urlImagen('fotos', m.foto_pendiente_path)]);
    var e = App.estados[m.estado] || App.estados.borrador;
    var fila = function (k, v) { return v ? '<div><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>' : ''; };
    var servicios = (m.servicios || []).map(function (s) { return s.nombre + ' · ' + s.duracion + (s.precio ? ' · L ' + s.precio : ''); }).join('\n');
    var wa = (m.whatsapp_consultorio || '').replace(/\D/g, '');
    $('detalle').innerHTML =
      '<div class="detalle-cabecera"><div><h2 id="det-nombre">' + esc([m.titulo, m.nombre].filter(Boolean).join(' ') || m.correo) + '</h2><span class="estado ' + e.clase + '">' + e.texto + '</span></div><button type="button" class="cerrar" aria-label="Cerrar">×</button></div>' +
      '<div class="imagenes">' +
        '<figure>' + (urls[0] ? '<button type="button" class="ver-imagen" data-src="' + urls[0] + '" aria-label="Ver carné en grande"><img src="' + urls[0] + '" alt="Carné de colegiado"></button>' : '<div class="vacio">Sin carné</div>') + '<figcaption><span>Carné de colegiado</span>' + (urls[0] ? '<button type="button" class="enlace-boton ver-imagen" data-src="' + urls[0] + '">Ver en grande</button>' : '') + '</figcaption></figure>' +
        '<figure>' + (urls[1] ? '<img src="' + urls[1] + '" alt="Foto de perfil">' : '<div class="vacio">Sin foto</div>') + '<figcaption><span>Foto de perfil' + (urls[2] ? ' (publicada)' : '') + '</span></figcaption></figure>' +
        (urls[2] ? '<figure class="foto-por-aprobar"><img src="' + urls[2] + '" alt="Foto nueva por aprobar"><figcaption><span><strong>Foto nueva por aprobar</strong></span></figcaption>' +
          '<div class="acciones-admin"><button type="button" class="boton boton-primario boton-chico" data-foto="aprobar">Aprobar foto</button><button type="button" class="boton boton-peligro boton-chico" data-foto="rechazar">Rechazar</button></div></figure>' : '') +
      '</div>' +
      '<section class="caja"><h2>Profesional</h2><dl class="datos">' +
        fila('Correo', m.correo) + fila('Colegiación', m.colegiacion) + fila('Especialidad', m.especialidad === 'Otra' ? m.especialidad_otra : m.especialidad) + fila('Plan', m.plan) + fila('Código del asistente', m.codigo ? m.codigo + '  ·  ' + App.enlacePacientes(m) : (m.estado === 'en_revision' ? 'Se asigna al aprobar' : '')) + fila('Descripción', m.descripcion) +
      '</dl></section>' +
      '<section class="caja"><h2>Consultorio</h2><dl class="datos">' +
        fila('Nombre', m.consultorio) + fila('Número de consultorio', m.numero_consultorio) + fila('Dirección', m.direccion) + fila('WhatsApp', m.whatsapp_consultorio) + fila('Teléfono', m.telefono_consultorio) +
        fila('Derivar consultas a', m.derivar_a === 'Otro número' ? m.whatsapp_secretaria : m.derivar_a) +
        (m.ubicacion_gps ? '<div><dt>Ubicación</dt><dd><a href="' + esc(m.ubicacion_gps) + '" target="_blank" rel="noopener">Ver en el mapa</a></dd></div>' : '') +
      '</dl></section>' +
      '<section class="caja"><h2>Servicios y horarios</h2><dl class="datos">' +
        fila('Servicios', servicios) + fila('Días', (m.dias_atencion || []).join(', ')) +
        fila('Horario', m.hora_desde ? String(m.hora_desde).slice(0, 5) + ' a ' + String(m.hora_hasta).slice(0, 5) : '') +
        fila('Entre citas', m.tiempo_entre_citas) + fila('Agenda hasta', m.anticipacion) +
        fila('Vacaciones', (m.vacaciones || []).join(', ')) +
        fila('Otras fechas', (m.otras_vacaciones || []).map(App.rangoFechas).join('\n') || m.otras_fechas) +
        fila('Google Calendar', m.conectar_google_calendar ? 'Quiere conectarlo' : '') +
        fila('Aceptó términos', fecha(m.acepta_terminos_at)) +
      '</dl></section>' +
      '<section class="caja"><h2>Decisión</h2>' +
        '<label class="campo">Nota para el médico (obligatoria al pedir cambios o pausar; se incluye en el correo)<textarea id="nota">' + esc(m.nota_admin || '') + '</textarea></label>' +
        '<div class="acciones-admin">' +
          (wa ? '<a class="boton boton-secundario boton-chico" href="https://wa.me/504' + wa.slice(-8) + '" target="_blank" rel="noopener">Escribir por WhatsApp</a>' : '') +
          '<button type="button" class="boton boton-primario boton-chico" data-estado="aprobado">Aprobar</button>' +
          '<button type="button" class="boton boton-secundario boton-chico" data-estado="activo">Marcar activo</button>' +
          '<button type="button" class="boton boton-secundario boton-chico" data-estado="pausado">Pausar</button>' +
          '<button type="button" class="boton boton-peligro boton-chico" data-estado="rechazado">Pedir cambios</button>' +
        '</div><p class="mensaje" id="msg-det" hidden></p>' +
      '</section>';
    $('detalle').querySelector('.cerrar').addEventListener('click', cerrar);
    $('detalle').querySelectorAll('.ver-imagen').forEach(function (b) { b.addEventListener('click', function () { abrirVisor(b.dataset.src); }); });
    $('detalle').querySelectorAll('[data-foto]').forEach(function (b) {
      b.addEventListener('click', async function () {
        var aprobar = b.dataset.foto === 'aprobar';
        b.disabled = true;
        var cambios = aprobar ? { foto_path: m.foto_pendiente_path, foto_pendiente_path: null, foto_rechazada_at: null } : { foto_pendiente_path: null, foto_rechazada_at: new Date().toISOString() };
        var r = await sb.from('medicos').update(cambios).eq('id', m.id).select().single();
        if (r.error) { b.disabled = false; alert('No se pudo guardar: ' + r.error.message); return; }
        Object.assign(m, r.data);
        pintar();
        verDetalle(m.id);
      });
    });
    $('detalle').querySelectorAll('[data-estado]').forEach(function (b) {
      b.addEventListener('click', async function () {
        var nuevo = b.dataset.estado;
        var nota = $('nota').value.trim();
        var msg = $('msg-det');
        var conNota = nuevo === 'rechazado' || nuevo === 'pausado';
        if (conNota && !nota) { msg.className = 'mensaje error'; msg.textContent = nuevo === 'pausado' ? 'Escriba el motivo de la pausa; se lo enviaremos al médico.' : 'Escriba una nota explicando qué debe corregir.'; msg.hidden = false; $('nota').focus(); return; }
        b.disabled = true;
        var r = await sb.from('medicos').update({ estado: nuevo, nota_admin: conNota ? nota : null }).eq('id', m.id).select().single();
        b.disabled = false;
        if (r.error) { msg.className = 'mensaje error'; msg.textContent = r.error.message; msg.hidden = false; return; }
        Object.assign(m, r.data);
        msg.className = 'mensaje ok'; msg.textContent = 'Estado actualizado: ' + App.estados[nuevo].texto + '.'; msg.hidden = false;
        pintar();
        setTimeout(function () { verDetalle(m.id); }, 900);
      });
    });
    $('detalle-fondo').hidden = false;
    document.body.style.overflow = 'hidden';
    $('detalle').querySelector('.cerrar').focus();
  }

  // ---------- Vacaciones de cada año (tabla feriados) ----------
  var feriados = [], anioVa = new Date().getFullYear();
  var anios = [anioVa, anioVa + 1, anioVa + 2];
  var fechaCorta = function (t) {
    if (!t) return '';
    var x = String(t).split('-'), m = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return +x[2] + ' ' + m[+x[1] - 1] + ' ' + x[0];
  };
  var etiquetas = { fijada: ['Guardada', 'estado-verde'], calculada: ['Calculada automáticamente', 'estado-azul'], pendiente: ['Falta definir', 'estado-rojo'] };
  async function cargarFeriados() {
    var r = await sb.from('feriados').select('id, nombre, desde, hasta').order('desde');
    feriados = r.error ? [] : r.data || [];
    pintarFeriados();
  }
  function pintarFeriados() {
    var proximo = App.vacacionDelAnio('Semana Morazánica', new Date().getFullYear() + 1, feriados).fuente === 'pendiente';
    $('menu-vacaciones').hidden = !proximo; $('menu-vacaciones').title = 'Falta definir la Semana Morazánica del próximo año';
    $('va-anios').innerHTML = anios.map(function (a) {
      var falta = App.vacacionDelAnio('Semana Morazánica', a, feriados).fuente === 'pendiente';
      return '<button type="button" role="tab" aria-selected="' + (a === anioVa) + '" data-anio="' + a + '">' + a + (falta ? ' <span class="punto-rojo" title="Falta la Semana Morazánica"></span>' : '') + '</button>';
    }).join('');
    $('va-anios').querySelectorAll('[data-anio]').forEach(function (b) {
      b.addEventListener('click', function () { anioVa = +b.dataset.anio; $('va-msg').hidden = true; pintarFeriados(); });
    });
    $('va-form').innerHTML = App.VACACIONES_FIJAS.map(function (nombre, i) {
      var v = App.vacacionDelAnio(nombre, anioVa, feriados), e = etiquetas[v.fuente];
      return '<div class="va-fila"><div class="va-nombre"><strong>' + esc(nombre) + '</strong><span class="estado ' + e[1] + '">' + e[0] + '</span></div>' +
        '<label class="campo">Desde<input type="date" data-i="' + i + '" data-c="desde" value="' + (v.desde || '') + '"></label>' +
        '<label class="campo">Hasta<input type="date" data-i="' + i + '" data-c="hasta" value="' + (v.hasta || '') + '"></label></div>';
    }).join('') + '<div class="va-pie"><button type="submit" class="boton boton-primario boton-chico">Guardar fechas de ' + anioVa + '</button>' +
      '<span class="ayuda">Al guardar, el asistente usa estas fechas desde ese momento.</span></div>';
  }
  $('va-form').addEventListener('submit', async function (ev) {
    ev.preventDefault();
    var msg = $('va-msg'), filas = [];
    for (var i = 0; i < App.VACACIONES_FIJAS.length; i++) {
      var d = this.querySelector('[data-i="' + i + '"][data-c="desde"]').value, h = this.querySelector('[data-i="' + i + '"][data-c="hasta"]').value;
      if (!d && !h) continue;
      if (!d || !h || h < d) { msg.className = 'mensaje error'; msg.textContent = 'Revise las fechas de ' + App.VACACIONES_FIJAS[i] + ': necesita «Desde» y «Hasta», y «Hasta» no puede ser antes de «Desde».'; msg.hidden = false; return; }
      if (Number(d.slice(0, 4)) !== anioVa) { msg.className = 'mensaje error'; msg.textContent = 'La fecha «Desde» de ' + App.VACACIONES_FIJAS[i] + ' debe ser del año ' + anioVa + '.'; msg.hidden = false; return; }
      filas.push({ nombre: App.VACACIONES_FIJAS[i], desde: d, hasta: h });
    }
    var b = this.querySelector('[type=submit]'); b.disabled = true;
    // Reemplaza las fechas de ese año para estas tres vacaciones.
    var borrar = feriados.filter(function (f) { return App.VACACIONES_FIJAS.indexOf(f.nombre) >= 0 && Number(String(f.desde).slice(0, 4)) === anioVa; }).map(function (f) { return f.id; });
    var r = borrar.length ? await sb.from('feriados').delete().in('id', borrar) : { error: null };
    if (!r.error && filas.length) r = await sb.from('feriados').insert(filas);
    b.disabled = false;
    if (r.error) { msg.className = 'mensaje error'; msg.textContent = 'No se pudo guardar: ' + r.error.message; msg.hidden = false; return; }
    await cargarFeriados();
    msg.className = 'mensaje ok'; msg.textContent = 'Fechas de ' + anioVa + ' guardadas: ' + filas.map(function (f) { return f.nombre + ' (' + fechaCorta(f.desde) + ' – ' + fechaCorta(f.hasta) + ')'; }).join(' · ') + '.'; msg.hidden = false;
  });

  // ---------- Costos y uso ----------
  var PRECIOS = { 'Piloto fundador': 29, 'Básico': 49, 'Profesional': 99 };
  var GRATIS_SERVICIO = 1000;
  var co = { moneda: 'USD', tasa: 26.5, tarifa: 0.0113, datos: null, gastos: [], mes: null, cargando: false };
  var hoyYM = function () { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Tegucigalpa' }).format(new Date()).slice(0, 7); };
  var nombreMes = function (ym, corto) {
    var t = new Date(ym + '-15T12:00:00Z').toLocaleDateString('es-HN', { month: corto ? 'short' : 'long', year: corto ? '2-digit' : 'numeric', timeZone: 'UTC' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  };
  var dinero = function (usd, dec) {
    var v = co.moneda === 'HNL' ? usd * co.tasa : usd, d = dec != null ? dec : (Math.abs(v) < 10 ? 2 : 0);
    return (co.moneda === 'HNL' ? 'L ' : '$') + v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  };
  (function () {
    var opciones = [], ym = hoyYM();
    for (var i = 0; i < 12; i++) {
      var d = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7) - 1 - i, 1));
      opciones.push(d.toISOString().slice(0, 7));
    }
    $('co-mes').innerHTML = opciones.map(function (o) { return '<option value="' + o + '">' + nombreMes(o) + '</option>'; }).join('');
    co.mes = ym;
  })();
  $('co-mes').addEventListener('change', function () { co.mes = this.value; cargarCostos(); });
  document.querySelectorAll('[data-moneda]').forEach(function (b) {
    b.addEventListener('click', function () {
      co.moneda = b.dataset.moneda;
      document.querySelectorAll('[data-moneda]').forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); });
      pintarCostos();
    });
  });
  $('co-tasa').addEventListener('input', function () { $('co-guardar-tasa').hidden = false; });
  $('co-guardar-tasa').addEventListener('click', async function () {
    var t = Number($('co-tasa').value);
    if (!(t > 1)) return;
    var r = await sb.from('ajustes').upsert({ clave: 'tasa_hnl', valor: t, actualizado_at: new Date().toISOString() });
    if (r.error) { alert('No se pudo guardar la tasa: ' + r.error.message); return; }
    co.tasa = t; this.hidden = true; pintarCostos();
  });

  async function cargarCostos() {
    if (co.cargando) return;
    co.cargando = true;
    $('co-tarjetas').innerHTML = '<p class="ayuda">Cargando…</p>';
    try {
      var aj = await sb.from('ajustes').select('clave, valor');
      (aj.data || []).forEach(function (a) { if (a.clave === 'tasa_hnl') co.tasa = Number(a.valor) || co.tasa; if (a.clave === 'tarifa_whatsapp_usd') co.tarifa = Number(a.valor) || co.tarifa; });
      $('co-tasa').value = co.tasa;
      var g = await sb.from('gastos').select('*').order('fecha', { ascending: false });
      co.gastos = g.data || [];
      var s = (await sb.auth.getSession()).data.session;
      var res = await fetch(window.AIDU_SB.url + '/functions/v1/asistente/costos', {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + s.access_token, apikey: window.AIDU_SB.anonKey },
        body: JSON.stringify({ hasta: co.mes, meses: 6 })
      });
      var j = await res.json();
      if (!res.ok) throw new Error(j.error || res.status);
      co.datos = j;
      pintarCostos();
    } catch (e) {
      $('co-tarjetas').innerHTML = '<p class="mensaje error">No se pudieron cargar los costos: ' + esc(e.message || e) + '</p>';
    }
    co.cargando = false;
  }

  function gastosDelMes(ym) {
    var ini = ym + '-01', a = +ym.slice(0, 4), m = +ym.slice(5, 7);
    var fin = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
    return co.gastos.filter(function (x) {
      if (!x.mensual) return x.fecha >= ini && x.fecha <= fin;
      return x.fecha <= fin && (!x.hasta || x.hasta >= ini);
    }).reduce(function (t, x) { return t + (Number(x.monto_usd) || 0); }, 0);
  }
  function resumenMes(ym) {
    var d = co.datos.porMes[ym] || { citas: 0, servicio: 0, plantilla: 0, ia: 0, medicos: {} };
    var real = co.datos.meta && !co.datos.meta.error && co.datos.meta.porMes[ym] != null;
    var whatsapp = real ? co.datos.meta.porMes[ym] : co.tarifa * (d.plantilla + Math.max(0, d.servicio - GRATIS_SERVICIO));
    var operativos = gastosDelMes(ym);
    // Ingreso: planes de los médicos activos que ya estaban activos ese mes.
    var finMes = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 1, 6)).toISOString();
    var ingreso = medicos.filter(function (m) { return m.estado === 'activo' && (m.revisado_at || m.created_at || '') < finMes; }).reduce(function (t, m) { return t + (PRECIOS[m.plan] || 0); }, 0);
    var total = whatsapp + d.ia + operativos;
    return { d: d, real: real, whatsapp: whatsapp, ia: d.ia, operativos: operativos, total: total, ingreso: ingreso, margen: ingreso - total };
  }

  function pintarCostos() {
    if (!co.datos) return;
    var r = resumenMes(co.mes), d = r.d;
    var mensajes = d.servicio + d.plantilla, gratis = Math.max(0, GRATIS_SERVICIO - d.servicio);
    var tarjeta = function (titulo, valor, detalle, clase) {
      return '<div class="tarjeta-costo' + (clase ? ' ' + clase : '') + '"><span>' + titulo + '</span><strong>' + valor + '</strong>' + (detalle ? '<small>' + detalle + '</small>' : '') + '</div>';
    };
    $('co-tarjetas').innerHTML =
      tarjeta('Citas agendadas', d.citas.toLocaleString('en-US'), nombreMes(co.mes)) +
      tarjeta('Mensajes enviados', mensajes.toLocaleString('en-US'), d.servicio + ' de servicio · ' + d.plantilla + ' plantillas<br>Gratis restantes: ' + gratis + ' de ' + GRATIS_SERVICIO) +
      tarjeta('WhatsApp', dinero(r.whatsapp), r.real ? 'Costo real según Meta' : 'Estimado (' + dinero(co.tarifa, 4) + ' por mensaje)') +
      tarjeta('IA (Claude)', dinero(r.ia), r.ia ? '' : 'Aún sin uso') +
      tarjeta('Gastos operativos', dinero(r.operativos), 'Registrados abajo') +
      tarjeta('Gasto total', dinero(r.total), d.citas ? dinero(r.total / d.citas, 2) + ' por cita' : '', 'destacada') +
      tarjeta('Ingreso esperado', dinero(r.ingreso), 'Planes de los médicos activos') +
      tarjeta('Margen', dinero(r.margen), r.ingreso ? Math.round(r.margen / r.ingreso * 100) + ' % del ingreso' : '', r.margen < 0 ? 'negativa' : 'positiva');
    // Avisos
    var avisos = [];
    if (d.servicio >= GRATIS_SERVICIO * 0.8) avisos.push('Van ' + d.servicio + ' de los ' + GRATIS_SERVICIO + ' mensajes de servicio gratis de este mes.');
    if (co.datos.meta && co.datos.meta.error) avisos.push('No pudimos leer el costo real de Meta (' + esc(co.datos.meta.error) + '). Se muestra un estimado.');
    var filas = pintarMedicos(r);
    filas.bajos.forEach(function (n) { avisos.push(esc(n) + ' deja un margen menor al 50 % este mes.'); });
    $('co-avisos').innerHTML = avisos.map(function (a) { return '<div class="aviso-costo">' + a + '</div>'; }).join('');
    $('menu-costos').hidden = !avisos.length;
    pintarGrafica();
    pintarGastos();
  }

  function pintarMedicos(r) {
    var d = r.d, totalMsg = d.servicio + d.plantilla, porMsg = totalMsg ? r.whatsapp / totalMsg : 0, bajos = [];
    var ids = Object.keys(d.medicos || {});
    medicos.forEach(function (m) { if (m.estado === 'activo' && ids.indexOf(m.id) < 0) ids.push(m.id); });
    var filas = ids.map(function (id) {
      var u = d.medicos[id] || { citas: 0, servicio: 0, plantilla: 0, ia: 0 }, m = medicos.find(function (x) { return x.id === id; }) || {};
      var msgs = u.servicio + u.plantilla, costo = msgs * porMsg + u.ia, ingreso = m.estado === 'activo' ? (PRECIOS[m.plan] || 0) : 0, margen = ingreso - costo;
      if (ingreso && margen / ingreso < 0.5) bajos.push([m.titulo, m.nombre].filter(Boolean).join(' '));
      return { m: m, u: u, msgs: msgs, costo: costo, ingreso: ingreso, margen: margen };
    }).sort(function (a, b) { return b.costo - a.costo; });
    $('co-medicos').innerHTML = filas.length ? filas.map(function (f) {
      return '<tr><td><strong>' + esc([f.m.titulo, f.m.nombre].filter(Boolean).join(' ') || 'Médico') + '</strong></td><td>' + esc(f.m.plan || '—') + '</td>' +
        '<td class="num">' + f.u.citas + '</td><td class="num">' + f.msgs + '</td><td class="num">' + dinero(f.costo, 2) + '</td>' +
        '<td class="num">' + (f.u.citas ? dinero(f.costo / f.u.citas, 3) : '—') + '</td><td class="num">' + dinero(f.ingreso) + '</td>' +
        '<td class="num ' + (f.ingreso && f.margen / f.ingreso < 0.5 ? 'margen-bajo' : '') + '">' + (f.ingreso ? Math.round(f.margen / f.ingreso * 100) + ' %' : '—') + '</td></tr>';
    }).join('') : '<tr><td colspan="8" class="vacio">Sin actividad este mes.</td></tr>';
    return { bajos: bajos };
  }

  function pintarGrafica() {
    var meses = co.datos.meses, datos = meses.map(function (ym) { var r = resumenMes(ym); return { ym: ym, gasto: r.total, ingreso: r.ingreso }; });
    var max = Math.max.apply(null, datos.map(function (x) { return Math.max(x.gasto, x.ingreso); }).concat([1])) * (co.moneda === 'HNL' ? co.tasa : 1);
    var W = 720, H = 220, base = 180, ancho = W / meses.length, barra = Math.min(28, ancho / 3);
    var y = function (usd) { return base - (usd * (co.moneda === 'HNL' ? co.tasa : 1)) / max * 150; };
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Gasto e ingreso por mes">' +
      '<line x1="0" x2="' + W + '" y1="' + base + '" y2="' + base + '" stroke="#DCE3E0"/>' +
      datos.map(function (x, i) {
        var cx = ancho * i + ancho / 2;
        return '<rect x="' + (cx - barra - 2) + '" y="' + y(x.gasto) + '" width="' + barra + '" height="' + (base - y(x.gasto)) + '" rx="4" fill="#E0703A"><title>Gasto ' + dinero(x.gasto) + '</title></rect>' +
          '<rect x="' + (cx + 2) + '" y="' + y(x.ingreso) + '" width="' + barra + '" height="' + (base - y(x.ingreso)) + '" rx="4" fill="#0B6E5F"><title>Ingreso ' + dinero(x.ingreso) + '</title></rect>' +
          '<text x="' + cx + '" y="' + (base + 20) + '" text-anchor="middle" font-size="13" fill="#4A5A57">' + nombreMes(x.ym, true) + '</text>' +
          (x.gasto ? '<text x="' + (cx - barra / 2 - 2) + '" y="' + (y(x.gasto) - 6) + '" text-anchor="middle" font-size="11" fill="#4A5A57">' + dinero(x.gasto) + '</text>' : '') +
          (x.ingreso ? '<text x="' + (cx + barra / 2 + 2) + '" y="' + (y(x.ingreso) - 6) + '" text-anchor="middle" font-size="11" fill="#4A5A57">' + dinero(x.ingreso) + '</text>' : '');
      }).join('') + '</svg>';
    $('co-grafica').innerHTML = svg;
    $('co-leyenda').innerHTML = '<span class="punto-leyenda" style="background:#E0703A"></span>Gasto <span class="punto-leyenda" style="background:#0B6E5F"></span>Ingreso esperado';
  }

  function pintarGastos() {
    $('co-gastos').innerHTML = co.gastos.length ? co.gastos.map(function (g) {
      return '<tr data-id="' + g.id + '">' +
        '<td><input type="date" data-c="fecha" value="' + esc(g.fecha) + '"></td>' +
        '<td><input type="text" data-c="concepto" value="' + esc(g.concepto) + '" placeholder="Ej.: Dominio aidumed.app"></td>' +
        '<td><input type="text" data-c="categoria" value="' + esc(g.categoria || '') + '" placeholder="Ej.: Servicios" list="co-categorias"></td>' +
        '<td class="num"><input type="number" step="0.01" min="0" data-c="monto_usd" value="' + esc(g.monto_usd) + '"></td>' +
        '<td><input type="checkbox" data-c="mensual"' + (g.mensual ? ' checked' : '') + ' aria-label="Mensual"></td>' +
        '<td><input type="date" data-c="hasta" value="' + esc(g.hasta || '') + '"' + (g.mensual ? '' : ' disabled') + '></td>' +
        '<td><button type="button" class="papelera" data-borrar-gasto aria-label="Eliminar gasto" title="Eliminar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button></td></tr>';
    }).join('') + '<datalist id="co-categorias"><option>Servicios</option><option>Dominio</option><option>Publicidad</option><option>Comisiones</option><option>Viáticos</option><option>Otros</option></datalist>'
      : '<tr><td colspan="7" class="vacio">Aún no ha registrado gastos. Use «+ Agregar gasto».</td></tr>';
    $('co-gastos').querySelectorAll('tr[data-id]').forEach(function (tr) {
      var id = +tr.dataset.id;
      tr.querySelectorAll('[data-c]').forEach(function (inp) {
        inp.addEventListener('change', async function () {
          var c = inp.dataset.c, v = inp.type === 'checkbox' ? inp.checked : inp.value;
          if (c === 'monto_usd') v = Number(v) || 0;
          if ((c === 'hasta' || c === 'fecha') && !v) v = null;
          if (c === 'concepto' && !String(v).trim()) { inp.value = co.gastos.find(function (g) { return g.id === id; }).concepto; return; }
          var cambio = {}; cambio[c] = v;
          if (c === 'mensual' && !v) cambio.hasta = null;
          var r = await sb.from('gastos').update(cambio).eq('id', id).select().single();
          if (r.error) { avisoGasto('No se pudo guardar: ' + r.error.message, true); return; }
          co.gastos = co.gastos.map(function (g) { return g.id === id ? r.data : g; });
          avisoGasto('Guardado.', false);
          pintarCostos();
        });
      });
      tr.querySelector('[data-borrar-gasto]').addEventListener('click', async function () {
        var g = co.gastos.find(function (x) { return x.id === id; });
        if (!confirm('¿Eliminar el gasto «' + g.concepto + '»?')) return;
        var r = await sb.from('gastos').delete().eq('id', id);
        if (r.error) { avisoGasto('No se pudo eliminar: ' + r.error.message, true); return; }
        co.gastos = co.gastos.filter(function (x) { return x.id !== id; });
        pintarCostos();
      });
    });
  }
  function avisoGasto(t, error) { var m = $('co-msg'); m.className = 'mensaje ' + (error ? 'error' : 'ok'); m.textContent = t; m.hidden = false; setTimeout(function () { m.hidden = true; }, 2500); }
  $('co-agregar').addEventListener('click', async function () {
    var r = await sb.from('gastos').insert({ fecha: co.mes + (co.mes === hoyYM() ? '-' + new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Tegucigalpa' }).format(new Date()).slice(8, 10) : '-01'), concepto: 'Nuevo gasto', monto_usd: 0 }).select().single();
    if (r.error) { avisoGasto('No se pudo agregar: ' + r.error.message, true); return; }
    co.gastos.unshift(r.data);
    pintarCostos();
    var inp = $('co-gastos').querySelector('tr[data-id="' + r.data.id + '"] [data-c="concepto"]');
    if (inp) { inp.focus(); inp.select(); }
  });

  cargar();
  cargarFeriados();
})();
