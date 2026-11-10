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

  var URL_PANEL = window.AIDU_SB.url + '/functions/v1/asistente/panel';
  async function panel(cuerpo) {
    var s = (await App.sb.auth.getSession()).data.session;
    var res = await fetch(URL_PANEL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + s.access_token, apikey: window.AIDU_SB.anonKey },
      body: JSON.stringify(cuerpo)
    });
    var j = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(j.error || ('Error ' + res.status));
    return j;
  }
  async function recargarPerfil() { p = await App.miPerfil(sesion.user.id); }

  if (new URLSearchParams(location.search).get('guardado')) {
    $('aviso-guardado').hidden = false;
    history.replaceState(null, '', '/mi-perfil#configuracion');
    setTimeout(function () { $('aviso-guardado').hidden = true; }, 5000);
  }

  if ((p.estado === 'borrador' || p.estado === 'rechazado') && App.vigilarRegistro(sesion)) return;
  var conCitas = !(p.estado === 'borrador' || p.estado === 'rechazado' || p.estado === 'en_revision');
  var aprobado = p.estado === 'aprobado' || p.estado === 'activo' || p.estado === 'pausado';
  var urlFoto = function (ruta) { return App.sb.storage.from('fotos').getPublicUrl(ruta).data.publicUrl + '?t=' + Date.parse(p.updated_at); };
  var ICONO_PERSONA = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>';

  // ---------- Menú: Mis citas / Configuración ----------
  function mostrarSeccion(s) {
    if (!conCitas) s = 'configuracion';
    $('vista-citas').hidden = s !== 'citas';
    $('vista-configuracion').hidden = s !== 'configuracion';
    document.querySelectorAll('.panel-menu [data-seccion]').forEach(function (a) {
      if (a.dataset.seccion === s) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  $('menu').hidden = !conCitas;
  $('perfil').classList.toggle('sin-menu', !conCitas);
  window.addEventListener('hashchange', function () { mostrarSeccion(location.hash === '#configuracion' ? 'configuracion' : 'citas'); });
  mostrarSeccion(location.hash === '#configuracion' ? 'configuracion' : 'citas');

  // ---------- Encabezado ----------
  var textos = {
    borrador: 'Su registro está incompleto. Termínelo para que podamos revisarlo.',
    en_revision: 'Estamos verificando su colegiación. Le escribiremos por WhatsApp en las próximas 24 horas.',
    aprobado: 'Su registro fue aprobado. Estamos configurando su asistente y le contactaremos para probarlo juntos.',
    rechazado: 'Necesitamos que corrija algunos datos. Revise la nota abajo y vuelva a enviar su registro.',
    activo: 'Su asistente está funcionando. Puede actualizar sus horarios y servicios cuando quiera.',
    pausado: 'Su asistente está en pausa. Escríbanos a info@aidu.pro para reactivarlo.'
  };
  function pintarEncabezado() {
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
    $('foto').innerHTML = p.foto_path ? '<img src="' + esc(urlFoto(p.foto_path)) + '" alt="">' : ICONO_PERSONA;
  }
  pintarEncabezado();
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
  var avisos = { 30: '30 minutos antes', 60: '1 hora antes', 120: '2 horas antes', 240: '4 horas antes', 1440: '1 día antes' };
  $('reglas').innerHTML = dato('Anticipación mínima para agendar', p.aviso_minimo_min ? esc(avisos[p.aviso_minimo_min] || p.aviso_minimo_min + ' min antes')
      : '<span class="texto-error">Sin definir. Mientras tanto usamos 1 hora. Defínala en «Editar».</span>') +
    dato('Tiempo entre citas', esc(p.tiempo_entre_citas)) + dato('Se puede agendar hasta', esc(p.anticipacion)) +
    dato('Almuerzo', p.almuerzo_desde && p.almuerzo_hasta ? h(p.almuerzo_desde) + ' – ' + h(p.almuerzo_hasta) : '') +
    dato('Google Calendar', p.conectar_google_calendar ? 'Quiere conectarlo' : '');

  // ---------- Vacaciones y días libres ----------
  var TZ = 'America/Tegucigalpa';
  var diaLocal = function (d) { return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d); };
  var ICONO_CAL = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>';
  var ICONO_BASURA = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';
  function pintarVacaciones() {
    var vac = p.vacaciones || [];
    $('vacaciones').innerHTML = vac.length ? vac.map(function (v) { return '<span class="chip">' + esc(v) + '</span>'; }).join('') : '<span class="ayuda">Sin vacaciones fijas.</span>';
    var otras = p.otras_vacaciones || [];
    var hoy = diaLocal(new Date());
    // Solo fechas de hoy en adelante: las que ya pasaron desaparecen de la lista.
    $('otras-fechas').innerHTML = otras.map(function (r, i) {
      if ((r.hasta || r.desde) < hoy) return '';
      var motivo = r.motivo ? '<span class="fecha-motivo">' + esc(r.motivo) + '</span>' : '';
      return '<li>' + ICONO_CAL + '<span class="fecha-texto">' + esc(App.rangoFechas({ desde: r.desde, hasta: r.hasta })) + motivo + '</span>' +
        '<button type="button" class="papelera" data-borrar="' + i + '" aria-label="Eliminar ' + esc(App.rangoFechas({ desde: r.desde, hasta: r.hasta })) + '" title="Eliminar">' + ICONO_BASURA + '</button></li>';
    }).join('');
    $('otras-fechas').querySelectorAll('[data-borrar]').forEach(function (b) {
      b.addEventListener('click', function () {
        var li = b.parentNode, i = +b.dataset.borrar, antes = li.innerHTML;
        li.classList.add('confirmando');
        li.innerHTML = '<span class="fecha-texto">¿Eliminar ' + esc(App.rangoFechas(otras[i])) + '? El asistente volverá a ofrecer ese día.</span><span class="acciones-cita"><button type="button" class="mini peligro" data-si>Sí, eliminar</button><button type="button" class="mini" data-no>No</button></span>';
        li.querySelector('[data-no]').addEventListener('click', function () { li.classList.remove('confirmando'); pintarVacaciones(); });
        li.querySelector('[data-si]').addEventListener('click', async function () {
          this.disabled = true;
          var nuevas = otras.filter(function (_, j) { return j !== i; });
          var r = await App.sb.from('medicos').update({ otras_vacaciones: nuevas }).eq('id', p.id).select().single();
          if (r.error) { li.innerHTML = antes; alert('No se pudo eliminar. Intente de nuevo.'); return; }
          p = r.data;
          pintarVacaciones();
          if (vista === 'proximas' && conCitas) cargarCitas();
        });
      });
    });
  }
  pintarVacaciones();

  // ---------- Agregar una fecha sin consulta (formulario siempre vacío) ----------
  $('abrir-fecha').addEventListener('click', function () {
    var f = $('form-fecha'); f.reset(); $('nf-error').hidden = true;
    $('nf-desde').min = $('nf-hasta').min = diaLocal(new Date());
    f.hidden = false; this.hidden = true; $('nf-desde').focus();
  });
  $('nf-cancelar').addEventListener('click', function () { $('form-fecha').reset(); $('form-fecha').hidden = true; $('abrir-fecha').hidden = false; });
  $('nf-desde').addEventListener('change', function () { $('nf-hasta').min = this.value || diaLocal(new Date()); });
  $('form-fecha').addEventListener('submit', async function (ev) {
    ev.preventDefault();
    var err = function (t) { $('nf-error').textContent = t; $('nf-error').hidden = false; };
    var desde = $('nf-desde').value, hasta = $('nf-hasta').value || desde, motivo = $('nf-motivo').value.trim();
    var hoy = diaLocal(new Date());
    if (!desde) return err('Elija la fecha.');
    if (desde < hoy) return err('Esa fecha ya pasó.');
    if (hasta < desde) return err('La fecha «Hasta» debe ser igual o posterior a «Desde».');
    $('nf-error').hidden = true;
    var rango = { desde: desde, hasta: hasta, motivo: motivo || null };
    var afectadas = await App.citasEnFechas(p.id, [rango]);
    var decision = afectadas.length ? await App.preguntarCitas(afectadas) : null;
    if (decision === 'volver') return;
    var b = $('nf-guardar'); b.disabled = true; b.textContent = 'Guardando…';
    // Se guardan solo las fechas vigentes más la nueva (las pasadas se limpian).
    var vigentes = (p.otras_vacaciones || []).filter(function (r) { return (r.hasta || r.desde) >= hoy; });
    var r = await App.sb.from('medicos').update({ otras_vacaciones: vigentes.concat([rango]).sort(function (a, c) { return a.desde < c.desde ? -1 : 1; }) }).eq('id', p.id).select().single();
    if (!r.error && decision === 'cancelar') {
      var c = await App.sb.rpc('cancelar_citas_fechas', { p_desde: desde, p_hasta: hasta });
      if (c.error) r = c;
    }
    b.disabled = false; b.textContent = 'Guardar fecha';
    if (r.error) return err('No se pudo guardar: ' + App.traducirError(r.error));
    if (r.data && r.data.id) p = r.data; else await recargarPerfil();
    $('form-fecha').reset(); $('form-fecha').hidden = true; $('abrir-fecha').hidden = false;
    pintarVacaciones();
    if (conCitas) cargarCitas();
  });

  // ---------- Consultorio ----------
  var mapa = p.ubicacion_gps ? '<a href="' + esc(p.ubicacion_gps) + '" target="_blank" rel="noopener">Ver en el mapa</a>' : '<span class="ayuda">Sin ubicación en el mapa</span>';
  $('consultorio').innerHTML = dato('Nombre', esc(p.consultorio)) +
    dato('Número de consultorio', p.numero_consultorio ? esc(p.numero_consultorio) : '<span class="ayuda">Sin número. Agréguelo en «Editar» para que el botón «Atender» le diga al paciente a dónde pasar.</span>') +
    dato('Dirección', esc(p.direccion) + '<br>' + mapa) +
    dato('WhatsApp', esc(p.whatsapp_consultorio)) + dato('Teléfono', esc(p.telefono_consultorio)) +
    dato('Consultas que el asistente no resuelve', esc(p.derivar_a === 'Otro número' ? 'Van al ' + (p.whatsapp_secretaria || '') : (p.derivar_a ? 'Van al WhatsApp del consultorio' : '')));

  // ---------- Profesional ----------
  $('profesional').innerHTML = dato('Colegiación', esc(p.colegiacion)) + dato('Correo', esc(p.correo || sesion.user.email)) + dato('Descripción', esc(p.descripcion));

  // ---------- Plan ----------
  var precios = { 'Piloto fundador': '$29 al mes, por 6 meses', 'Básico': '$49 al mes', 'Profesional': '$99 al mes' };
  $('plan').innerHTML = p.plan && precios[p.plan]
    ? '<strong>' + esc(p.plan) + '</strong><span>' + precios[p.plan] + '</span>' + (aprobado ? '' : '<span class="ayuda">No cobramos nada hasta aprobar su registro.</span>')
    : '<span class="ayuda">Aún no ha elegido un plan.</span>';

  // ---------- Foto de perfil ----------
  function pintarFoto() {
    $('foto-actual').innerHTML = p.foto_path ? '<img src="' + esc(urlFoto(p.foto_path)) + '" alt="Su foto actual">' : ICONO_PERSONA;
    var t = '';
    if (p.foto_pendiente_path) {
      t = '<div class="foto-pendiente"><img src="' + esc(urlFoto(p.foto_pendiente_path)) + '" alt="Foto nueva en revisión"><div><span class="estado estado-ambar">En revisión</span>' +
        '<p class="ayuda">La publicaremos en cuanto la revisemos, normalmente el mismo día.</p></div></div>';
    } else if (p.foto_rechazada_at) {
      t = '<p class="ayuda texto-error">Su última foto no fue aprobada. Suba otra de frente, con buena luz y sin otras personas.</p>';
    } else {
      t = '<p class="ayuda">Use una foto de frente, con buena luz.' + (aprobado ? ' Revisamos cada foto antes de publicarla.' : '') + '</p>';
    }
    $('foto-texto').innerHTML = t;
  }
  pintarFoto();

  function comprimir(archivo) {
    return new Promise(function (resolver) {
      var comun = /^image\/(jpeg|png|webp)$/.test(archivo.type);
      if (comun && archivo.size < 900000) { resolver(archivo); return; }
      var img = new Image();
      img.onload = function () {
        var escala = Math.min(1, 1600 / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * escala); c.height = Math.round(img.height * escala);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { resolver(b ? new File([b], 'imagen.jpg', { type: 'image/jpeg' }) : archivo); }, 'image/jpeg', 0.82);
      };
      img.onerror = function () { resolver(archivo); };
      img.src = URL.createObjectURL(archivo);
    });
  }
  function avisar(id, tipo, texto) { var m = $(id); m.className = 'mensaje ' + tipo; m.textContent = texto; m.hidden = !texto; }

  $('nueva-foto').addEventListener('change', async function () {
    var input = this, archivo = input.files && input.files[0];
    if (!archivo) return;
    avisar('foto-msg', 'ok', 'Subiendo foto…');
    try {
      archivo = await comprimir(archivo);
      var ext = { 'image/png': 'png', 'image/webp': 'webp' }[archivo.type] || 'jpg';
      var ruta = p.id + '/perfil-' + Date.now() + '.' + ext;
      var up = await App.sb.storage.from('fotos').upload(ruta, archivo, { contentType: archivo.type || 'image/jpeg' });
      if (up.error) throw up.error;
      var r = await App.sb.from('medicos').update({ foto_path: ruta }).eq('id', p.id).select().single();
      if (r.error) throw r.error;
      p = r.data;
      pintarFoto(); pintarEncabezado();
      avisar('foto-msg', 'ok', p.foto_pendiente_path ? 'Listo. Le avisaremos cuando su foto nueva esté publicada.' : 'Foto actualizada.');
    } catch (e) {
      console.error(e);
      avisar('foto-msg', 'error', 'No se pudo subir la foto. Intente con otra imagen (JPG o PNG).');
    }
    input.value = '';
  });

  // ---------- Contraseña ----------
  $('correo-cuenta').textContent = sesion.user.email;
  document.querySelectorAll('[data-ver]').forEach(function (b) {
    b.addEventListener('click', function () {
      var i = $(b.dataset.ver), ver = i.type === 'password';
      i.type = ver ? 'text' : 'password'; b.textContent = ver ? 'Ocultar' : 'Mostrar';
    });
  });
  $('abrir-clave').addEventListener('click', function () { $('form-clave').hidden = false; this.hidden = true; avisar('clave-msg', 'ok', ''); $('clave-actual').focus(); });
  $('cancelar-clave').addEventListener('click', function () { $('form-clave').reset(); $('form-clave').hidden = true; $('abrir-clave').hidden = false; avisar('clave-msg', 'ok', ''); });
  $('form-clave').addEventListener('submit', async function (ev) {
    ev.preventDefault();
    var actual = $('clave-actual').value, nueva = $('clave-nueva').value, otra = $('clave-repetir').value;
    if (nueva.length < 8) return avisar('clave-msg', 'error', 'La contraseña nueva debe tener al menos 8 caracteres.');
    if (nueva !== otra) return avisar('clave-msg', 'error', 'Las dos contraseñas nuevas no coinciden.');
    if (nueva === actual) return avisar('clave-msg', 'error', 'La contraseña nueva debe ser distinta de la actual.');
    var b = $('guardar-clave'); b.disabled = true;
    var ok = await App.sb.auth.signInWithPassword({ email: sesion.user.email, password: actual });
    if (ok.error) { b.disabled = false; return avisar('clave-msg', 'error', 'La contraseña actual no es correcta.'); }
    var r = await App.sb.auth.updateUser({ password: nueva });
    b.disabled = false;
    if (r.error) return avisar('clave-msg', 'error', App.traducirError(r.error));
    $('form-clave').reset(); $('form-clave').hidden = true; $('abrir-clave').hidden = false;
    avisar('clave-msg', 'ok', 'Contraseña actualizada. Úsela la próxima vez que entre.');
  });

  // ---------- Enlace y QR para pacientes ----------
  function cargarImagen(src) {
    return new Promise(function (ok) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { ok(null); }; i.src = src; });
  }
  function redondeado(c, x, y, w, hh, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + hh, r); c.arcTo(x + w, y + hh, x, y + hh, r);
    c.arcTo(x, y + hh, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  // Dibuja el QR (con corrección de errores alta) y la Ú de Aidú en el centro.
  function dibujarQR(c, qr, x, y, tam, icono) {
    var n = qr.getModuleCount(), margen = 2, celda = tam / (n + margen * 2);
    c.fillStyle = '#FFFFFF'; c.fillRect(x, y, tam, tam);
    c.fillStyle = '#10211F';
    for (var fy = 0; fy < n; fy++) for (var fx = 0; fx < n; fx++) {
      if (qr.isDark(fy, fx)) c.fillRect(x + Math.floor((fx + margen) * celda), y + Math.floor((fy + margen) * celda), Math.ceil(celda), Math.ceil(celda));
    }
    if (icono) {
      var lado = tam * 0.22, fondo = lado + celda * 2, cx = x + tam / 2, cy = y + tam / 2;
      c.fillStyle = '#FFFFFF'; redondeado(c, cx - fondo / 2, cy - fondo / 2, fondo, fondo, fondo * 0.24); c.fill();
      c.save(); redondeado(c, cx - lado / 2, cy - lado / 2, lado, lado, lado * 0.22); c.clip();
      c.drawImage(icono, cx - lado / 2, cy - lado / 2, lado, lado); c.restore();
    }
  }
  function lineas(c, texto, ancho) {
    var palabras = String(texto).split(' '), out = [], l = '';
    palabras.forEach(function (w) { var t = l ? l + ' ' + w : w; if (c.measureText(t).width > ancho && l) { out.push(l); l = w; } else l = t; });
    if (l) out.push(l);
    return out;
  }
  function descargar(lienzo, nombre) {
    var a = document.createElement('a'); a.href = lienzo.toDataURL('image/png'); a.download = nombre; a.click();
  }

  if (p.codigo && aprobado) {
    var enlace = App.enlacePacientes(p);
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
      var qr = window.qrcode(0, 'H'); qr.addData(enlace); qr.make();
      var icono = await cargarImagen('/assets/img/icono-512.png');
      var lienzo = $('qr');
      dibujarQR(lienzo.getContext('2d'), qr, 0, 0, lienzo.width, icono);
      $('descargar-qr').addEventListener('click', function () {
        var g = document.createElement('canvas'); g.width = g.height = 1200;
        dibujarQR(g.getContext('2d'), qr, 0, 0, 1200, icono);
        descargar(g, 'aidu-med-qr-' + p.codigo + '.png');
      });
      $('descargar-tarjeta').addEventListener('click', async function () {
        // Tarjeta de 12 × 17 cm a 300 ppp, para imprimir o poner en la sala de espera.
        await (document.fonts && document.fonts.ready);
        var W = 1400, H = 2000, g = document.createElement('canvas'), c = g.getContext('2d');
        g.width = W; g.height = H;
        var logo = await cargarImagen('/assets/img/logo-aidu-med-blanco.png');
        var grad = c.createLinearGradient(0, 0, W, 0); grad.addColorStop(0, '#2DBE7E'); grad.addColorStop(1, '#0B6E5F');
        c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, W, H);
        c.fillStyle = grad; c.fillRect(0, 0, W, 640);
        // Logo grande y protagonista; debajo, el mensaje en una línea.
        if (logo) c.drawImage(logo, (W - 760) / 2, 70, 760, 760 * logo.height / logo.width);
        c.textAlign = 'center'; c.fillStyle = '#FFFFFF';
        c.font = '800 70px "Baloo Chettan 2", sans-serif';
        c.fillText('Agenda tu cita por WhatsApp', W / 2, 345);
        c.fillStyle = 'rgba(255,255,255,.88)';
        c.font = '600 44px "Plus Jakarta Sans", sans-serif';
        c.fillText('Rápido, fácil y a cualquier hora', W / 2, 420);
        // QR sobre tarjeta blanca con sombra.
        var Q = 800, qx = (W - Q) / 2, qy = 540;
        c.save(); c.shadowColor = 'rgba(16,33,31,.18)'; c.shadowBlur = 50; c.shadowOffsetY = 16;
        c.fillStyle = '#FFFFFF'; redondeado(c, qx - 50, qy - 50, Q + 100, Q + 100, 56); c.fill(); c.restore();
        dibujarQR(c, qr, qx, qy, Q, icono);
        c.fillStyle = '#4A5A57'; c.font = '600 44px "Plus Jakarta Sans", sans-serif';
        c.fillText('Escanéalo con la cámara de tu celular', W / 2, qy + Q + 135);
        c.fillStyle = '#10211F'; c.font = '800 84px "Baloo Chettan 2", sans-serif';
        var nombre = [p.titulo, p.nombre].filter(Boolean).join(' '), yy = qy + Q + 270;
        lineas(c, nombre, W - 200).forEach(function (l) { c.fillText(l, W / 2, yy); yy += 92; });
        c.fillStyle = '#0B6E5F'; c.font = '700 50px "Plus Jakarta Sans", sans-serif';
        var esp = p.especialidad === 'Otra' ? p.especialidad_otra : p.especialidad;
        if (esp) { c.fillText(esp, W / 2, yy); yy += 70; }
        c.fillStyle = '#4A5A57'; c.font = '500 42px "Plus Jakarta Sans", sans-serif';
        var lugar = [p.numero_consultorio ? 'Consultorio ' + p.numero_consultorio : '', p.consultorio].filter(Boolean).join(' · ');
        if (lugar) lineas(c, lugar, W - 200).slice(0, 2).forEach(function (l) { c.fillText(l, W / 2, yy); yy += 56; });
        c.fillStyle = '#E3F1EE'; c.fillRect(0, H - 120, W, 120);
        c.fillStyle = '#08493F'; c.font = '700 38px "Plus Jakarta Sans", sans-serif';
        c.fillText('Asistente de citas · aidumed.app', W / 2, H - 46);
        descargar(g, 'aidu-med-tarjeta-' + p.codigo + '.png');
      });
    }
  }

  // ---------- Mis citas ----------
  var horaLocal = function (d) { return new Intl.DateTimeFormat('es-HN', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true }).format(d).replace(/\s*a\.?\s*m\.?/i, ' a. m.').replace(/\s*p\.?\s*m\.?/i, ' p. m.'); };
  var fechaTitulo = function (dia) {
    var hoy = diaLocal(new Date()), manana = diaLocal(new Date(Date.now() + 86400000));
    var larga = new Intl.DateTimeFormat('es-HN', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(dia + 'T12:00:00-06:00'));
    larga = larga.charAt(0).toUpperCase() + larga.slice(1);
    return dia === hoy ? 'Hoy · ' + larga : dia === manana ? 'Mañana · ' + larga : larga;
  };
  var sumarDia = function (dia, n) { var d = new Date(dia + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  var vista = 'proximas', citas = [], cerrados = {};

  async function cargarCitas() {
    var ahora = new Date();
    var q = App.sb.from('citas').select('id, inicio, fin, servicio, duracion_min, estado, nombre_paciente, cancelada_por, paciente_confirmo_at, llamado_at, pacientes(telefono, nombre)').eq('medico_id', p.id);
    if (vista === 'proximas') q = q.eq('estado', 'confirmada').gte('fin', ahora.toISOString()).order('inicio').limit(200);
    else q = q.lt('inicio', ahora.toISOString()).gte('inicio', new Date(ahora.getTime() - 60 * 86400000).toISOString()).order('inicio', { ascending: false }).limit(150);
    var r = await q;
    if (r.error) { $('lista-citas').innerHTML = '<p class="mensaje error">No se pudieron cargar sus citas.</p>'; return; }
    citas = r.data || [];
    cerrados = {};
    if (vista === 'proximas') {
      // Días cerrados (vacaciones, feriados, días libres) entre hoy y la última cita, mínimo 2 semanas.
      var hoy = diaLocal(ahora), hasta = sumarDia(hoy, 13);
      citas.forEach(function (c) { var d = diaLocal(new Date(c.inicio)); if (d > hasta) hasta = d; });
      try { (await panel({ accion: 'cerrados', desde: hoy, hasta: hasta })).dias.forEach(function (d) { cerrados[d.fecha] = d.etiqueta; }); }
      catch (e) { console.warn('Días cerrados', e); }
    }
    pintarCitas();
  }

  function estadoCita(c) {
    if (c.estado === 'cancelada') return '<span class="estado estado-gris">Cancelada' + (c.cancelada_por === 'paciente' ? ' por el paciente' : c.cancelada_por === 'consultorio' ? ' por el consultorio' : '') + '</span>';
    if (c.estado === 'completada') return '<span class="estado estado-verde">Asistió</span>';
    if (c.estado === 'no_asistio') return '<span class="estado estado-rojo">No asistió</span>';
    if (vista === 'anteriores') return '<span class="acciones-cita"><button type="button" class="mini" data-marcar="completada" data-id="' + c.id + '">Asistió</button><button type="button" class="mini" data-marcar="no_asistio" data-id="' + c.id + '">No asistió</button></span>';
    if (c.llamado_at) return '<span class="estado estado-azul">Avisado ' + esc(horaLocal(new Date(c.llamado_at))) + '</span>';
    return (c.paciente_confirmo_at ? '<span class="estado estado-verde">Confirmó</span>' : '');
  }

  var ICONO_SOL = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';

  function pintarCitas() {
    var hoy = diaLocal(new Date());
    var nHoy = citas.filter(function (c) { return diaLocal(new Date(c.inicio)) === hoy; }).length;
    if (vista === 'proximas') {
      var semana = citas.filter(function (c) { return new Date(c.inicio) - new Date() < 7 * 86400000; }).length;
      $('resumen-citas').textContent = citas.length ? 'Hoy: ' + nHoy + (nHoy === 1 ? ' cita' : ' citas') + ' · Próximos 7 días: ' + semana : '';
      $('menu-hoy').textContent = nHoy; $('menu-hoy').hidden = !nHoy;
      $('menu-hoy').title = nHoy + (nHoy === 1 ? ' cita hoy' : ' citas hoy');
    } else {
      $('resumen-citas').textContent = 'Últimos 60 días. Marque si el paciente asistió para llevar su control.';
    }
    $('abrir-cerrar-dia').hidden = vista !== 'proximas';
    var grupos = {}, orden = [];
    citas.forEach(function (c) { var d = diaLocal(new Date(c.inicio)); if (!grupos[d]) { grupos[d] = []; orden.push(d); } grupos[d].push(c); });
    Object.keys(cerrados).forEach(function (d) { if (!grupos[d]) { grupos[d] = []; orden.push(d); } });
    orden.sort(); if (vista === 'anteriores') orden.reverse();
    if (!orden.length) {
      $('lista-citas').innerHTML = '<div class="vacio-citas">' + (vista === 'proximas'
        ? '<strong>Aún no tiene citas próximas.</strong><span>' + (p.estado === 'activo' ? 'Comparta su enlace con sus pacientes para que empiecen a agendar.' : 'Cuando su asistente esté activo, aquí verá cada cita que agenden sus pacientes.') + '</span>'
        : '<strong>Sin citas en los últimos 60 días.</strong>') + '</div>';
      return;
    }
    $('lista-citas').innerHTML = orden.map(function (d) {
      var cerrado = cerrados[d];
      var cab = '<h3>' + esc(fechaTitulo(d)) + '</h3>';
      if (cerrado && !grupos[d].length) return '<div class="dia-citas">' + cab + '<div class="dia-cerrado">' + ICONO_SOL + '<span>' + esc(cerrado) + '</span></div></div>';
      return '<div class="dia-citas">' + cab + (cerrado ? '<div class="dia-cerrado con-citas">' + ICONO_SOL + '<span>' + esc(cerrado) + ' (todavía tiene citas este día)</span>' + (vista === 'proximas' ? '<button type="button" class="mini peligro" data-cancelar-dia="' + d + '">Cancelar las citas de este día</button>' : '') + '</div>' : '') + '<ul>' + grupos[d].map(function (c) {
        var tel = c.pacientes && c.pacientes.telefono, real = tel && !/^sim/.test(tel);
        var deHoy = d === hoy && vista === 'proximas' && c.estado === 'confirmada';
        return '<li class="cita' + (c.estado === 'cancelada' ? ' cancelada' : '') + '">' +
          '<div class="cita-hora"><strong>' + esc(horaLocal(new Date(c.inicio))) + '</strong><span>' + esc(c.duracion_min) + ' min</span></div>' +
          '<div class="cita-info"><strong>' + esc(c.nombre_paciente || (c.pacientes && c.pacientes.nombre) || 'Paciente') + '</strong><span>' + esc(c.servicio) + (tel && /^sim/.test(tel) ? ' · <em>prueba</em>' : '') + '</span></div>' +
          '<div class="cita-acciones">' + estadoCita(c) +
            (deHoy ? '<button type="button" class="mini primario" data-atender="' + c.id + '">' + (c.llamado_at ? 'Avisar de nuevo' : 'Atender') + '</button>' : '') +
            (real ? '<a class="mini" href="https://wa.me/' + esc(tel) + '" target="_blank" rel="noopener" aria-label="Escribir al paciente por WhatsApp">WhatsApp</a>' : '') +
            (vista === 'proximas' ? '<button type="button" class="mini peligro" data-cancelar="' + c.id + '">Cancelar</button>' : '') +
          '</div></li>';
      }).join('') + '</ul></div>';
    }).join('');
    $('lista-citas').querySelectorAll('[data-cancelar]').forEach(function (b) {
      b.addEventListener('click', function () { confirmarCancelacion(b); });
    });
    $('lista-citas').querySelectorAll('[data-cancelar-dia]').forEach(function (b) {
      b.addEventListener('click', function () {
        var caja = b.parentNode, dia = b.dataset.cancelarDia, n = citasDelDia(dia).length;
        b.remove();
        var q = document.createElement('span'); q.className = 'acciones-cita confirmar-dia';
        q.innerHTML = '<span class="pregunta-cancelar">¿Cancelar ' + n + (n === 1 ? ' cita' : ' citas') + ' y avisar a los pacientes?</span><button type="button" class="mini peligro" data-si>Sí, cancelar</button><button type="button" class="mini" data-no>No</button>';
        caja.appendChild(q);
        q.querySelector('[data-no]').addEventListener('click', function () { pintarCitas(); });
        q.querySelector('[data-si]').addEventListener('click', async function () {
          this.disabled = true;
          var r = await App.sb.rpc('cancelar_citas_fechas', { p_desde: dia, p_hasta: dia });
          if (r.error) { alert('No se pudo cancelar: ' + App.traducirError(r.error)); pintarCitas(); return; }
          cargarCitas();
        });
      });
    });
    $('lista-citas').querySelectorAll('[data-atender]').forEach(function (b) {
      b.addEventListener('click', async function () {
        b.disabled = true; b.textContent = 'Avisando…';
        try {
          var r = await panel({ accion: 'atender', cita_id: b.dataset.atender });
          var c = citas.find(function (x) { return x.id === b.dataset.atender; }); if (c) c.llamado_at = r.llamado_at;
          pintarCitas();
        } catch (e) {
          b.disabled = false; b.textContent = 'Atender';
          alert('No se pudo avisar al paciente: ' + e.message);
        }
      });
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

  // ---------- Cancelar un día completo ----------
  function citasDelDia(dia) { return citas.filter(function (c) { return c.estado === 'confirmada' && diaLocal(new Date(c.inicio)) === dia && new Date(c.inicio) > new Date(); }); }
  function actualizarCerrarDia() {
    var dia = $('cd-fecha').value, b = $('cd-confirmar');
    $('cd-error').hidden = true;
    if (!dia) { b.disabled = true; b.textContent = 'Elija un día'; $('cd-cuenta').textContent = ''; return; }
    var n = citasDelDia(dia).length;
    b.disabled = false;
    b.textContent = n ? 'Cancelar ' + n + (n === 1 ? ' cita' : ' citas') + ' y cerrar el día' : 'Cerrar el día';
    $('cd-cuenta').innerHTML = n
      ? '<strong>' + esc(fechaTitulo(dia)) + ':</strong> ' + n + (n === 1 ? ' paciente recibirá' : ' pacientes recibirán') + ' el aviso de cancelación con el botón «Elegir otra fecha». Esto no se puede deshacer.'
      : '<strong>' + esc(fechaTitulo(dia)) + ':</strong> no tiene citas. El día quedará cerrado para nuevas citas.';
  }
  $('abrir-cerrar-dia').addEventListener('click', function () {
    var f = $('cerrar-dia'); f.hidden = !f.hidden;
    if (!f.hidden) { f.reset(); $('cd-error').hidden = true; $('cd-fecha').min = diaLocal(new Date()); $('cd-fecha').focus(); actualizarCerrarDia(); }
  });
  $('cd-volver').addEventListener('click', function () { $('cerrar-dia').reset(); $('cerrar-dia').hidden = true; });
  $('cd-fecha').addEventListener('change', actualizarCerrarDia);
  $('cd-fecha').addEventListener('input', actualizarCerrarDia);
  $('cerrar-dia').addEventListener('submit', async function (ev) {
    ev.preventDefault();
    var dia = $('cd-fecha').value, b = $('cd-confirmar');
    if (!dia) return;
    b.disabled = true; b.textContent = 'Cancelando…';
    var r = await App.sb.rpc('cancelar_dia', { p_fecha: dia, p_motivo: $('cd-motivo').value.trim() || null });
    if (r.error) { $('cd-error').textContent = 'No se pudo completar: ' + App.traducirError(r.error); $('cd-error').hidden = false; actualizarCerrarDia(); return; }
    $('cerrar-dia').reset(); $('cerrar-dia').hidden = true;
    await recargarPerfil(); pintarVacaciones();
    await cargarCitas();
  });

  document.querySelectorAll('.pestanas-mini button').forEach(function (b) {
    b.addEventListener('click', function () {
      vista = b.dataset.vista;
      document.querySelectorAll('.pestanas-mini button').forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); });
      $('cerrar-dia').hidden = true;
      $('lista-citas').innerHTML = '<p class="ayuda">Cargando citas…</p>';
      cargarCitas();
    });
  });
  if (conCitas) cargarCitas();

  $('cargando').hidden = true;
  $('perfil').hidden = false;
})();
