// Conexión con Supabase y utilidades compartidas.
// La URL y la clave pública (anon) se pueden publicar: la seguridad la dan las reglas de la base de datos.
window.AIDU_SB = {
  url: 'https://lpdtiyhcwubaryrrpxgw.supabase.co',
  anonKey: 'sb_publishable_-QnY5m_7xTkw6Vz77SKeyw_TnKHwVaj'
};

(function () {
  'use strict';
  var cfg = window.AIDU_SB;
  var sb = window.supabase.createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  function irA(ruta) { window.location.replace(ruta); }

  var App = {
    sb: sb,
    sitio: window.location.origin,

    // Devuelve la sesión o manda a iniciar sesión, recordando a dónde volver.
    requerirSesion: async function () {
      var r = await sb.auth.getSession();
      var sesion = r.data && r.data.session;
      if (!sesion) {
        var modo = location.pathname.indexOf('/registro') === 0 ? 'crear' : 'entrar';
        irA('/cuenta?modo=' + modo + '&siguiente=' + encodeURIComponent(location.pathname + location.search));
        return new Promise(function () {});
      }
      return sesion;
    },

    esAdmin: async function () {
      var r = await sb.rpc('es_admin');
      return !r.error && r.data === true;
    },

    miPerfil: async function (uid) {
      var r = await sb.from('medicos').select('*').eq('id', uid).maybeSingle();
      if (r.error) throw r.error;
      return r.data;
    },

    salir: async function () {
      await sb.auth.signOut();
      irA('/');
    },

    // Mientras el registro no se ha enviado, la sesión se cierra tras 1 hora sin actividad
    // (también si el médico vuelve después). Ya registrado, la sesión queda abierta para el día a día.
    // Vacaciones de cada año: fechas fijadas por el administrador (tabla feriados) o calculadas.
    VACACIONES_FIJAS: ['Semana Santa', 'Semana Morazánica', 'Navidad y Año Nuevo'],
    pascua: function (a) {
      var b = a % 19, c = Math.floor(a / 100), d = a % 100, e = Math.floor(c / 4), f = c % 4, g = Math.floor((c + 8) / 25), h = Math.floor((c - g + 1) / 3);
      var i = (19 * b + c - e - h + 15) % 30, k = Math.floor(d / 4), l = d % 4, m = (32 + 2 * f + 2 * k - i - l) % 7, n = Math.floor((b + 11 * i + 22 * m) / 451);
      var mes = Math.floor((i + m - 7 * n + 114) / 31), dia = ((i + m - 7 * n + 114) % 31) + 1;
      return a + '-' + String(mes).padStart(2, '0') + '-' + String(dia).padStart(2, '0');
    },
    sumarDias: function (fecha, n) { var d = new Date(fecha + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); },
    // { desde, hasta, fuente: 'fijada' | 'calculada' | 'pendiente' } de una vacación para el año dado.
    vacacionDelAnio: function (nombre, anio, feriados) {
      var f = (feriados || []).find(function (x) { return x.nombre === nombre && Number(String(x.desde).slice(0, 4)) === anio; });
      if (f) return { desde: f.desde, hasta: f.hasta, fuente: 'fijada' };
      if (nombre === 'Semana Santa') { var dom = App.pascua(anio); return { desde: App.sumarDias(dom, -6), hasta: dom, fuente: 'calculada' }; }
      if (nombre === 'Navidad y Año Nuevo') return { desde: anio + '-12-24', hasta: (anio + 1) + '-01-01', fuente: 'calculada' };
      return { desde: null, hasta: null, fuente: 'pendiente' };
    },

    // Citas confirmadas (futuras) del médico que caen dentro de unos rangos de fechas {desde, hasta}.
    citasEnFechas: async function (uid, rangos) {
      if (!rangos || !rangos.length) return [];
      var r = await sb.from('citas').select('id, inicio, nombre_paciente').eq('medico_id', uid).eq('estado', 'confirmada')
        .gt('inicio', new Date().toISOString()).order('inicio').limit(500);
      if (r.error) return [];
      var dia = function (d) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Tegucigalpa' }).format(d); };
      return (r.data || []).filter(function (c) {
        var d = dia(new Date(c.inicio));
        return rangos.some(function (x) { return d >= x.desde && d <= (x.hasta || x.desde); });
      });
    },

    // Pregunta qué hacer con las citas que caen en días que se van a cerrar. Responde 'cancelar', 'mantener' o 'volver'.
    preguntarCitas: function (citas) {
      var TZ = 'America/Tegucigalpa', esc = App.escapar;
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
          '<ul>' + citas.slice(0, max).map(function (c) { return '<li><strong>' + esc(cuando(c)) + '</strong> · ' + esc(c.nombre_paciente || 'Paciente') + '</li>'; }).join('') +
          (n > max ? '<li class="mas">y ' + (n - max) + ' más</li>' : '') + '</ul>' +
          '<div class="dialogo-botones">' +
            '<button type="button" class="boton boton-peligro-lleno boton-dos-lineas" data-r="cancelar">Cancelarlas y avisar a los pacientes<small>Les llegará un mensaje por WhatsApp para elegir otra fecha.</small></button>' +
            '<button type="button" class="boton boton-secundario boton-dos-lineas" data-r="mantener">Mantenerlas<small>Usted deberá atender a esos pacientes en la fecha y hora agendadas.</small></button>' +
            '<button type="button" class="enlace-boton" data-r="volver">Volver a editar las fechas</button>' +
          '</div></div>';
        document.body.appendChild(fondo);
        fondo.querySelector('[data-r="cancelar"]').focus();
        fondo.querySelectorAll('[data-r]').forEach(function (b) {
          b.addEventListener('click', function () { fondo.remove(); resolver(b.dataset.r); });
        });
      });
    },

    vigilarRegistro: function (sesion) {
      var CLAVE = 'aidu-actividad', LIMITE = 60 * 60 * 1000;
      var leer = function () { try { return Number(localStorage.getItem(CLAVE)) || 0; } catch (e) { return 0; } };
      var marcar = function () { try { localStorage.setItem(CLAVE, String(Date.now())); } catch (e) { /* sin almacenamiento */ } };
      var cerrar = async function () {
        try { localStorage.removeItem(CLAVE); } catch (e) { /* nada */ }
        await sb.auth.signOut();
        irA('/cuenta?modo=entrar&inactiva=1&siguiente=' + encodeURIComponent(location.pathname));
      };
      var vencida = function () {
        var ultima = Math.max(leer(), Date.parse(sesion.user.last_sign_in_at || 0) || 0);
        return Date.now() - ultima > LIMITE;
      };
      if (vencida()) { cerrar(); return true; }
      marcar();
      var ultimaMarca = Date.now();
      ['pointerdown', 'keydown', 'input', 'scroll', 'touchstart'].forEach(function (ev) {
        window.addEventListener(ev, function () { if (Date.now() - ultimaMarca > 30000) { ultimaMarca = Date.now(); marcar(); } }, { passive: true, capture: true });
      });
      setInterval(function () { if (vencida()) cerrar(); }, 60000);
      document.addEventListener('visibilitychange', function () { if (!document.hidden && vencida()) cerrar(); });
      return false;
    },

    estados: {
      borrador: { texto: 'Registro incompleto', clase: 'estado-gris' },
      en_revision: { texto: 'En revisión', clase: 'estado-ambar' },
      aprobado: { texto: 'Aprobado · en configuración', clase: 'estado-azul' },
      rechazado: { texto: 'Requiere cambios', clase: 'estado-rojo' },
      activo: { texto: 'Activo', clase: 'estado-verde' },
      pausado: { texto: 'Pausado', clase: 'estado-gris' }
    },

    // Mensajes de error de Supabase traducidos para el usuario.
    traducirError: function (e) {
      var m = (e && (e.message || e.error_description || e.msg)) || '';
      if (/Invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.';
      if (/Email not confirmed/i.test(m)) return 'Primero confirme su correo con el enlace que le enviamos.';
      if (/User already registered/i.test(m)) return 'Ya existe una cuenta con este correo. Inicie sesión.';
      if (/Password should be at least/i.test(m)) return 'La contraseña debe tener al menos 8 caracteres.';
      if (/rate limit|too many/i.test(m)) return 'Demasiados intentos. Espere unos minutos e intente de nuevo.';
      if (/mime type|invalid_mime/i.test(m)) return 'Ese formato de imagen no es compatible. Use una foto JPG o PNG.';
      if (/exceeded the maximum|too large|Payload/i.test(m)) return 'La imagen es muy pesada (máximo 6 MB). Use una foto más liviana.';
      if (/network|fetch|load failed|timed out|offline/i.test(m)) return 'Se perdió la conexión un momento. Toque el botón de nuevo.';
      var codigo = (e && (e.code || e.name)) || '';
      codigo = String(codigo || m).slice(0, 60);
      return 'Ocurrió un error. Intente de nuevo o escríbanos a info@aidu.pro.' + (codigo ? ' (Detalle: ' + codigo + ')' : '');
    },

    // 'L 1,200' a partir de dígitos.
    miles: function (v) { var d = String(v == null ? '' : v).replace(/\D/g, ''); return d ? Number(d).toLocaleString('en-US') : ''; },

    // {desde:'2027-03-10', hasta:'2027-03-14', motivo:'Congreso'} → '10–14 mar 2027 · Congreso'
    rangoFechas: function (r) {
      if (!r || !r.desde) return '';
      var meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      var p = function (t) { var x = String(t).split('-'); return { a: +x[0], m: +x[1] - 1, d: +x[2] }; };
      var d = p(r.desde), h = p(r.hasta || r.desde), txt;
      if (r.desde === (r.hasta || r.desde)) txt = d.d + ' ' + meses[d.m] + ' ' + d.a;
      else if (d.a === h.a && d.m === h.m) txt = d.d + '–' + h.d + ' ' + meses[d.m] + ' ' + d.a;
      else if (d.a === h.a) txt = d.d + ' ' + meses[d.m] + ' – ' + h.d + ' ' + meses[h.m] + ' ' + d.a;
      else txt = d.d + ' ' + meses[d.m] + ' ' + d.a + ' – ' + h.d + ' ' + meses[h.m] + ' ' + h.a;
      return txt + (r.motivo ? ' · ' + r.motivo : '');
    },

    // Número del asistente (compartido) y enlace que el médico comparte con sus pacientes.
    asistente: '50492980013',
    enlacePacientes: function (m) {
      var tratamiento = m.titulo === 'Dra.' ? 'la Dra.' : 'el Dr.';
      // El código del médico va escondido al final con caracteres invisibles: el paciente solo ve el nombre,
      // y el asistente sabe a qué médico va aunque haya dos con el mismo nombre.
      var inv = ['\u200B', '\u200C', '\u200D', '\u2060'], abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', oculto = '';
      String(m.codigo || '').toUpperCase().split('').forEach(function (c) {
        var n = abc.indexOf(c);
        if (n >= 0) oculto += inv[Math.floor(n / 16)] + inv[Math.floor(n / 4) % 4] + inv[n % 4];
      });
      return 'https://wa.me/' + this.asistente + '?text=' + encodeURIComponent('Hola, quiero agendar una cita con ' + tratamiento + ' ' + (m.nombre || '').trim() + oculto);
    },

    escapar: function (t) {
      return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }
  };

  window.App = App;
})();
