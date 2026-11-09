// Simulador del asistente de WhatsApp (solo administradores).
(async function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var sesion = await App.requerirSesion();
  if (!(await App.esAdmin())) { $('cargando').hidden = true; $('sin-permiso').hidden = false; return; }

  var URL_FN = window.AIDU_SB.url + '/functions/v1/asistente/simular';
  var chat = $('chat');
  var ocupado = false;

  // ---------- Médicos para probar ----------
  var r = await App.sb.from('medicos').select('id, titulo, nombre, especialidad, codigo, estado').in('estado', ['aprobado', 'activo']).order('nombre');
  var medicos = (r.data || []).filter(function (m) { return m.codigo; });
  $('medico').innerHTML = medicos.length
    ? medicos.map(function (m) { return '<option value="' + m.codigo + '">' + App.escapar([m.titulo, m.nombre].join(' ') + ' · ' + (m.especialidad || '') + ' (' + m.codigo + ')') + '</option>'; }).join('')
    : '<option value="">No hay médicos aprobados todavía</option>';
  $('empezar').disabled = !medicos.length;

  $('cargando').hidden = true;
  $('panel').hidden = false;

  // ---------- Dibujar mensajes ----------
  function hora() { return new Date().toLocaleTimeString('es-HN', { hour: 'numeric', minute: '2-digit' }); }
  function formato(t) {
    // Negritas *así* y enlaces, como en WhatsApp.
    return App.escapar(t)
      .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/\n/g, '<br>');
  }
  function burbuja(clase, html) {
    var d = document.createElement('div');
    d.className = 'msg ' + clase;
    d.innerHTML = '<div class="burbuja">' + html + '<span class="msg-hora">' + hora() + '</span></div>';
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
    return d;
  }
  function mio(texto) { burbuja('mio', formato(texto)); }

  function suyo(s) {
    if (s.tipo === 'texto') { burbuja('suyo', formato(s.texto)); return; }
    var d = burbuja('suyo', formato(s.texto));
    var acciones = document.createElement('div');
    acciones.className = 'msg-acciones';
    if (s.tipo === 'botones') {
      s.botones.forEach(function (b) {
        var btn = document.createElement('button');
        btn.type = 'button'; btn.textContent = b.titulo;
        btn.addEventListener('click', function () { enviar({ id: b.id }, b.titulo); });
        acciones.appendChild(btn);
      });
    } else {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg> ' + App.escapar(s.boton);
      btn.addEventListener('click', function () { abrirLista(s); });
      acciones.appendChild(btn);
    }
    d.appendChild(acciones);
    chat.scrollTop = chat.scrollHeight;
  }

  function abrirLista(s) {
    $('hoja-titulo').textContent = s.boton;
    $('hoja-cuerpo').innerHTML = s.secciones.map(function (se) {
      return '<div class="hoja-seccion">' + App.escapar(se.titulo) + '</div>' + se.filas.map(function (f) {
        return '<button type="button" class="hoja-fila" data-id="' + App.escapar(f.id) + '" data-titulo="' + App.escapar(f.titulo) + '"><span><strong>' + App.escapar(f.titulo) + '</strong>' + (f.descripcion ? '<small>' + App.escapar(f.descripcion) + '</small>' : '') + '</span><i aria-hidden="true"></i></button>';
      }).join('');
    }).join('');
    $('hoja').hidden = false;
    $('hoja-cuerpo').querySelectorAll('.hoja-fila').forEach(function (b) {
      b.addEventListener('click', function () { $('hoja').hidden = true; enviar({ id: b.dataset.id }, b.dataset.titulo); });
    });
  }
  $('hoja-cerrar').addEventListener('click', function () { $('hoja').hidden = true; });
  $('hoja').addEventListener('click', function (ev) { if (ev.target === this) this.hidden = true; });

  // ---------- Hablar con la función ----------
  async function llamar(cuerpo) {
    var s = (await App.sb.auth.getSession()).data.session;
    var res = await fetch(URL_FN, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + s.access_token, apikey: window.AIDU_SB.anonKey },
      body: JSON.stringify(cuerpo)
    });
    var j = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(j.error || ('Error ' + res.status));
    return j;
  }

  async function enviar(cuerpo, mostrado) {
    if (ocupado) return;
    ocupado = true;
    mio(mostrado || cuerpo.texto);
    var escribiendo = burbuja('suyo escribiendo', '<span class="puntos"><i></i><i></i><i></i></span>');
    try {
      var j = await llamar(cuerpo);
      escribiendo.remove();
      (j.salidas || []).forEach(suyo);
      ponerIA(j.ia);
    } catch (e) {
      escribiendo.remove();
      burbuja('sistema', 'No se pudo conectar con el asistente: ' + App.escapar(e.message));
    } finally {
      ocupado = false;
      $('texto').focus();
    }
  }

  function ponerIA(activa) {
    $('estado-ia').textContent = activa ? 'IA activa: entiende texto libre' : 'IA sin configurar: solo botones y palabras clave';
    $('estado-ia').className = 'estado ' + (activa ? 'estado-verde' : 'estado-ambar');
  }

  $('form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var t = $('texto').value.trim();
    if (!t) return;
    $('texto').value = '';
    enviar({ texto: t });
  });
  $('empezar').addEventListener('click', function () {
    var cod = $('medico').value;
    if (cod) enviar({ texto: 'Hola, quiero una cita (código ' + cod + ')' });
  });
  $('reiniciar').addEventListener('click', async function () {
    if (ocupado) return;
    try { await llamar({ reiniciar: true }); } catch (e) { /* sin conversación previa */ }
    chat.innerHTML = '';
    burbuja('sistema', 'Conversación reiniciada. Ahora el asistente lo trata como un número nuevo.');
  });
  burbuja('sistema', 'Elija un médico y toque «Empezar como paciente», o escriba directamente.');
})();
