(async function () {
  'use strict';
  var sesion = await App.requerirSesion();
  var $ = function (id) { return document.getElementById(id); };
  var esc = App.escapar;
  $('correo-sesion').textContent = sesion.user.email;
  $('salir').addEventListener('click', App.salir);

  var p = null;
  try { p = await App.miPerfil(sesion.user.id); } catch (e) { console.error(e); }
  if (!p) { location.replace('/registro'); return; }

  if (new URLSearchParams(location.search).get('guardado')) {
    $('aviso-guardado').hidden = false;
    history.replaceState(null, '', '/mi-perfil');
    setTimeout(function () { $('aviso-guardado').hidden = true; }, 5000);
  }

  // ---------- Encabezado ----------
  var textos = {
    borrador: 'Su registro está incompleto. Termínelo para que podamos revisarlo.',
    en_revision: 'Estamos verificando su colegiación. Le escribiremos por WhatsApp en las próximas 24 horas.',
    aprobado: 'Su registro fue aprobado. Estamos configurando su asistente y le contactaremos para probarlo juntos.',
    rechazado: 'Necesitamos que corrija algunos datos. Revise la nota abajo y vuelva a enviar su registro.',
    activo: 'Su asistente está funcionando. Puede actualizar sus horarios y servicios cuando quiera.',
    pausado: 'Su asistente está en pausa. Escríbanos a info@aidu.pro para reactivarlo.'
  };
  var est = App.estados[p.estado] || App.estados.borrador;
  $('saludo').textContent = [p.titulo, p.nombre].filter(Boolean).join(' ') || 'Mi perfil';
  $('especialidad').textContent = [p.especialidad === 'Otra' ? p.especialidad_otra : p.especialidad, p.consultorio].filter(Boolean).join(' · ');
  $('sello').hidden = !(p.estado === 'aprobado' || p.estado === 'activo');
  $('estado').textContent = est.texto;
  $('estado').className = 'estado ' + est.clase;
  $('estado-texto').textContent = textos[p.estado] || '';
  if (p.estado === 'borrador' || p.estado === 'rechazado') {
    $('editar').textContent = p.estado === 'borrador' ? 'Continuar registro' : 'Corregir y reenviar';
    $('editar').hidden = false;
  }
  if (p.nota_admin && (p.estado === 'rechazado' || p.estado === 'pausado')) {
    $('nota-admin').textContent = (p.estado === 'pausado' ? 'Motivo de la pausa: ' : 'Nota del equipo de Aidú Med: ') + p.nota_admin;
    $('nota-admin').hidden = false;
  }
  if (p.foto_path) {
    var url = App.sb.storage.from('fotos').getPublicUrl(p.foto_path).data.publicUrl + '?t=' + Date.parse(p.updated_at);
    $('foto').innerHTML = '<img src="' + esc(url) + '" alt="">';
  }
  // Mientras el registro no se ha enviado, los "Editar" de cada tarjeta llevan al registro completo.
  if (p.estado === 'borrador' || p.estado === 'rechazado') {
    document.querySelectorAll('.editar-enlace').forEach(function (a) { a.hidden = true; });
  }

  // ---------- Servicios ----------
  var servicios = p.servicios || [];
  $('servicios').innerHTML = servicios.length ? servicios.map(function (s) {
    return '<li><span class="srv-nombre">' + esc(s.nombre) + '</span>' +
      '<span class="srv-duracion"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>' + esc(s.duracion || '') + '</span>' +
      '<span class="srv-precio">' + (s.precio ? 'L ' + App.miles(s.precio) : '<span class="ayuda">Sin precio</span>') + '</span></li>';
  }).join('') : '<li class="vacio-lista">Todavía no ha agregado servicios.</li>';

  // ---------- Horario ----------
  var dias = [['Lunes', 'Lun'], ['Martes', 'Mar'], ['Miércoles', 'Mié'], ['Jueves', 'Jue'], ['Viernes', 'Vie'], ['Sábado', 'Sáb'], ['Domingo', 'Dom']];
  var activos = p.dias_atencion || [];
  $('semana').innerHTML = dias.map(function (d) {
    var on = activos.indexOf(d[0]) >= 0;
    return '<span class="dia-chip' + (on ? ' on' : '') + '" title="' + d[0] + (on ? ': atiende' : ': no atiende') + '">' + d[1] + '</span>';
  }).join('');
  var h = function (t) {
    if (!t) return '';
    var x = String(t).slice(0, 5).split(':'), hr = +x[0];
    return (hr % 12 || 12) + ':' + x[1] + ' ' + (hr < 12 ? 'a. m.' : 'p. m.');
  };
  $('horario').textContent = p.hora_desde ? h(p.hora_desde) + ' – ' + h(p.hora_hasta) : 'Sin horario';
  var dato = function (k, v) { return v ? '<div><dt>' + esc(k) + '</dt><dd>' + v + '</dd></div>' : ''; };
  $('reglas').innerHTML = dato('Tiempo entre citas', esc(p.tiempo_entre_citas)) + dato('Se puede agendar hasta', esc(p.anticipacion)) +
    dato('Almuerzo', p.almuerzo_desde && p.almuerzo_hasta ? h(p.almuerzo_desde) + ' – ' + h(p.almuerzo_hasta) : '') +
    dato('Google Calendar', p.conectar_google_calendar ? 'Quiere conectarlo' : '');

  // ---------- Vacaciones ----------
  var vac = p.vacaciones || [];
  $('vacaciones').innerHTML = vac.length ? vac.map(function (v) { return '<span class="chip">' + esc(v) + '</span>'; }).join('') : '<span class="ayuda">Sin vacaciones fijas.</span>';
  var otras = p.otras_vacaciones || [];
  var hoy = new Date().toISOString().slice(0, 10);
  $('otras-fechas').innerHTML = otras.map(function (r) {
    var pasada = (r.hasta || r.desde) < hoy;
    return '<li' + (pasada ? ' class="pasada"' : '') + '><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>' + esc(App.rangoFechas(r)) + (pasada ? ' <span class="ayuda">(ya pasó)</span>' : '') + '</li>';
  }).join('') + (p.otras_fechas && !otras.length ? '<li>' + esc(p.otras_fechas) + '</li>' : '');

  // ---------- Consultorio ----------
  var mapa = p.ubicacion_gps ? '<a href="' + esc(p.ubicacion_gps) + '" target="_blank" rel="noopener">Ver en el mapa</a>' : '<span class="ayuda">Sin ubicación en el mapa</span>';
  $('consultorio').innerHTML = dato('Nombre', esc(p.consultorio)) + dato('Dirección', esc(p.direccion) + '<br>' + mapa) +
    dato('WhatsApp', esc(p.whatsapp_consultorio)) + dato('Teléfono', esc(p.telefono_consultorio)) +
    dato('Consultas que el asistente no resuelve', esc(p.derivar_a === 'Otro número' ? 'Van al ' + (p.whatsapp_secretaria || '') : (p.derivar_a ? 'Van al WhatsApp del consultorio' : '')));

  // ---------- Profesional ----------
  $('profesional').innerHTML = dato('Colegiación', esc(p.colegiacion)) + dato('Correo', esc(p.correo || sesion.user.email)) + dato('Descripción', esc(p.descripcion));

  // ---------- Plan ----------
  var precios = { 'Piloto fundador': '$29 al mes, por 6 meses', 'Básico': '$49 al mes', 'Profesional': '$99 al mes' };
  $('plan').innerHTML = p.plan && precios[p.plan]
    ? '<strong>' + esc(p.plan) + '</strong><span>' + precios[p.plan] + '</span>' + (p.estado === 'aprobado' || p.estado === 'activo' || p.estado === 'pausado' ? '' : '<span class="ayuda">No cobramos nada hasta aprobar su registro.</span>')
    : '<span class="ayuda">Aún no ha elegido un plan.</span>';

  // ---------- Enlace y QR para pacientes ----------
  if (p.codigo && (p.estado === 'aprobado' || p.estado === 'activo' || p.estado === 'pausado')) {
    var enlace = App.enlacePacientes(p.codigo);
    $('caja-enlace').hidden = false;
    $('codigo').textContent = p.codigo;
    $('enlace').value = enlace;
    if (p.estado !== 'activo') $('enlace-ayuda').textContent = 'Su enlace funcionará cuando su asistente esté activo. Ya puede preparar sus tarjetas o letreros.';
    $('copiar').addEventListener('click', async function () {
      try { await navigator.clipboard.writeText(enlace); } catch (e) { $('enlace').select(); document.execCommand('copy'); }
      $('copiar').textContent = '¡Copiado!';
      setTimeout(function () { $('copiar').textContent = 'Copiar'; }, 2000);
    });
    if (window.qrcode) {
      var qr = window.qrcode(0, 'M'); qr.addData(enlace); qr.make();
      var lienzo = $('qr'), ctx = lienzo.getContext('2d'), n = qr.getModuleCount(), margen = 4;
      var tam = 220, celda = tam / (n + margen * 2);
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, tam, tam);
      ctx.fillStyle = '#10211F';
      for (var fy = 0; fy < n; fy++) for (var fx = 0; fx < n; fx++) {
        if (qr.isDark(fy, fx)) ctx.fillRect(Math.floor((fx + margen) * celda), Math.floor((fy + margen) * celda), Math.ceil(celda), Math.ceil(celda));
      }
      $('descargar-qr').addEventListener('click', function () {
        // Versión grande para imprimir.
        var g = document.createElement('canvas'), G = 1200, c2 = g.getContext('2d'), cel = G / (n + margen * 2);
        g.width = G; g.height = G;
        c2.fillStyle = '#FFFFFF'; c2.fillRect(0, 0, G, G); c2.fillStyle = '#10211F';
        for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (qr.isDark(y, x)) c2.fillRect(Math.floor((x + margen) * cel), Math.floor((y + margen) * cel), Math.ceil(cel), Math.ceil(cel));
        var a = document.createElement('a');
        a.href = g.toDataURL('image/png'); a.download = 'aidu-med-qr-' + p.codigo + '.png'; a.click();
      });
    }
  }

  // ---------- Mis citas ----------
  var TZ = 'America/Tegucigalpa';
  var diaLocal = function (d) { return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d); };
  var horaLocal = function (d) { return new Intl.DateTimeFormat('es-HN', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true }).format(d).replace(/\s*a\.?\s*m\.?/i, ' a. m.').replace(/\s*p\.?\s*m\.?/i, ' p. m.'); };
  var fechaTitulo = function (dia) {
    var hoy = diaLocal(new Date()), manana = diaLocal(new Date(Date.now() + 86400000));
    var larga = new Intl.DateTimeFormat('es-HN', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(dia + 'T12:00:00-06:00'));
    larga = larga.charAt(0).toUpperCase() + larga.slice(1);
    return dia === hoy ? 'Hoy · ' + larga : dia === manana ? 'Mañana · ' + larga : larga;
  };
  var vista = 'proximas', citas = [];

  async function cargarCitas() {
    var ahora = new Date();
    var q = App.sb.from('citas').select('id, inicio, fin, servicio, duracion_min, estado, nombre_paciente, cancelada_por, paciente_confirmo_at, pacientes(telefono, nombre)').eq('medico_id', p.id);
    if (vista === 'proximas') q = q.eq('estado', 'confirmada').gte('fin', ahora.toISOString()).order('inicio').limit(200);
    else q = q.lt('inicio', ahora.toISOString()).gte('inicio', new Date(ahora.getTime() - 60 * 86400000).toISOString()).order('inicio', { ascending: false }).limit(150);
    var r = await q;
    if (r.error) { $('lista-citas').innerHTML = '<p class="mensaje error">No se pudieron cargar sus citas.</p>'; return; }
    citas = r.data || [];
    pintarCitas();
  }

  function estadoCita(c) {
    if (c.estado === 'cancelada') return '<span class="estado estado-gris">Cancelada' + (c.cancelada_por === 'paciente' ? ' por el paciente' : c.cancelada_por === 'consultorio' ? ' por el consultorio' : '') + '</span>';
    if (c.estado === 'completada') return '<span class="estado estado-verde">Asistió</span>';
    if (c.estado === 'no_asistio') return '<span class="estado estado-rojo">No asistió</span>';
    if (vista === 'anteriores') return '<span class="acciones-cita"><button type="button" class="mini" data-marcar="completada" data-id="' + c.id + '">Asistió</button><button type="button" class="mini" data-marcar="no_asistio" data-id="' + c.id + '">No asistió</button></span>';
    return (c.paciente_confirmo_at ? '<span class="estado estado-verde">Confirmó</span>' : '');
  }

  function pintarCitas() {
    var hoy = diaLocal(new Date());
    if (vista === 'proximas') {
      var nHoy = citas.filter(function (c) { return diaLocal(new Date(c.inicio)) === hoy; }).length;
      var semana = citas.filter(function (c) { return new Date(c.inicio) - new Date() < 7 * 86400000; }).length;
      $('resumen-citas').textContent = citas.length ? 'Hoy: ' + nHoy + (nHoy === 1 ? ' cita' : ' citas') + ' · Próximos 7 días: ' + semana : '';
    } else {
      $('resumen-citas').textContent = 'Últimos 60 días. Marque si el paciente asistió para llevar su control.';
    }
    if (!citas.length) {
      $('lista-citas').innerHTML = '<div class="vacio-citas">' + (vista === 'proximas'
        ? '<strong>Aún no tiene citas próximas.</strong><span>' + (p.estado === 'activo' ? 'Comparta su enlace con sus pacientes para que empiecen a agendar.' : 'Cuando su asistente esté activo, aquí verá cada cita que agenden sus pacientes.') + '</span>'
        : '<strong>Sin citas en los últimos 60 días.</strong>') + '</div>';
      return;
    }
    var grupos = {}, orden = [];
    citas.forEach(function (c) { var d = diaLocal(new Date(c.inicio)); if (!grupos[d]) { grupos[d] = []; orden.push(d); } grupos[d].push(c); });
    $('lista-citas').innerHTML = orden.map(function (d) {
      return '<div class="dia-citas"><h3>' + esc(fechaTitulo(d)) + '</h3><ul>' + grupos[d].map(function (c) {
        var tel = c.pacientes && c.pacientes.telefono, real = tel && !/^sim/.test(tel);
        return '<li class="cita' + (c.estado === 'cancelada' ? ' cancelada' : '') + '">' +
          '<div class="cita-hora"><strong>' + esc(horaLocal(new Date(c.inicio))) + '</strong><span>' + esc(c.duracion_min) + ' min</span></div>' +
          '<div class="cita-info"><strong>' + esc(c.nombre_paciente || (c.pacientes && c.pacientes.nombre) || 'Paciente') + '</strong><span>' + esc(c.servicio) + (tel && /^sim/.test(tel) ? ' · <em>prueba</em>' : '') + '</span></div>' +
          '<div class="cita-acciones">' + estadoCita(c) +
            (real ? '<a class="mini" href="https://wa.me/' + esc(tel) + '" target="_blank" rel="noopener" aria-label="Escribir al paciente por WhatsApp">WhatsApp</a>' : '') +
            (vista === 'proximas' ? '<button type="button" class="mini peligro" data-cancelar="' + c.id + '">Cancelar</button>' : '') +
          '</div></li>';
      }).join('') + '</ul></div>';
    }).join('');
    $('lista-citas').querySelectorAll('[data-cancelar]').forEach(function (b) {
      b.addEventListener('click', function () { confirmarCancelacion(b); });
    });
    $('lista-citas').querySelectorAll('[data-marcar]').forEach(function (b) {
      b.addEventListener('click', async function () {
        b.disabled = true;
        var r = await App.sb.rpc('marcar_cita', { p_cita: b.dataset.id, p_estado: b.dataset.marcar });
        if (r.error) { b.disabled = false; alert('No se pudo guardar. Intente de nuevo.'); return; }
        var c = citas.find(function (x) { return x.id === b.dataset.id; }); if (c) c.estado = b.dataset.marcar;
        pintarCitas();
      });
    });
  }

  function confirmarCancelacion(b) {
    var caja = b.parentNode;
    var antes = caja.innerHTML;
    caja.innerHTML = '<span class="pregunta-cancelar">¿Cancelar esta cita? Le avisaremos al paciente.</span><button type="button" class="mini peligro" data-si>Sí, cancelar</button><button type="button" class="mini" data-no>No</button>';
    caja.querySelector('[data-no]').addEventListener('click', function () { pintarCitas(); });
    caja.querySelector('[data-si]').addEventListener('click', async function () {
      this.disabled = true;
      var r = await App.sb.rpc('cancelar_cita', { p_cita: b.dataset.cancelar });
      if (r.error) { caja.innerHTML = antes; alert('No se pudo cancelar: ' + App.traducirError(r.error)); return; }
      citas = citas.filter(function (x) { return x.id !== b.dataset.cancelar; });
      pintarCitas();
    });
  }

  document.querySelectorAll('.pestanas-mini button').forEach(function (b) {
    b.addEventListener('click', function () {
      vista = b.dataset.vista;
      document.querySelectorAll('.pestanas-mini button').forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); });
      $('lista-citas').innerHTML = '<p class="ayuda">Cargando citas…</p>';
      cargarCitas();
    });
  });
  if (p.estado === 'borrador' || p.estado === 'rechazado' || p.estado === 'en_revision') $('caja-citas').hidden = true;
  else cargarCitas();

  $('cargando').hidden = true;
  $('perfil').hidden = false;
})();
