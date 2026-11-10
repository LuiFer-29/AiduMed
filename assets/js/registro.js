(async function () {
  'use strict';

  var sb = App.sb;
  var sesion = await App.requerirSesion();
  var uid = sesion.user.id;
  // Si el navegador ya tenía una sesión abierta, el registro continúa con esa cuenta: lo decimos claramente.
  document.getElementById('cuenta-correo').textContent = sesion.user.email;
  document.getElementById('otra-cuenta').addEventListener('click', async function () {
    await sb.auth.signOut();
    location.href = '/cuenta?modo=crear&siguiente=%2Fregistro';
  });

  var form = document.getElementById('formulario');
  var pasos = Array.prototype.slice.call(document.querySelectorAll('.paso-form'));
  var total = 5;
  var actual = 1;
  var btnSiguiente = document.getElementById('siguiente');
  var btnVolver = document.getElementById('volver');
  var pasoTexto = document.getElementById('paso-texto');
  var progreso = document.getElementById('progreso');
  var progresoCaja = document.querySelector('.progreso');
  var lista = document.getElementById('lista-servicios');
  var plantilla = document.getElementById('plantilla-servicio');
  var perfil = null;
  var pasoDirecto = Number(new URLSearchParams(location.search).get('paso')) || 0;
  var modoDirecto = false; // edición de un solo paso desde Mi perfil

  var nombresPlan = { piloto: 'Piloto fundador', basico: 'Básico', profesional: 'Profesional' };
  var planUrl = nombresPlan[new URLSearchParams(location.search).get('plan')] || null;

  function soloDigitos(v) { return (v || '').replace(/\D/g, ''); }
  function formatoTel(d) { d = soloDigitos(d).replace(/^504(?=\d{8}$)/, ''); return d.length > 4 ? d.slice(0, 4) + '-' + d.slice(4, 8) : d; }
  function conPrefijo(v) { var d = soloDigitos(v); return d ? '+504 ' + d.slice(0, 4) + '-' + d.slice(4) : null; }
  function hhmm(t) { return t ? String(t).slice(0, 5) : ''; }
  function miles(v) { var d = soloDigitos(String(v == null ? '' : v).split('.')[0]); return d ? Number(d).toLocaleString('en-US') : ''; }
  var reMapa = /^https:\/\/((www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps)/i;
  var listaFechas = document.getElementById('lista-fechas');
  var plantillaFecha = document.getElementById('plantilla-fecha');

  // ---------- Navegación ----------
  function mostrarPaso(n, inicial) {
    actual = n;
    pasos.forEach(function (p) { p.hidden = Number(p.dataset.paso) !== n; });
    var final = n > total;
    pasoTexto.textContent = final ? '' : n + ' de ' + total;
    progreso.style.width = (final ? 100 : n / total * 100) + '%';
    progresoCaja.setAttribute('aria-valuenow', Math.min(n, total));
    btnVolver.disabled = (n === 1 && !modoDirecto) || final;
    document.getElementById('pie').hidden = final;
    var enviado = perfil && perfil.estado !== 'borrador' && perfil.estado !== 'rechazado';
    btnSiguiente.textContent = modoDirecto ? 'Guardar cambios' : n === total ? (enviado ? 'Guardar cambios' : 'Enviar registro') : 'Siguiente';
    if (inicial) return;
    window.scrollTo(0, 0);
    var titulo = pasos[n - 1] && pasos[n - 1].querySelector('.paso-titulo, h1');
    if (titulo) { titulo.setAttribute('tabindex', '-1'); titulo.focus({ preventScroll: true }); }
  }

  // ---------- Errores ----------
  function errorDe(nombre) { return document.querySelector('[data-error-for="' + nombre + '"]'); }
  function marcar(campo, mensaje, mostrar) {
    if (!mensaje) return;
    mensaje.classList.toggle('visible', mostrar);
    if (campo) {
      var caja = campo.closest('.telefono') || campo;
      caja.classList.toggle('invalido', mostrar);
      campo.setAttribute('aria-invalid', mostrar ? 'true' : 'false');
    }
  }

  function validarPaso(n) {
    var ok = true, primero = null;
    function revisar(nombre, condicion) {
      var campo = form.elements[nombre];
      var bien = condicion(campo);
      marcar(campo, errorDe(nombre), !bien);
      if (!bien) { ok = false; primero = primero || campo; }
    }
    if (n === 1) {
      revisar('nombre', function (c) { return c.value.trim().length > 1; });
      revisar('colegiacion', function (c) { return c.value.trim().length > 0; });
      if (document.getElementById('especialidad').value === 'Otra') revisar('especialidad_otra', function (c) { return c.value.trim().length > 1; });
      var carne = document.getElementById('carne');
      var tiene = (carne.files && carne.files.length > 0) || (perfil && perfil.carne_path);
      errorDe('foto_carne').classList.toggle('visible', !tiene);
      if (!tiene) { ok = false; primero = primero || document.querySelector('.subir-carne'); }
    }
    if (n === 2) {
      revisar('consultorio', function (c) { return c.value.trim().length > 1; });
      revisar('direccion', function (c) { return c.value.trim().length > 3; });
      revisar('whatsapp_consultorio', function (c) { return soloDigitos(c.value).length === 8; });
      revisar('telefono_consultorio', function (c) { var d = soloDigitos(c.value); return d.length === 0 || d.length === 8; });
      if (form.elements.derivar_a.value === 'Otro número') revisar('whatsapp_secretaria', function (c) { return soloDigitos(c.value).length === 8; });
      revisar('enlace_mapa', function (c) { var v = c.value.trim(); return !v || reMapa.test(v); });
    }
    if (n === 3) {
      var nombres = document.querySelectorAll('.s-nombre');
      var alguno = Array.prototype.some.call(nombres, function (i) { return i.value.trim().length > 0; });
      document.getElementById('error-servicios').classList.toggle('visible', !alguno);
      if (!alguno) { ok = false; primero = primero || nombres[0]; }
    }
    if (n === 4) {
      revisar('aviso_minimo_min', function (c) { return !!c.value; });
      var dias = document.querySelectorAll('.dia[aria-pressed="true"]').length;
      document.getElementById('error-dias').classList.toggle('visible', dias === 0);
      if (dias === 0) { ok = false; primero = primero || document.querySelector('.dia'); }
      var desde = form.elements.hora_desde.value, hasta = form.elements.hora_hasta.value;
      var horasOk = desde && hasta && hasta > desde;
      document.getElementById('error-horas').classList.toggle('visible', !horasOk);
      if (!horasOk) { ok = false; primero = primero || form.elements.hora_hasta; }
      if (document.getElementById('tiene-almuerzo').checked) {
        var ad = form.elements.almuerzo_desde.value, ah = form.elements.almuerzo_hasta.value;
        var almOk = ad && ah && ah > ad && ad >= desde && ah <= hasta;
        document.getElementById('error-almuerzo').classList.toggle('visible', !almOk);
        if (!almOk) { ok = false; primero = primero || form.elements.almuerzo_desde; }
      } else {
        document.getElementById('error-almuerzo').classList.remove('visible');
      }
      listaFechas.querySelectorAll('.fecha-fila').forEach(function (fila) {
        var d = fila.querySelector('.f-desde').value, h = fila.querySelector('.f-hasta').value;
        var vacia = !d && !h && !fila.querySelector('.f-motivo').value.trim();
        var bien = vacia || (d && (!h || h >= d));
        fila.querySelector('.f-error').classList.toggle('visible', !bien);
        if (!bien) { ok = false; primero = primero || fila.querySelector('.f-desde'); }
      });
    }
    if (n === 5) {
      var elegido = form.querySelector('input[name="plan"]:checked');
      errorDe('plan').classList.toggle('visible', !elegido);
      if (!elegido) { ok = false; primero = primero || form.querySelector('input[name="plan"]'); }
      revisar('acepta_terminos_y_privacidad', function (c) { return c.checked; });
    }
    if (primero && primero.focus) primero.focus();
    return ok;
  }

  form.addEventListener('input', function (e) {
    var t = e.target;
    if (t.name && errorDe(t.name)) marcar(t, errorDe(t.name), false);
  });

  // ---------- Paso 1 ----------
  document.getElementById('especialidad').addEventListener('change', function () {
    document.getElementById('otra-especialidad').hidden = this.value !== 'Otra';
  });
  function verFoto(src) {
    var img = document.getElementById('foto-vista');
    img.src = src; img.hidden = false;
    document.getElementById('foto-icono').style.display = 'none';
  }
  function carneListo(src) {
    document.querySelector('.subir-carne').classList.add('listo');
    document.getElementById('carne-titulo').textContent = 'Carné agregado';
    document.getElementById('carne-sub').textContent = 'Cambiar foto';
    var mini = document.getElementById('carne-mini');
    if (src) { mini.src = src; mini.hidden = false; }
    errorDe('foto_carne').classList.remove('visible');
  }
  document.getElementById('foto').addEventListener('change', function () {
    var f = this.files && this.files[0];
    if (f) verFoto(URL.createObjectURL(f));
  });
  document.getElementById('carne').addEventListener('change', function () {
    if (this.files && this.files[0]) carneListo(URL.createObjectURL(this.files[0]));
  });

  // ---------- Paso 2 ----------
  form.querySelectorAll('input[type="tel"]').forEach(function (input) {
    input.addEventListener('input', function () { input.value = formatoTel(input.value); });
  });
  function actualizarSecretaria() {
    document.getElementById('campo-secretaria').hidden = form.elements.derivar_a.value !== 'Otro número';
  }
  form.querySelectorAll('input[name="derivar_a"]').forEach(function (r) { r.addEventListener('change', actualizarSecretaria); });

  var btnUbicacion = document.getElementById('ubicacion');
  btnUbicacion.addEventListener('click', function () {
    var texto = document.getElementById('ubicacion-texto');
    if (!navigator.geolocation) { texto.textContent = 'Su navegador no permite usar la ubicación'; return; }
    texto.textContent = 'Buscando su ubicación…';
    navigator.geolocation.getCurrentPosition(function (pos) {
      form.elements.enlace_mapa.value = 'https://www.google.com/maps?q=' + pos.coords.latitude.toFixed(6) + ',' + pos.coords.longitude.toFixed(6);
      marcar(form.elements.enlace_mapa, errorDe('enlace_mapa'), false);
      texto.textContent = 'Ubicación agregada';
      btnUbicacion.classList.add('listo');
    }, function () {
      texto.textContent = 'Su navegador no compartió la ubicación. Pegue el enlace de Google Maps abajo.';
    }, { enableHighAccuracy: true, timeout: 15000 });
  });

  // ---------- Paso 3 ----------
  function agregarServicio(s) {
    var nodo = plantilla.content.firstElementChild.cloneNode(true);
    if (s) {
      nodo.querySelector('.s-nombre').value = s.nombre || '';
      if (s.duracion) nodo.querySelector('.s-duracion').value = s.duracion;
      nodo.querySelector('.s-precio').value = miles(s.precio);
    }
    var precio = nodo.querySelector('.s-precio');
    precio.addEventListener('input', function () { precio.value = miles(precio.value); });
    nodo.querySelector('.quitar').addEventListener('click', function () {
      if (lista.children.length > 1) nodo.remove();
      else nodo.querySelectorAll('input').forEach(function (i) { i.value = ''; });
    });
    nodo.querySelector('.s-nombre').addEventListener('input', function () {
      document.getElementById('error-servicios').classList.remove('visible');
    });
    lista.appendChild(nodo);
    return nodo;
  }
  document.getElementById('agregar-servicio').addEventListener('click', function () {
    agregarServicio().querySelector('.s-nombre').focus();
  });

  // ---------- Paso 4 ----------
  document.querySelectorAll('.dia, .tarjeta-opcion').forEach(function (b) {
    b.addEventListener('click', function () {
      b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      if (b.classList.contains('dia')) document.getElementById('error-dias').classList.remove('visible');
    });
  });
  function agregarFecha(v) {
    var nodo = plantillaFecha.content.firstElementChild.cloneNode(true);
    var desde = nodo.querySelector('.f-desde'), hasta = nodo.querySelector('.f-hasta');
    var hoy = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    desde.min = hoy; hasta.min = hoy;
    if (v) { desde.value = v.desde || ''; hasta.value = v.hasta || ''; nodo.querySelector('.f-motivo').value = v.motivo || ''; }
    desde.addEventListener('change', function () {
      hasta.min = desde.value || hoy;
      if (!hasta.value || hasta.value < desde.value) hasta.value = desde.value;
      nodo.querySelector('.f-error').classList.remove('visible');
    });
    hasta.addEventListener('change', function () { nodo.querySelector('.f-error').classList.remove('visible'); });
    nodo.querySelector('.quitar').addEventListener('click', function () { nodo.remove(); });
    listaFechas.appendChild(nodo);
    return nodo;
  }
  document.getElementById('agregar-fechas').addEventListener('click', function () {
    agregarFecha().querySelector('.f-desde').focus();
  });

  document.getElementById('tiene-almuerzo').addEventListener('change', function () {
    document.getElementById('campos-almuerzo').hidden = !this.checked;
    document.getElementById('error-almuerzo').classList.remove('visible');
  });

  // ---------- Paso 5 ----------
  form.querySelectorAll('input[name="plan"]').forEach(function (r) {
    r.addEventListener('change', function () { errorDe('plan').classList.remove('visible'); });
  });

  // ---------- Cargar datos guardados ----------
  function rellenar(p) {
    var f = form.elements;
    if (p.titulo) f.titulo.value = p.titulo;
    f.nombre.value = p.nombre || '';
    if (p.especialidad) f.especialidad.value = p.especialidad;
    document.getElementById('otra-especialidad').hidden = f.especialidad.value !== 'Otra';
    f.especialidad_otra.value = p.especialidad_otra || '';
    f.colegiacion.value = p.colegiacion || '';
    f.descripcion.value = p.descripcion || '';
    if (p.foto_path) verFoto(sb.storage.from('fotos').getPublicUrl(p.foto_path).data.publicUrl + '?t=' + Date.parse(p.updated_at));
    if (p.carne_path) {
      carneListo(null);
      sb.storage.from('carnes').createSignedUrl(p.carne_path, 600).then(function (r) { if (r.data) carneListo(r.data.signedUrl); });
    }
    f.consultorio.value = p.consultorio || '';
    f.numero_consultorio.value = p.numero_consultorio || '';
    f.direccion.value = p.direccion || '';
    if (p.ubicacion_gps) { f.enlace_mapa.value = p.ubicacion_gps; document.getElementById('ubicacion-texto').textContent = 'Ubicación agregada'; btnUbicacion.classList.add('listo'); }
    f.whatsapp_consultorio.value = formatoTel(p.whatsapp_consultorio);
    f.telefono_consultorio.value = formatoTel(p.telefono_consultorio);
    if (p.derivar_a) form.querySelector('input[name="derivar_a"][value="' + p.derivar_a + '"]').checked = true;
    f.whatsapp_secretaria.value = formatoTel(p.whatsapp_secretaria);
    actualizarSecretaria();
    lista.innerHTML = '';
    (p.servicios && p.servicios.length ? p.servicios : [null, null]).forEach(function (s) { agregarServicio(s); });
    if (p.dias_atencion && p.dias_atencion.length) document.querySelectorAll('.dia').forEach(function (d) { d.setAttribute('aria-pressed', p.dias_atencion.indexOf(d.dataset.dia) >= 0); });
    if (p.hora_desde) f.hora_desde.value = hhmm(p.hora_desde);
    if (p.hora_hasta) f.hora_hasta.value = hhmm(p.hora_hasta);
    if (p.almuerzo_desde && p.almuerzo_hasta) {
      document.getElementById('tiene-almuerzo').checked = true;
      document.getElementById('campos-almuerzo').hidden = false;
      f.almuerzo_desde.value = hhmm(p.almuerzo_desde);
      f.almuerzo_hasta.value = hhmm(p.almuerzo_hasta);
    }
    if (p.tiempo_entre_citas) f.tiempo_entre_citas.value = p.tiempo_entre_citas;
    if (p.anticipacion) f.anticipacion.value = p.anticipacion;
    if (p.aviso_minimo_min) f.aviso_minimo_min.value = String(p.aviso_minimo_min);
    if (p.enviado_at || (p.vacaciones && p.vacaciones.length)) document.querySelectorAll('.tarjeta-opcion').forEach(function (d) { d.setAttribute('aria-pressed', (p.vacaciones || []).indexOf(d.dataset.vacacion) >= 0); });
    listaFechas.innerHTML = '';
    (p.otras_vacaciones || []).forEach(function (v) { agregarFecha(v); });
    var planGuardado = p.plan && form.querySelector('input[name="plan"][value="' + p.plan + '"]');
    if (planGuardado) planGuardado.checked = true;
    f.conectar_google_calendar.checked = !!p.conectar_google_calendar;
    f.acepta_terminos_y_privacidad.checked = !!p.acepta_terminos_at;
  }

  // ---------- Guardar ----------
  function comprimir(archivo) {
    return new Promise(function (resolver) {
      // JPG, PNG y WEBP livianos pasan tal cual; todo lo demás (AVIF, HEIC, fotos grandes) se convierte a JPG.
      var comun = /^image\/(jpeg|png|webp)$/.test(archivo.type);
      if (!archivo || (comun && archivo.size < 900000)) { resolver(archivo); return; }
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
  async function subir(bucket, input, nombre) {
    var archivo = input.files && input.files[0];
    if (!archivo) return null;
    archivo = await comprimir(archivo);
    var ext = { 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif', 'image/avif': 'avif' }[archivo.type] || 'jpg';
    var ruta = uid + '/' + nombre + '.' + ext;
    var r = await sb.storage.from(bucket).upload(ruta, archivo, { upsert: true, contentType: archivo.type || 'image/jpeg' });
    if (r.error) throw r.error;
    input.value = '';
    return ruta;
  }

  function datosDelPaso(n) {
    var f = form.elements;
    if (n === 1) return {
      titulo: f.titulo.value, nombre: f.nombre.value.trim(), especialidad: f.especialidad.value,
      especialidad_otra: f.especialidad.value === 'Otra' ? f.especialidad_otra.value.trim() : null,
      colegiacion: f.colegiacion.value.trim(), descripcion: f.descripcion.value.trim() || null
    };
    if (n === 2) return {
      consultorio: f.consultorio.value.trim(), numero_consultorio: f.numero_consultorio.value.trim() || null, direccion: f.direccion.value.trim(), ubicacion_gps: f.enlace_mapa.value.trim() || null,
      whatsapp_consultorio: conPrefijo(f.whatsapp_consultorio.value), telefono_consultorio: conPrefijo(f.telefono_consultorio.value),
      derivar_a: f.derivar_a.value, whatsapp_secretaria: f.derivar_a.value === 'Otro número' ? conPrefijo(f.whatsapp_secretaria.value) : null
    };
    if (n === 3) return {
      servicios: Array.prototype.map.call(lista.querySelectorAll('.servicio'), function (s) {
        var nombre = s.querySelector('.s-nombre').value.trim();
        if (!nombre) return null;
        return { nombre: nombre, duracion: s.querySelector('.s-duracion').value, precio: soloDigitos((s.querySelector('.s-precio').value || '').split('.')[0]) || null };
      }).filter(Boolean)
    };
    if (n === 5) {
      var elegido = form.querySelector('input[name="plan"]:checked');
      return {
        plan: elegido ? elegido.value : null,
        acepta_terminos_at: perfil && perfil.acepta_terminos_at ? perfil.acepta_terminos_at : new Date().toISOString()
      };
    }
    return {
      dias_atencion: Array.prototype.map.call(document.querySelectorAll('.dia[aria-pressed="true"]'), function (d) { return d.dataset.dia; }),
      hora_desde: f.hora_desde.value, hora_hasta: f.hora_hasta.value,
      almuerzo_desde: document.getElementById('tiene-almuerzo').checked ? f.almuerzo_desde.value : null,
      almuerzo_hasta: document.getElementById('tiene-almuerzo').checked ? f.almuerzo_hasta.value : null,
      tiempo_entre_citas: f.tiempo_entre_citas.value, anticipacion: f.anticipacion.value, aviso_minimo_min: Number(f.aviso_minimo_min.value) || null,
      vacaciones: Array.prototype.map.call(document.querySelectorAll('.tarjeta-opcion[aria-pressed="true"]'), function (d) { return d.dataset.vacacion; }),
      otras_vacaciones: Array.prototype.map.call(listaFechas.querySelectorAll('.fecha-fila'), function (fila) {
        var d = fila.querySelector('.f-desde').value;
        if (!d) return null;
        return { desde: d, hasta: fila.querySelector('.f-hasta').value || d, motivo: fila.querySelector('.f-motivo').value.trim() || null };
      }).filter(Boolean),
      conectar_google_calendar: f.conectar_google_calendar.checked
    };
  }

  async function guardar(n) {
    var datos = datosDelPaso(n);
    if (n === 1) {
      // Cada foto lleva un nombre nuevo: si el registro ya fue aprobado, la nueva queda en revisión sin reemplazar la publicada.
      var foto = await subir('fotos', document.getElementById('foto'), 'perfil-' + Date.now());
      if (foto) datos.foto_path = foto;
      var carne = await subir('carnes', document.getElementById('carne'), 'carne');
      if (carne) datos.carne_path = carne;
    }
    if (n === total && (!perfil || perfil.estado === 'borrador' || perfil.estado === 'rechazado')) datos.estado = 'en_revision';
    var r;
    if (perfil) {
      r = await sb.from('medicos').update(datos).eq('id', uid).select().single();
    } else {
      datos.id = uid;
      if (!datos.plan) datos.plan = planUrl || null;
      r = await sb.from('medicos').insert(datos).select().single();
    }
    if (r.error) throw r.error;
    var antes = perfil ? perfil.estado : 'borrador';
    perfil = r.data;
    return { antes: antes, despues: perfil.estado };
  }

  // El aviso al equipo lo envía Supabase (trigger medicos_avisar → función aviso-estado) cuando el registro pasa a revisión.

  // ---------- Vacaciones sobre fechas con citas ----------
  var TZ = 'America/Tegucigalpa';
  var diaLocal = function (d) { return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d); };
  async function citasEnFechas(rangos) {
    if (!perfil || !rangos.length) return [];
    var r = await sb.from('citas').select('id, inicio, nombre_paciente').eq('medico_id', uid).eq('estado', 'confirmada')
      .gt('inicio', new Date().toISOString()).order('inicio').limit(500);
    if (r.error) return [];
    return (r.data || []).filter(function (c) {
      var d = diaLocal(new Date(c.inicio));
      return rangos.some(function (x) { return d >= x.desde && d <= (x.hasta || x.desde); });
    });
  }
  function preguntarCitas(citas) {
    return new Promise(function (resolver) {
      var cuando = function (c) {
        var i = new Date(c.inicio);
        var f = new Intl.DateTimeFormat('es-HN', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(i);
        var h = new Intl.DateTimeFormat('es-HN', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true }).format(i).replace(/\s*a\.?\s*m\.?/i, ' a. m.').replace(/\s*p\.?\s*m\.?/i, ' p. m.');
        return f.charAt(0).toUpperCase() + f.slice(1) + ', ' + h;
      };
      var n = citas.length, max = 5;
      var fondo = document.createElement('div');
      fondo.className = 'dialogo-fondo';
      fondo.innerHTML = '<div class="dialogo" role="dialog" aria-modal="true" aria-labelledby="dlg-titulo">' +
        '<h2 id="dlg-titulo">Tiene ' + n + (n === 1 ? ' cita' : ' citas') + ' en esas fechas</h2>' +
        '<p>Las fechas nuevas quedarán cerradas para nuevas citas. ¿Qué hacemos con las que ya están agendadas?</p>' +
        '<ul>' + citas.slice(0, max).map(function (c) { return '<li><strong>' + App.escapar(cuando(c)) + '</strong> · ' + App.escapar(c.nombre_paciente || 'Paciente') + '</li>'; }).join('') +
        (n > max ? '<li class="mas">y ' + (n - max) + ' más</li>' : '') + '</ul>' +
        '<div class="dialogo-botones">' +
          '<button type="button" class="boton boton-peligro-lleno" data-r="cancelar">Cancelarlas y avisar a los pacientes</button>' +
          '<button type="button" class="boton boton-secundario" data-r="mantener">Mantenerlas</button>' +
          '<button type="button" class="enlace-boton" data-r="volver">Volver a editar las fechas</button>' +
        '</div><p class="ayuda">Si las cancela, cada paciente recibe un mensaje por WhatsApp con el botón «Elegir otra fecha».</p></div>';
      document.body.appendChild(fondo);
      fondo.querySelector('[data-r="cancelar"]').focus();
      fondo.querySelectorAll('[data-r]').forEach(function (b) {
        b.addEventListener('click', function () { fondo.remove(); resolver(b.dataset.r); });
      });
    });
  }

  btnSiguiente.addEventListener('click', async function () {
    if (!validarPaso(actual)) return;
    var etiqueta = btnSiguiente.textContent;
    var decision = null, rangosNuevos = [];
    if (actual === 4 && perfil) {
      rangosNuevos = datosDelPaso(4).otras_vacaciones || [];
      var afectadas = await citasEnFechas(rangosNuevos);
      if (afectadas.length) {
        decision = await preguntarCitas(afectadas);
        if (decision === 'volver') return;
      }
    }
    btnSiguiente.disabled = true;
    btnSiguiente.textContent = 'Guardando…';
    document.getElementById('error-envio').hidden = true;
    try {
      var res = await guardar(actual);
      if (decision === 'cancelar') {
        for (var i = 0; i < rangosNuevos.length; i++) {
          var c = await sb.rpc('cancelar_citas_fechas', { p_desde: rangosNuevos[i].desde, p_hasta: rangosNuevos[i].hasta || rangosNuevos[i].desde });
          if (c.error) throw c.error;
        }
      }
      if (modoDirecto) { location.href = '/mi-perfil?guardado=1'; return; }
      if (actual < total) { mostrarPaso(actual + 1); }
      else {
        var nuevo = res.antes !== res.despues && res.despues === 'en_revision';
        if (!nuevo) {
          document.getElementById('final-titulo').textContent = 'Cambios guardados';
          document.getElementById('final-texto').textContent = 'Sus datos quedaron actualizados. Si cambian sus horarios o servicios, los ajustamos en su asistente.';
        }
        mostrarPaso(total + 1);
      }
    } catch (e) {
      console.error(e);
      var err = document.getElementById('error-envio');
      err.textContent = App.traducirError(e);
      err.hidden = false;
    } finally {
      btnSiguiente.disabled = false;
      if (btnSiguiente.textContent === 'Guardando…') btnSiguiente.textContent = etiqueta;
    }
  });
  btnVolver.addEventListener('click', function () { if (modoDirecto) { location.href = '/mi-perfil'; return; } if (actual > 1) mostrarPaso(actual - 1); });
  form.addEventListener('submit', function (e) { e.preventDefault(); btnSiguiente.click(); });

  // ---------- Inicio ----------
  try {
    perfil = await App.miPerfil(uid);
  } catch (e) { console.error(e); }
  if (perfil) rellenar(perfil); else { agregarServicio(); agregarServicio(); }
  if (planUrl && !form.querySelector('input[name="plan"]:checked')) form.querySelector('input[name="plan"][value="' + planUrl + '"]').checked = true;
  if ((!perfil || perfil.estado === 'borrador' || perfil.estado === 'rechazado') && App.vigilarRegistro(sesion)) return;
  document.getElementById('cargando').hidden = true;
  // El aviso de la cuenta solo hace falta al empezar o continuar un registro, no al editar datos ya aprobados.
  document.getElementById('cuenta-activa').hidden = !!(perfil && perfil.estado !== 'borrador');
  modoDirecto = !!(perfil && pasoDirecto >= 1 && pasoDirecto <= total && perfil.estado !== 'borrador' && perfil.estado !== 'rechazado');
  mostrarPaso(modoDirecto ? pasoDirecto : 1, true);
})();
