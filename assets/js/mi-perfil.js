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
    ? '<strong>' + esc(p.plan) + '</strong><span>' + precios[p.plan] + '</span><span class="ayuda">No cobramos nada hasta aprobar su registro.</span>'
    : '<span class="ayuda">Aún no ha elegido un plan.</span>';

  $('cargando').hidden = true;
  $('perfil').hidden = false;
})();
