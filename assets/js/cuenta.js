(function () {
  'use strict';
  var sb = App.sb;
  var params = new URLSearchParams(location.search);
  var siguiente = params.get('siguiente') || '/mi-perfil';
  if (!/^\/[\w\-\/?=&%.]*$/.test(siguiente)) siguiente = '/mi-perfil'; // solo rutas internas
  var modo = params.get('modo') === 'entrar' ? 'entrar' : 'crear';

  var $ = function (id) { return document.getElementById(id); };
  var vistas = ['vista-acceso', 'vista-revisar', 'vista-recuperar'];
  function mostrar(v) { vistas.forEach(function (id) { $(id).hidden = id !== v; }); }

  // Si ya tiene sesión, seguir directo.
  sb.auth.getSession().then(function (r) {
    if (r.data && r.data.session) location.replace(siguiente);
  });

  function ponerModo(m) {
    modo = m;
    var crear = m === 'crear';
    $('tab-crear').setAttribute('aria-selected', crear);
    $('tab-entrar').setAttribute('aria-selected', !crear);
    $('titulo-acceso').textContent = crear ? 'Cree su cuenta' : 'Bienvenido de nuevo';
    $('sub-acceso').textContent = crear ? 'Con ella podrá registrar su consultorio y actualizar sus datos cuando quiera.' : 'Inicie sesión para ver y editar su perfil.';
    $('boton-acceso').textContent = crear ? 'Crear cuenta' : 'Iniciar sesión';
    $('clave').setAttribute('autocomplete', crear ? 'new-password' : 'current-password');
    $('ayuda-clave').hidden = !crear;
    $('olvide').hidden = crear;
    $('error-acceso').hidden = true;
  }
  $('tab-crear').addEventListener('click', function () { ponerModo('crear'); });
  $('tab-entrar').addEventListener('click', function () { ponerModo('entrar'); });
  ponerModo(modo);

  document.querySelectorAll('[data-ver]').forEach(function (b) {
    b.addEventListener('click', function () {
      var i = $(b.dataset.ver);
      var ver = i.type === 'password';
      i.type = ver ? 'text' : 'password';
      b.textContent = ver ? 'Ocultar' : 'Mostrar';
    });
  });

  function error(texto) { var e = $('error-acceso'); e.textContent = texto; e.hidden = !texto; }

  $('form-acceso').addEventListener('submit', async function (ev) {
    ev.preventDefault();
    var correo = this.correo.value.trim().toLowerCase();
    var clave = this.clave.value;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) return error('Escriba un correo válido.');
    if (clave.length < 8) return error('La contraseña debe tener al menos 8 caracteres.');
    error('');
    var boton = $('boton-acceso');
    boton.disabled = true;
    try {
      if (modo === 'crear') {
        var r = await sb.auth.signUp({ email: correo, password: clave, options: { emailRedirectTo: App.sitio + siguiente } });
        if (r.error) throw r.error;
        // Si el correo ya existía, Supabase responde sin identidades.
        if (r.data.user && r.data.user.identities && r.data.user.identities.length === 0) {
          ponerModo('entrar');
          return error('Ya existe una cuenta con este correo. Inicie sesión.');
        }
        if (r.data.session) return location.replace(siguiente);
        $('correo-enviado').textContent = correo;
        mostrar('vista-revisar');
      } else {
        var r2 = await sb.auth.signInWithPassword({ email: correo, password: clave });
        if (r2.error) throw r2.error;
        location.replace(siguiente);
      }
    } catch (e) {
      error(App.traducirError(e));
    } finally {
      boton.disabled = false;
    }
  });

  $('olvide').addEventListener('click', function () { mostrar('vista-recuperar'); });
  $('volver-acceso').addEventListener('click', function () { mostrar('vista-acceso'); });
  $('volver-acceso-2').addEventListener('click', function () { mostrar('vista-acceso'); ponerModo('entrar'); });

  $('form-recuperar').addEventListener('submit', async function (ev) {
    ev.preventDefault();
    var correo = this.correo.value.trim().toLowerCase();
    var msg = $('msg-recuperar');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) { msg.className = 'mensaje error'; msg.textContent = 'Escriba un correo válido.'; msg.hidden = false; return; }
    var r = await sb.auth.resetPasswordForEmail(correo, { redirectTo: App.sitio + '/nueva-contrasena' });
    msg.hidden = false;
    if (r.error) { msg.className = 'mensaje error'; msg.textContent = App.traducirError(r.error); return; }
    msg.className = 'mensaje ok';
    msg.textContent = 'Si existe una cuenta con ese correo, le llegará un enlace en unos minutos.';
  });
})();
