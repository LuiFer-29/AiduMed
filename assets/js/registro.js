(function () {
  'use strict';

  var form = document.getElementById('formulario');
  var pasos = Array.prototype.slice.call(document.querySelectorAll('.paso-form'));
  var total = 4;
  var actual = 1;
  var btnSiguiente = document.getElementById('siguiente');
  var btnVolver = document.getElementById('volver');
  var pasoTexto = document.getElementById('paso-texto');
  var progreso = document.getElementById('progreso');
  var progresoCaja = document.querySelector('.progreso');

  // Plan elegido desde la página principal (?plan=basico)
  var plan = new URLSearchParams(location.search).get('plan');
  var nombresPlan = { piloto: 'Piloto fundador', basico: 'Básico', profesional: 'Profesional' };
  document.getElementById('campo-plan').value = nombresPlan[plan] || 'Sin elegir';

  function mostrarPaso(n, inicial) {
    actual = n;
    pasos.forEach(function (p) { p.hidden = Number(p.dataset.paso) !== n; });
    var final = n > total;
    pasoTexto.textContent = final ? '' : n + ' de ' + total;
    progreso.style.width = (final ? 100 : n / total * 100) + '%';
    progresoCaja.setAttribute('aria-valuenow', Math.min(n, total));
    btnVolver.disabled = n === 1 || final;
    document.getElementById('pie').hidden = final;
    btnSiguiente.textContent = n === total ? 'Enviar registro' : 'Siguiente';
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
  function soloDigitos(v) { return (v || '').replace(/\D/g, ''); }

  function validarPaso(n) {
    var ok = true;
    var primero = null;
    function revisar(nombre, condicion) {
      var campo = form.elements[nombre];
      var bien = condicion(campo);
      marcar(campo, errorDe(nombre), !bien);
      if (!bien) { ok = false; primero = primero || campo; }
    }
    if (n === 1) {
      revisar('nombre', function (c) { return c.value.trim().length > 1; });
      revisar('colegiacion', function (c) { return c.value.trim().length > 0; });
      if (document.getElementById('especialidad').value === 'Otra') {
        revisar('especialidad_otra', function (c) { return c.value.trim().length > 1; });
      }
      var carne = document.getElementById('carne');
      var tieneCarne = carne.files && carne.files.length > 0;
      errorDe('foto_carne').classList.toggle('visible', !tieneCarne);
      if (!tieneCarne) { ok = false; primero = primero || document.querySelector('.subir-carne'); }
    }
    if (n === 2) {
      revisar('consultorio', function (c) { return c.value.trim().length > 1; });
      revisar('direccion', function (c) { return c.value.trim().length > 3; });
      revisar('whatsapp_consultorio', function (c) { return soloDigitos(c.value).length === 8; });
      revisar('telefono_consultorio', function (c) { var d = soloDigitos(c.value); return d.length === 0 || d.length === 8; });
      if (form.elements.derivar_a.value === 'Otro número') {
        revisar('whatsapp_secretaria', function (c) { return soloDigitos(c.value).length === 8; });
      }
    }
    if (n === 3) {
      var conNombre = document.querySelectorAll('.s-nombre');
      var alguno = Array.prototype.some.call(conNombre, function (i) { return i.value.trim().length > 0; });
      document.getElementById('error-servicios').classList.toggle('visible', !alguno);
      if (!alguno) { ok = false; primero = primero || conNombre[0]; }
    }
    if (n === 4) {
      var dias = document.querySelectorAll('.dia[aria-pressed="true"]').length;
      document.getElementById('error-dias').classList.toggle('visible', dias === 0);
      if (dias === 0) { ok = false; primero = primero || document.querySelector('.dia'); }
      var desde = form.elements.hora_desde.value, hasta = form.elements.hora_hasta.value;
      var horasOk = desde && hasta && hasta > desde;
      document.getElementById('error-horas').classList.toggle('visible', !horasOk);
      if (!horasOk) { ok = false; primero = primero || form.elements.hora_hasta; }
      revisar('acepta_privacidad', function (c) { return c.checked; });
    }
    if (primero && primero.focus) primero.focus();
    return ok;
  }

  // Quitar el error en cuanto la persona corrige
  form.addEventListener('input', function (e) {
    var t = e.target;
    if (t.name && errorDe(t.name)) marcar(t, errorDe(t.name), false);
  });

  // ---------- Paso 1 ----------
  document.getElementById('especialidad').addEventListener('change', function () {
    document.getElementById('otra-especialidad').hidden = this.value !== 'Otra';
  });
  document.getElementById('foto').addEventListener('change', function () {
    var f = this.files && this.files[0];
    if (!f) return;
    var img = document.getElementById('foto-vista');
    img.src = URL.createObjectURL(f);
    img.hidden = false;
    document.getElementById('foto-icono').style.display = 'none';
  });
  document.getElementById('carne').addEventListener('change', function () {
    var f = this.files && this.files[0];
    if (!f) return;
    document.querySelector('.subir-carne').classList.add('listo');
    document.getElementById('carne-titulo').textContent = 'Foto del carné agregada';
    document.getElementById('carne-sub').textContent = 'Toque para cambiarla';
    errorDe('foto_carne').classList.remove('visible');
  });

  // ---------- Paso 2 ----------
  function formatearTelefono(input) {
    input.addEventListener('input', function () {
      var d = soloDigitos(input.value).slice(0, 8);
      input.value = d.length > 4 ? d.slice(0, 4) + '-' + d.slice(4) : d;
    });
  }
  form.querySelectorAll('input[type="tel"]').forEach(formatearTelefono);

  form.querySelectorAll('input[name="derivar_a"]').forEach(function (r) {
    r.addEventListener('change', function () {
      document.getElementById('campo-secretaria').hidden = form.elements.derivar_a.value !== 'Otro número';
    });
  });

  var btnUbicacion = document.getElementById('ubicacion');
  btnUbicacion.addEventListener('click', function () {
    var texto = document.getElementById('ubicacion-texto');
    if (!navigator.geolocation) { texto.textContent = 'Su navegador no permite usar la ubicación'; return; }
    texto.textContent = 'Buscando su ubicación…';
    navigator.geolocation.getCurrentPosition(function (pos) {
      var lat = pos.coords.latitude.toFixed(6), lon = pos.coords.longitude.toFixed(6);
      document.getElementById('campo-gps').value = 'https://maps.google.com/?q=' + lat + ',' + lon;
      texto.textContent = 'Ubicación guardada';
      btnUbicacion.classList.add('listo');
    }, function () {
      texto.textContent = 'No pudimos obtener la ubicación. Puede seguir sin ella.';
    }, { enableHighAccuracy: true, timeout: 15000 });
  });

  // ---------- Paso 3 ----------
  var lista = document.getElementById('lista-servicios');
  var plantilla = document.getElementById('plantilla-servicio');
  function agregarServicio(nombre) {
    var nodo = plantilla.content.firstElementChild.cloneNode(true);
    if (nombre) nodo.querySelector('.s-nombre').value = nombre;
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
  agregarServicio('');
  agregarServicio('');
  document.getElementById('agregar-servicio').addEventListener('click', function () {
    var nuevo = agregarServicio('');
    nuevo.querySelector('.s-nombre').focus();
  });

  // ---------- Paso 4 ----------
  document.querySelectorAll('.dia, .tarjeta-opcion').forEach(function (b) {
    b.addEventListener('click', function () {
      b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      if (b.classList.contains('dia')) document.getElementById('error-dias').classList.remove('visible');
    });
  });
  document.getElementById('agregar-fechas').addEventListener('click', function () {
    var campo = document.getElementById('campo-otras-fechas');
    campo.hidden = false;
    this.hidden = true;
    campo.querySelector('textarea').focus();
  });

  // ---------- Envío ----------
  function prepararCamposOcultos() {
    var servicios = Array.prototype.map.call(lista.querySelectorAll('.servicio'), function (s) {
      var nombre = s.querySelector('.s-nombre').value.trim();
      if (!nombre) return null;
      var precio = soloDigitos(s.querySelector('.s-precio').value);
      return nombre + ' | ' + s.querySelector('.s-duracion').value + ' | ' + (precio ? 'L ' + precio : 'sin precio');
    }).filter(Boolean);
    document.getElementById('campo-servicios').value = servicios.join('\n');
    document.getElementById('campo-dias').value = Array.prototype.map.call(document.querySelectorAll('.dia[aria-pressed="true"]'), function (d) { return d.dataset.dia; }).join(', ');
    document.getElementById('campo-vacaciones').value = Array.prototype.map.call(document.querySelectorAll('.tarjeta-opcion[aria-pressed="true"]'), function (d) { return d.dataset.vacacion; }).join(', ') || 'Ninguna';
  }

  // Reduce las fotos a un tamaño razonable antes de enviarlas
  function comprimir(archivo) {
    return new Promise(function (resolver) {
      if (!archivo || !/^image\//.test(archivo.type) || archivo.size < 900000) { resolver(archivo); return; }
      var img = new Image();
      img.onload = function () {
        var max = 1600, escala = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * escala); c.height = Math.round(img.height * escala);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (blob) {
          resolver(blob ? new File([blob], archivo.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : archivo);
        }, 'image/jpeg', 0.82);
      };
      img.onerror = function () { resolver(archivo); };
      img.src = URL.createObjectURL(archivo);
    });
  }

  function enviar() {
    prepararCamposOcultos();
    btnSiguiente.disabled = true;
    btnSiguiente.textContent = 'Enviando…';
    document.getElementById('error-envio').hidden = true;
    var datos = new FormData(form);
    // Agrega el prefijo +504 a los teléfonos
    ['whatsapp_consultorio', 'telefono_consultorio', 'whatsapp_secretaria'].forEach(function (n) {
      var d = soloDigitos(datos.get(n));
      datos.set(n, d ? '+504 ' + d.slice(0, 4) + '-' + d.slice(4) : '');
    });
    Promise.all([comprimir(document.getElementById('foto').files[0]), comprimir(document.getElementById('carne').files[0])])
      .then(function (archivos) {
        if (archivos[0]) datos.set('foto_perfil', archivos[0]); else datos.delete('foto_perfil');
        if (archivos[1]) datos.set('foto_carne', archivos[1]);
        return fetch('/', { method: 'POST', body: datos });
      })
      .then(function (r) {
        if (!r.ok) throw new Error('Respuesta ' + r.status);
        mostrarPaso(total + 1);
      })
      .catch(function () {
        document.getElementById('error-envio').hidden = false;
        btnSiguiente.disabled = false;
        btnSiguiente.textContent = 'Intentar de nuevo';
      });
  }

  btnSiguiente.addEventListener('click', function () {
    if (!validarPaso(actual)) return;
    if (actual < total) mostrarPaso(actual + 1);
    else enviar();
  });
  btnVolver.addEventListener('click', function () { if (actual > 1) mostrarPaso(actual - 1); });
  form.addEventListener('submit', function (e) { e.preventDefault(); btnSiguiente.click(); });

  mostrarPaso(1, true);
})();
