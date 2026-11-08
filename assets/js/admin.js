(async function () {
  'use strict';
  var sb = App.sb;
  var sesion = await App.requerirSesion();
  var $ = function (id) { return document.getElementById(id); };
  var esc = App.escapar;
  $('correo-sesion').textContent = sesion.user.email;
  $('salir').addEventListener('click', App.salir);

  if (!(await App.esAdmin())) { $('cargando').hidden = true; $('sin-permiso').hidden = false; return; }

  var medicos = [];
  var filtro = 'en_revision';
  var filtros = [['en_revision', 'Por revisar'], ['aprobado', 'En configuración'], ['activo', 'Activos'], ['rechazado', 'Requieren cambios'], ['borrador', 'Sin terminar'], ['pausado', 'Pausados'], ['todos', 'Todos']];

  function fecha(t) { return t ? new Date(t).toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; }

  function pintarFiltros() {
    $('filtros').innerHTML = filtros.map(function (f) {
      var n = f[0] === 'todos' ? medicos.length : medicos.filter(function (m) { return m.estado === f[0]; }).length;
      return '<button type="button" data-f="' + f[0] + '" aria-pressed="' + (filtro === f[0]) + '">' + f[1] + ' (' + n + ')</button>';
    }).join('');
    $('filtros').querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { filtro = b.dataset.f; pintar(); });
    });
  }

  function pintar() {
    pintarFiltros();
    var lista = medicos.filter(function (m) { return filtro === 'todos' || m.estado === filtro; });
    if (!lista.length) { $('filas').innerHTML = '<tr><td colspan="6" class="vacio">No hay médicos en este estado.</td></tr>'; return; }
    $('filas').innerHTML = lista.map(function (m) {
      var e = App.estados[m.estado] || App.estados.borrador;
      return '<tr data-id="' + m.id + '" tabindex="0">' +
        '<td><strong>' + esc([m.titulo, m.nombre].filter(Boolean).join(' ') || m.correo) + '</strong><br><span class="ayuda">' + esc(m.correo) + '</span></td>' +
        '<td>' + esc(m.especialidad === 'Otra' ? m.especialidad_otra : m.especialidad) + '</td>' +
        '<td>' + esc(m.plan) + '</td>' +
        '<td>' + esc(m.whatsapp_consultorio || '—') + '</td>' +
        '<td>' + fecha(m.enviado_at) + '</td>' +
        '<td><span class="estado ' + e.clase + '">' + e.texto + '</span></td></tr>';
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
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') cerrar(); });

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
        '<figure>' + (urls[0] ? '<a href="' + urls[0] + '" target="_blank" rel="noopener"><img src="' + urls[0] + '" alt="Carné de colegiado"></a>' : '<div class="vacio">Sin carné</div>') + '<figcaption><span>Carné de colegiado</span>' + (urls[0] ? '<a href="' + urls[0] + '" target="_blank" rel="noopener">Abrir</a>' : '') + '</figcaption></figure>' +
        '<figure>' + (urls[1] ? '<img src="' + urls[1] + '" alt="Foto de perfil">' : '<div class="vacio">Sin foto</div>') + '<figcaption><span>Foto de perfil</span></figcaption></figure>' +
      '</div>' +
      '<section class="caja"><h2>Profesional</h2><dl class="datos">' +
        fila('Correo', m.correo) + fila('Colegiación', m.colegiacion) + fila('Especialidad', m.especialidad === 'Otra' ? m.especialidad_otra : m.especialidad) + fila('Plan', m.plan) + fila('Descripción', m.descripcion) +
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
        fila('Vacaciones', (m.vacaciones || []).join(', ') + (m.otras_fechas ? '\n' + m.otras_fechas : '')) +
        fila('Google Calendar', m.conectar_google_calendar ? 'Quiere conectarlo' : '') +
        fila('Aceptó términos', fecha(m.acepta_terminos_at)) +
      '</dl></section>' +
      '<section class="caja"><h2>Decisión</h2>' +
        '<label class="campo">Nota para el médico (se muestra si pide cambios)<textarea id="nota">' + esc(m.nota_admin || '') + '</textarea></label>' +
        '<div class="acciones-admin">' +
          (wa ? '<a class="boton boton-secundario boton-chico" href="https://wa.me/504' + wa.slice(-8) + '" target="_blank" rel="noopener">Escribir por WhatsApp</a>' : '') +
          '<button type="button" class="boton boton-primario boton-chico" data-estado="aprobado">Aprobar</button>' +
          '<button type="button" class="boton boton-secundario boton-chico" data-estado="activo">Marcar activo</button>' +
          '<button type="button" class="boton boton-secundario boton-chico" data-estado="pausado">Pausar</button>' +
          '<button type="button" class="boton boton-peligro boton-chico" data-estado="rechazado">Pedir cambios</button>' +
        '</div><p class="mensaje" id="msg-det" hidden></p>' +
      '</section>';
    $('detalle').querySelector('.cerrar').addEventListener('click', cerrar);
    $('detalle').querySelectorAll('[data-estado]').forEach(function (b) {
      b.addEventListener('click', async function () {
        var nuevo = b.dataset.estado;
        var nota = $('nota').value.trim();
        var msg = $('msg-det');
        if (nuevo === 'rechazado' && !nota) { msg.className = 'mensaje error'; msg.textContent = 'Escriba una nota explicando qué debe corregir.'; msg.hidden = false; return; }
        b.disabled = true;
        var r = await sb.from('medicos').update({ estado: nuevo, nota_admin: nota || null }).eq('id', m.id).select().single();
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
