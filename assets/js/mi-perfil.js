(async function () {
  'use strict';
  var sesion = await App.requerirSesion();
  var $ = function (id) { return document.getElementById(id); };
  $('correo-sesion').textContent = sesion.user.email;
  $('salir').addEventListener('click', App.salir);

  var p = null;
  try { p = await App.miPerfil(sesion.user.id); } catch (e) { console.error(e); }
  if (!p) { location.replace('/registro'); return; }

  var textos = {
    borrador: 'Su registro está incompleto. Termínelo para que podamos revisarlo.',
    en_revision: 'Estamos verificando su colegiación. Le escribiremos por WhatsApp en las próximas 24 horas.',
    aprobado: 'Su registro fue aprobado. Estamos configurando su asistente y le contactaremos para probarlo juntos.',
    rechazado: 'Necesitamos que corrija algunos datos. Revise la nota abajo y vuelva a enviar su registro.',
    activo: 'Su asistente está funcionando. Puede actualizar sus horarios y servicios cuando quiera.',
    pausado: 'Su asistente está en pausa. Escríbanos a info@aidu.pro para reactivarlo.'
  };
  var est = App.estados[p.estado] || App.estados.borrador;
  $('saludo').textContent = 'Hola, ' + [p.titulo, p.nombre].filter(Boolean).join(' ');
  $('estado').textContent = est.texto;
  $('estado').className = 'estado ' + est.clase;
  $('estado-texto').textContent = textos[p.estado] || '';
  if (p.estado === 'borrador') $('editar').textContent = 'Continuar registro';
  if (p.estado === 'rechazado') $('editar').textContent = 'Corregir y reenviar';
  if (p.nota_admin && (p.estado === 'rechazado' || p.estado === 'pausado')) { $('nota-admin').textContent = (p.estado === 'pausado' ? 'Motivo de la pausa: ' : 'Nota del equipo de Aidú Med: ') + p.nota_admin; $('nota-admin').hidden = false; }

  function llenar(id, pares) {
    $(id).innerHTML = pares.filter(function (x) { return x[1]; }).map(function (x) {
      return '<div><dt>' + App.escapar(x[0]) + '</dt><dd>' + App.escapar(x[1]) + '</dd></div>';
    }).join('') || '<div><dd class="ayuda">Sin datos todavía.</dd></div>';
  }
  var servicios = (p.servicios || []).map(function (s) { return s.nombre + ' · ' + s.duracion + (s.precio ? ' · L ' + s.precio : ''); }).join('\n');
  llenar('d-profesional', [
    ['Nombre', [p.titulo, p.nombre].filter(Boolean).join(' ')],
    ['Especialidad', p.especialidad === 'Otra' ? p.especialidad_otra : p.especialidad],
    ['Colegiación', p.colegiacion],
    ['Plan elegido', p.plan],
    ['Descripción', p.descripcion]
  ]);
  llenar('d-consultorio', [
    ['Consultorio', p.consultorio], ['Dirección', p.direccion],
    ['WhatsApp del consultorio', p.whatsapp_consultorio], ['Teléfono', p.telefono_consultorio],
    ['Consultas que el asistente no resuelve', p.derivar_a === 'Otro número' ? p.whatsapp_secretaria : (p.derivar_a ? 'Al WhatsApp del consultorio' : '')]
  ]);
  llenar('d-horarios', [
    ['Servicios', servicios],
    ['Días', (p.dias_atencion || []).join(', ')],
    ['Horario', p.hora_desde ? String(p.hora_desde).slice(0, 5) + ' a ' + String(p.hora_hasta).slice(0, 5) : ''],
    ['Vacaciones', (p.vacaciones || []).join(', ') + (p.otras_fechas ? '\n' + p.otras_fechas : '')]
  ]);
  $('cargando').hidden = true;
  $('perfil').hidden = false;
})();
