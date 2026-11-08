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

    escapar: function (t) {
      return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }
  };

  window.App = App;
})();
