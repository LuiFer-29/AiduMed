(function () {
  'use strict';
  var sb = App.sb;
  var form = document.getElementById('form-clave');
  var msg = document.getElementById('msg');
  function aviso(clase, texto) { msg.className = 'mensaje ' + clase; msg.textContent = texto; msg.hidden = false; }

  document.querySelector('[data-ver]').addEventListener('click', function () {
    var i = document.getElementById('clave'); var ver = i.type === 'password';
    i.type = ver ? 'text' : 'password'; this.textContent = ver ? 'Ocultar' : 'Mostrar';
  });

  setTimeout(async function () {
    var r = await sb.auth.getSession();
    if (!r.data.session) aviso('error', 'El enlace venció o ya fue usado. Pida uno nuevo desde "¿Olvidó su contraseña?".');
  }, 1200);

  form.addEventListener('submit', async function (ev) {
    ev.preventDefault();
    var clave = form.clave.value;
    if (clave.length < 8) return aviso('error', 'La contraseña debe tener al menos 8 caracteres.');
    var b = document.getElementById('guardar'); b.disabled = true;
    var r = await sb.auth.updateUser({ password: clave });
    b.disabled = false;
    if (r.error) return aviso('error', App.traducirError(r.error));
    aviso('ok', 'Contraseña actualizada. Le llevamos a su perfil…');
    setTimeout(function () { location.replace('/mi-perfil'); }, 1500);
  });
})();
