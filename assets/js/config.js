// Configuración general del sitio.
// Para activar los botones de WhatsApp, escriba el número de Aidú Med
// (solo dígitos, con 504 al inicio). Ejemplo: '50499998888'
// Mientras esté vacío, los botones de WhatsApp quedan ocultos.
window.AIDU = {
  whatsapp: '50492980013',
  mensajeWhatsapp: 'Hola, quiero saber más sobre Aidú Med para mi consultorio.'
};

document.addEventListener('DOMContentLoaded', function () {
  var numero = (window.AIDU.whatsapp || '').replace(/\D/g, '');
  document.querySelectorAll('[data-whatsapp]').forEach(function (el) {
    if (!numero) { el.hidden = true; return; }
    el.href = 'https://wa.me/' + numero + '?text=' + encodeURIComponent(window.AIDU.mensajeWhatsapp);
    el.target = '_blank';
    el.rel = 'noopener';
    el.hidden = false;
  });
  var anio = document.querySelector('[data-anio]');
  if (anio) anio.textContent = new Date().getFullYear();
});
