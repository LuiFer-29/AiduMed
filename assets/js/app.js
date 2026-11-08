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
        irA('/cuenta?siguiente=' + encodeURIComponent(location.pathname + location.search));
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
      borrador: { texto: 'Registro sin terminar', clase: 'estado-gris' },
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
      if (/network|fetch/i.test(m)) return 'No hay conexión. Revise su internet e intente de nuevo.';
      return 'Ocurrió un error. Intente de nuevo o escríbanos a info@aidu.pro.';
    },

    escapar: function (t) {
      return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }
  };

  window.App = App;
})();
