(function () {
  'use strict';
  var sb = App.sb;
  var form = document.getElementById('form-clave');
  var msg = document.getElementById('msg');
  function aviso(clase, texto) { msg.className = 'mensaje ' + clase; msg.textContent = texto; msg.hidden = false; }
  // Invitación de un médico a su asistente: primera contraseña.
  var bienvenida = new URLSearchParams(location.search).get('bienvenida');
  if (bienvenida) {
    document.querySelector('h1').textContent = 'Cree su contraseña';
    document.querySelector('.sub').textContent = 'Con su correo y esta contraseña entrará a la agenda del médico. Use al menos 8 caracteres.';
  }

  document.querySelector('[data-ver]').addEventListener('click', function () {
    var i = document.getElementById('clave'); var ver = i.type === 'password';
    i.type = ver ? 'text' : 'password'; this.textContent = ver ? 'Ocultar' : 'Mostrar';
  });

  setTimeout(async function () {
    var r = await sb.auth.getSession();
    if (!r.data.session) aviso('error', bienvenida ? 'El enlace venció o ya fue usado. Pídale al médico que le reenvíe la invitación desde su panel.' : 'El enlace venció o ya fue usado. Pida uno nuevo desde "¿Olvidó su contraseña?".');
  }, 1200);

  form.addEventListener('submit', async function (ev) {
    ev.preventDefault();
    var clave = form.clave.value;
    if (clave.length < 8) return aviso('error', 'La contraseña debe tener al menos 8 caracteres.');
    var b = document.getElementById('guardar'); b.disabled = true;
    var r = await sb.auth.updateUser({ password: clave });
    b.disabled = false;
    if (r.error) return aviso('error', App.traducirError(r.error));
    aviso('ok', bienvenida ? 'Contraseña creada. Le llevamos a la agenda…' : 'Contraseña actualizada. Le llevamos a su perfil…');
    setTimeout(function () { location.replace('/mi-perfil'); }, 1500);
  });
})();
