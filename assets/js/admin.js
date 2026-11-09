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

  var medicos = [];
  var sinRegistro = [];
  var filtro = 'en_revision';
  var filtros = [
    ['en_revision', 'Por revisar', 'Enviaron su registro completo y esperan su revisión.'],
    ['aprobado', 'Aprobados', 'Usted ya los aprobó; falta configurar y probar su asistente de WhatsApp. Cuando esté funcionando, márquelos como activos.'],
    ['activo', 'Activos', 'Su asistente ya está funcionando y recibiendo citas.'],
    ['rechazado', 'Requieren cambios', 'Les pidió corregir algo; esperan que lo reenvíen.'],
    ['borrador', 'Registro incompleto', 'Crearon su cuenta pero no han terminado el formulario (o ni siquiera lo empiezan: «Solo cuenta»). No requieren acción; puede escribirles para animarlos.'],
    ['pausado', 'Pausados', 'Su asistente está detenido temporalmente.'],
    ['todos', 'Todos', 'Todos los médicos registrados.']
  ];

  function fecha(t) { return t ? new Date(t).toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; }

  function pintarFiltros() {
    $('filtros').innerHTML = filtros.map(function (f) {
      var n = f[0] === 'todos' ? medicos.length + sinRegistro.length : medicos.filter(function (m) { return m.estado === f[0]; }).length + (f[0] === 'borrador' ? sinRegistro.length : 0);
      return '<button type="button" data-f="' + f[0] + '" aria-pressed="' + (filtro === f[0]) + '">' + f[1] + ' (' + n + ')</button>';
    }).join('');
    $('filtros').querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { filtro = b.dataset.f; pintar(); });
    });
    var actualF = filtros.find(function (f) { return f[0] === filtro; });
    $('filtro-ayuda').textContent = actualF ? actualF[2] : '';
  }

  function pintar() {
    pintarFiltros();
    var lista = medicos.filter(function (m) { return filtro === 'todos' || m.estado === filtro; });
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
        '<td><span class="estado ' + e.clase + '">' + e.texto + '</span></td></tr>';
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
    var urls = await Promise.all([urlImagen('carnes', m.carne_path), urlImagen('fotos', m.foto_path)]);
    var e = App.estados[m.estado] || App.estados.borrador;
    var fila = function (k, v) { return v ? '<div><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>' : ''; };
    var servicios = (m.servicios || []).map(function (s) { return s.nombre + ' · ' + s.duracion + (s.precio ? ' · L ' + s.precio : ''); }).join('\n');
    var wa = (m.whatsapp_consultorio || '').replace(/\D/g, '');
    $('detalle').innerHTML =
      '<div class="detalle-cabecera"><div><h2 id="det-nombre">' + esc([m.titulo, m.nombre].filter(Boolean).join(' ') || m.correo) + '</h2><span class="estado ' + e.clase + '">' + e.texto + '</span></div><button type="button" class="cerrar" aria-label="Cerrar">×</button></div>' +
      '<div class="imagenes">' +
        '<figure>' + (urls[0] ? '<button type="button" class="ver-imagen" data-src="' + urls[0] + '" aria-label="Ver carné en grande"><img src="' + urls[0] + '" alt="Carné de colegiado"></button>' : '<div class="vacio">Sin carné</div>') + '<figcaption><span>Carné de colegiado</span>' + (urls[0] ? '<button type="button" class="enlace-boton ver-imagen" data-src="' + urls[0] + '">Ver en grande</button>' : '') + '</figcaption></figure>' +
        '<figure>' + (urls[1] ? '<img src="' + urls[1] + '" alt="Foto de perfil">' : '<div class="vacio">Sin foto</div>') + '<figcaption><span>Foto de perfil</span></figcaption></figure>' +
      '</div>' +
      '<section class="caja"><h2>Profesional</h2><dl class="datos">' +
        fila('Correo', m.correo) + fila('Colegiación', m.colegiacion) + fila('Especialidad', m.especialidad === 'Otra' ? m.especialidad_otra : m.especialidad) + fila('Plan', m.plan) + fila('Código del asistente', m.codigo ? m.codigo + '  ·  ' + App.enlacePacientes(m) : (m.estado === 'en_revision' ? 'Se asigna al aprobar' : '')) + fila('Descripción', m.descripcion) +
      '</dl></section>' +
      '<section class="caja"><h2>Consultorio</h2><dl class="datos">' +
        fila('Nombre', m.consultorio) + fila('Dirección', m.direccion) + fila('WhatsApp', m.whatsapp_consultorio) + fila('Teléfono', m.telefono_consultorio) +
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

  cargar();
})();
