// Exercises the actual TypeScript methods, with HTTP and dialogs replaced by local fakes.
// Run: node --test tests/reservation-review.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { of, Subject, firstValueFrom, takeUntil } = require('rxjs');

function source(path) {
  return ts.createSourceFile(path, fs.readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
}
function evaluate(code, globals = {}) {
  const module = { exports: {} };
  const js = ts.transpileModule(code, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022
  }}).outputText;
  vm.runInNewContext(js, { module, exports: module.exports, ...globals });
  return module.exports;
}
function actualMethods(path, names, globals) {
  const sf = source(path);
  const cls = sf.statements.find(ts.isClassDeclaration);
  const members = names.map(name => {
    const node = cls.members.find(member => member.name?.getText(sf) === name);
    assert.ok(node, 'Missing actual member ' + name);
    return node.getText(sf);
  });
  return evaluate('class UnderTest {' + members.join('\n') + '}\nmodule.exports = UnderTest;', globals);
}
const api = 'src/app/core/services/api/';
const screens = [
  ['booking-one-time', 'getPuntualReservations', 'reservaPuntualService', '/reservas-puntuales', 'Puntual'],
  ['booking-recurrent', 'getRecurrentReservations', 'reservaRecurrenteService', '/reservas-recurrentes', 'Recurrent'],
  ['booking-schools', 'getReservations', 'reservaService', '/reservas', '']
];
const revision = {
  alcance: 'RESERVAS_REVISABLES_AUTORIZADAS', revisadas: 2, actualizadas: 1, sinCambios: 0,
  fallidas: 1, omitidas: 0, completa: false,
  resultados: [{
    reservaDto: { uuid: 'private-uuid', numeroReserva: 'R-1', numeroTasa: '42538', estadoReserva: 'EN_CURSO' },
    estadoAnterior: 'PENDIENTE', resultado: 'ACTUALIZADA',
    motivo: 'Pago confirmado por RUAT', ruat: 'PAGO_CONFIRMADO'
  }, {
    reservaDto: { uuid: 'failed-private-uuid', numeroReserva: 'E-0001/26' }, resultado: 'ERROR',
    motivo: 'RUAT no disponible', ruat: 'NO_DISPONIBLE'
  }]
};
for (const [folder, method, field, endpoint, kind] of screens) {
  const path = 'src/app/pages/modules/' + folder + '/' +
    (folder === 'booking-schools' ? 'booking-periodo' : folder) + '.component.ts';
  test(folder + ': one list GET, backend rows and full report, no automatic frontend writes', async () => {
    const shown = [], requests = [];
    const Class = actualMethods(path, [method], {
      showReservationRevision: report => shown.push(report), firstValueFrom, takeUntil, clearTimeout
    });
    const component = new Class();
    const page = { content: [{ uuid: 'row', estadoReserva: 'EN_CURSO' }], totalElements: 1, revision };
    Object.assign(component, {
      currentPage: 1, pageSize: 5, requestVersion: 0, listRequestVersion: 0,
      filters: { typeReserva: 'periodo' }, cancelListRequest: new Subject(),
      enrichReservationsForDisplay: rows => rows,
      getPaginationFilters: () => ({}),
      ['get' + kind + 'ReservationFilters']: () => ({}),
      [field]: { getAll: (...args) => { requests.push(args); return of(page); }},
      handleError: error => { throw error; }
    });
    await component[method]();
    assert.equal(requests.length, 1);
    assert.equal(component.reservasList.content, page.content);
    assert.equal(component.reservasList.revision, revision);
    assert.equal(shown[0], revision);
    assert.equal(component.loading, false);
  });
  test(folder + ': late response cannot overwrite a newer list or show its report', async () => {
    const shown = [], pending = new Subject();
    const Class = actualMethods(path, [method], {
      showReservationRevision: report => shown.push(report), firstValueFrom, takeUntil, clearTimeout
    });
    const component = new Class(), latest = { content: ['newer'] };
    Object.assign(component, {
      currentPage: 1, pageSize: 5, requestVersion: 0, listRequestVersion: 0,
      filters: {}, cancelListRequest: new Subject(), reservasList: latest,
      getPaginationFilters: () => ({}),
      ['get' + kind + 'ReservationFilters']: () => ({}),
      [field]: { getAll: () => pending },
      enrichReservationsForDisplay: rows => rows,
      handleError: error => { throw error; }
    });
    const running = component[method]();
    component.requestVersion++;
    component.listRequestVersion++;
    pending.next({ content: ['old'], revision });
    pending.complete();
    await running;
    assert.equal(component.reservasList, latest);
    assert.equal(shown.length, 0);
  });
}
test('all four services use their own list URL and encode read-only exports', () => {
  for (const [filename, endpoint] of [
    ['reserva-puntual', '/reservas-puntuales'], ['reserva-recurrente', '/reservas-recurrentes'],
    ['reserva', '/reservas'], ['reserva-periodo', '/reservas-periodo']
  ]) {
    class HttpParams {
      values = {};
      set(k, v) { this.values[k] = String(v); return this; }
    }
    let called;
    const Class = actualMethods(api + filename + '.service.ts', ['apiUrl', 'getAll'], {
      HttpParams, environment: { backendUrl: '/api' },
      apiGet: (http, url, operation, options) => called = { url, options }
    });
    new Class().getAll(0, 5, { typeReserva: 'periodo', revisarEstados: false });
    assert.equal(called.url, '/api' + endpoint);
    assert.equal(called.options.params.values.revisarEstados, 'false');
  }
});
const sf = source(api + 'reserva.service.ts');
const functions = sf.statements.filter(node => ts.isFunctionDeclaration(node) &&
  ['reservationRevisionText', 'showReservationRevision'].includes(node.name.text)).map(n => n.getText(sf)).join('\n');

test('report includes counts, identifiers, before/after, reasons and failed RUAT', () => {
  const { reservationRevisionText } = evaluate(functions);
  const text = reservationRevisionText(revision);
  for (const expected of ['Actualizadas: 1', 'Fallidas: 1', '42538', 'PENDIENTE → EN_CURSO',
    'Pago confirmado por RUAT', 'E-0001/26', 'RUAT no disponible']) assert.ok(text.includes(expected), expected);
  assert.ok(!text.includes('private-uuid'));
});
test('report uses textContent (not interpolated HTML) and warns about incomplete review', () => {
  let shown;
  const { showReservationRevision } = evaluate(functions, {
    Swal: { fire: data => { shown = data; }},
    document: { createElement: () => ({ style: {} }) }
  });
  const malicious = { ...revision, resultados: [{ ...revision.resultados[0], motivo: '<img src=x onerror=alert(1)>' }] };
  showReservationRevision(malicious);
  assert.equal(shown.icon, 'warning');
  assert.ok(shown.html.textContent.includes('<img src=x onerror=alert(1)>'));
  assert.equal(shown.html.innerHTML, undefined);
});
test('unchanged successful review does not open a misleading changes dialog', () => {
  let called = false;
  const { showReservationRevision } = evaluate(functions, {
    Swal: { fire: () => called = true }, document: { createElement: () => { throw Error('unexpected dialog'); } }
  });
  showReservationRevision(undefined);
  showReservationRevision({ ...revision, actualizadas: 0, fallidas: 0, omitidas: 0, completa: true });
  assert.equal(called, false);
});

for (const folder of ['one-time', 'recurrent', 'school']) {
  const path = 'src/app/pages/modals/modal-booking-' + folder + '/modal-booking-' + folder + '.component.ts';
  test(folder + ': manual consultation processes every selection and refreshes once', async () => {
    const Class = actualMethods(path, ['consultPaymentInModal']);
    const consulted = [], emitted = [];
    const reservations = ['PENDIENTE', 'COMPLETADA', 'CANCELADA', 'PAGADA', 'PENDIENTE']
      .map((estadoReserva, i) => ({ uuid: 'private-' + i, numeroReserva: 'R-' + i, numeroTasa: i === 2 ? undefined : String(i), estadoReserva }));
    const rows = folder === 'school' ? reservations : reservations.map(reservaDto => ({ reservaDto }));
    const component = new Class();
    Object.assign(component, {
      row: rows[0], selectedRows: rows, accion: 'consult', isConsultingRuat: false,
      ruatService: { consultReservationPayment: async reservaDto => {
        consulted.push(reservaDto);
        return { reservaDto, type: reservaDto.numeroTasa ? 'success' : 'warning', text: 'Resultado' };
      }},
      emitList: { emit: () => emitted.push(true) }
    });
    await component.consultPaymentInModal();
    assert.deepEqual(consulted, reservations);
    assert.equal(component.consultationResults.length, 5);
    assert.equal(component.consultationResults[2].type, 'warning');
    assert.equal(component.isConsultingRuat, false);
    assert.equal(emitted.length, 1);
    assert.equal(component.activeTab, folder === 'recurrent' ? 3 : 2);
    assert.equal(reservations[2].estadoReserva, 'CANCELADA');
    const html = fs.readFileSync(path.replace('.ts', '.html'), 'utf8');
    assert.ok(html.includes('*ngFor="let consultationResult of consultationResults"'));
    assert.ok(html.includes('consultationResults.length'));
    assert.ok(!html.includes('consultationResult ? 1 : 0'));
    // A detail-modal click consults only that row even if a previous selection exists.
    component.accion = 'show';
    consulted.length = 0;
    await component.consultPaymentInModal();
    assert.deepEqual(consulted, [reservations[0]]);
    assert.equal(component.activeTab, folder === 'recurrent' ? 3 : 2);
    assert.equal(component.consultationResult, component.consultationResults[0]);
  });
}
test('report never uses a UUID fallback and does not call terminal rows pending review', () => {
  const { reservationRevisionText } = evaluate(functions);
  const text = reservationRevisionText({ ...revision, resultados: [
    { reservaDto: { uuid: 'NEVER-SHOW-THIS', numeroTasa: '42' }, resultado: 'ERROR', motivo: 'Fallo', ruat: 'NO_CONFIRMADO' },
    { reservaDto: { numeroReserva: 'COMPLETED-ROW' }, resultado: 'SIN_CAMBIOS', motivo: 'Estado terminal', ruat: 'NO_REQUERIDO' }
  ] });
  assert.ok(text.includes('Reserva sin número registrado'));
  assert.ok(text.includes('Tasa 42'));
  assert.ok(!text.includes('NEVER-SHOW-THIS'));
  assert.ok(!text.includes('COMPLETED-ROW'));
  assert.ok(!text.includes('null'));
});

const ruatPath = 'src/app/core/services/ruatRequest.service.ts';
class HttpErrorResponse extends Error {
  constructor(status, error, origin) {
    super('HTTP ' + status);
    this.status = status;
    this.error = error;
    this.headers = { get: key => key === 'X-Response-Origin' ? origin : null };
  }
}
function consultationService(response) {
  const Class = actualMethods(ruatPath, ['consultReservationPayment', 'isUnpaidPaymentResponse',
    'getResponsePayload', 'getResponseData', 'getResponseMessage', 'canContinue', 'firstText'], { HttpErrorResponse });
  const instance = new Class(), writes = [];
  Object.assign(instance, {
    checkFeePayment: () => of(response),
    pagoService: { save: body => { writes.push(body); return of(body); }}
  });
  return { instance, writes };
}
const confirmed = { continuarFlujo: true, pagoTasa: { numeroTasa: '42538',
  folio: 'folio', fechaPago: '17/09/2026', montoPago: '2560.00' } };
test('manual payment registration requires confirmed matching, complete RUAT data', async () => {
  for (const response of [
    { ...confirmed, continuarFlujo: false },
    { ...confirmed, pagoTasa: { ...confirmed.pagoTasa, numeroTasa: 'other' }},
    { ...confirmed, pagoTasa: { ...confirmed.pagoTasa, fechaPago: '31/02/2026' }},
    { ...confirmed, pagoTasa: { ...confirmed.pagoTasa, folio: '' }},
    { ...confirmed, pagoTasa: { ...confirmed.pagoTasa, montoPago: 'invalid' }}
  ]) {
    const { instance, writes } = consultationService(response);
    const row = { uuid: 'r', numeroTasa: '42538', estadoReserva: 'PENDIENTE' };
    const result = await instance.consultReservationPayment(row);
    assert.notEqual(result.type, 'success');
    assert.equal(writes.length, 0);
    assert.equal(row.estadoReserva, 'PENDIENTE');
  }
});
test('manual consultation preserves terminal status and avoids duplicate payments', async () => {
  const { instance, writes } = consultationService(confirmed);
  const row = { uuid: 'r', numeroTasa: '42538', estadoReserva: 'COMPLETADA' };
  assert.equal((await instance.consultReservationPayment(row)).type, 'success');
  assert.equal((await instance.consultReservationPayment(row)).type, 'success');
  assert.equal(writes.length, 1);
  assert.equal(writes[0].fechaPago.getDate(), 17);
  assert.equal(writes[0].fechaPago.getMonth(), 8);
  assert.equal(writes[0].montoPagado, 2560);
  assert.equal(row.estadoReserva, 'COMPLETADA');
});
test('missing tasa and failed payment save produce an explicit result, not false success', async () => {
  const { instance, writes } = consultationService(confirmed);
  assert.equal((await instance.consultReservationPayment({})).type, 'warning');
  assert.equal(writes.length, 0);
  instance.pagoService.save = () => { throw Error('database unavailable'); };
  assert.equal((await instance.consultReservationPayment({ uuid: 'r', numeroTasa: '42538' })).type, 'error');
});
const monthlyPage = 'src/app/pages/modals/mensuality/mensuality.component.ts';
const monthlyModal = 'src/app/pages/modals/modal-booking-school/modal-booking-school.component.ts';

const featureConstants = evaluate(fs.readFileSync('src/app/core/constants/Features.ts', 'utf8'));
test('organization filter values come from the same constants as organization creation', () => {
  assert.deepEqual(Array.from(featureConstants.TipoOrganizacionOptions, option => option.value),
    ['ASOCIACION', 'CLUB', 'ESCUELA_MUNICIPAL', 'ORGANIZACION']);
  assert.equal(featureConstants.OrganizacionReservaOptions.length, 6);
  for (const [folder, method] of [['booking-one-time', 'getPaginationFilters'], ['booking-recurrent', 'getRecurrentReservationFilters']]) {
    const path = `src/app/pages/modules/${folder}/${folder}.component`;
    const Class = actualMethods(path + '.ts', [method], featureConstants);
    const component = new Class();
    for (const option of featureConstants.OrganizacionReservaOptions) {
      component.filters = { tipoOrganizacion: option.value };
      const query = component[method]();
      if (option.value === 'SIN_ORGANIZACION') {
        assert.equal(query.conOrganizacion, false); assert.equal(query.tipoOrganizacion, undefined);
      } else if (option.value === 'CON_ORGANIZACION') {
        assert.equal(query.conOrganizacion, true); assert.equal(query.tipoOrganizacion, undefined);
      } else assert.equal(query.tipoOrganizacion, option.value);
      assert.equal(query.tipoBeneficiario, undefined);
    }
    const html = fs.readFileSync(path + '.html', 'utf8');
    assert.ok(!html.includes('Beneficiario'));
    assert.ok(html.includes('tipoOrganizacionOptions'));
    const code = fs.readFileSync(path + '.ts', 'utf8');
    assert.ok(code.includes('tipoOrganizacionOptions = OrganizacionReservaOptions'));
    assert.ok(!/asociacion_deportiva|club_deportivo|unidad_educativa|empresa_privada|institucion_publica/.test(code));
  }
});

test('all real columns in the three lists request backend sorting without rerunning RUAT', () => {
  const backend = fs.readFileSync('../deportes-be/src/main/java/com/gamq/deportes/service/implement/ReservaServiceImpl.java', 'utf8');
  const common = [...backend.matchAll(/Map.entry\("([^"]+)", "[^"]+"\)/g)].map(match => match[1]);
  for (const [folder, method] of screens) {
    const file = `src/app/pages/modules/${folder}/${folder === 'booking-schools' ? 'booking-periodo' : folder}.component.ts`;
    const code = fs.readFileSync(file, 'utf8');
    const initializer = code.match(/this.itemsList = (\[[\s\S]*?\n    \]);/)[1];
    const { columns } = evaluate(`class List { canActivate = []; contribuyente = false; columns = ${initializer}; }
      module.exports = new List();`);
    const Class = actualMethods(file, ['onSortChange']);
    const component = new Class(), calls = [];
    Object.assign(component, { itemsList: Array.from(columns, column => ({ ...column, sortable: true })),
      filters: {}, [method]: review => calls.push(review) });
    const kind = folder === 'booking-one-time' ? 'puntual' : folder === 'booking-recurrent' ? 'recurrente' : 'periodo';
    const childKeys = backend.match(new RegExp(`Set<String> ${kind} = Set.of\\(([\\s\\S]*?)\\);`))?.[1] || '';
    for (const column of columns) {
      const key = column.prop.replace(/^reservaDto\./, '');
      assert.ok(common.includes(key) || childKeys.includes('"' + key + '"'), `${folder}: unmapped ${column.prop}`);
      component.onSortChange({ column: column.prop, direction: 'desc' });
      assert.equal(component.sortBy || component.filters.sortBy, column.prop);
      assert.equal(component.currentPage, 1);
    }
    assert.equal(calls.length, columns.length);
    assert.ok(calls.every(value => value === false));
    component.onSortChange({ column: 'arbitrary.path', direction: 'asc' });
    assert.equal(calls.length, columns.length);
    assert.ok(code.includes('this.itemsList.map(column => ({ ...column, sortable: true }))'));
  }
});

test('No Show and complete usage use query-parameter root endpoints, not general DTO updates', () => {
  const requests = [];
  const Class = actualMethods(api + 'reserva.service.ts', ['apiUrl', 'markNoShow', 'completeUsage'], {
    environment: { backendUrl: '/api' },
    HttpParams: class { values = {}; set(k, v) { this.values[k] = v; return this; } },
    apiPut: (_, url, body, operation, options) => requests.push({ url, body, params: options.params.values })
  });
  const service = new Class();
  service.markNoShow('root', 'observación'); service.completeUsage('root');
  assert.deepEqual(requests, [
    { url: '/api/reservas/update-not-show', body: null, params: { uuid: 'root', observacion: 'observación' } },
    { url: '/api/reservas/completar', body: null, params: { uuid: 'root' } }
  ]);
});

test('schedule request sends only schedule data and cannot send new prices, payer or status', () => {
  let request;
  const Class = actualMethods(api + 'reserva-puntual.service.ts', ['apiUrl', 'update'], {
    environment: { backendUrl: '/api' }, HttpParams: class { values = {}; set(k, v) { this.values[k] = v; return this; } },
    apiPut: (_, url, body, operation, options) => request = { url, body, params: options.params.values }
  });
  new Class().update({ uuid: 'child', fechaUso: '2026-12-01', horaInicio: '10:00', horaFin: '11:00',
    observaciones: 'Cambio', precioBaseAplicado: 999, reservaDto: { montoTotal: 999, estadoReserva: 'COMPLETADA' } });
  assert.equal(request.url, '/api/reservas-puntuales/cambiar-horario');
  assert.equal(request.params.uuid, 'child');
  assert.deepEqual(Object.keys(request.body), ['fechaUso', 'horaInicio', 'horaFin', 'observaciones']);
});

const schoolStatus = evaluate(fs.readFileSync('src/app/core/constants/Estados.ts', 'utf8'), {
  require: path => {
    assert.equal(path, './Features');
    return { TipoOrganizacion: { ESCUELA_MUNICIPAL: 'ESCUELA_MUNICIPAL' } };
  }
});
const recurrentModal = 'src/app/pages/modals/modal-booking-recurrent/modal-booking-recurrent.component.ts';
for (const kind of ['one-time', 'recurrent']) {
  test(kind + ': manual use actions display only the root state confirmed by the backend', async () => {
    for (const action of ['NO_SHOW', 'COMPLETADA']) for (const validReply of [true, false]) {
      const Class = actualMethods(`src/app/pages/modals/modal-booking-${kind}/modal-booking-${kind}.component.ts`,
        ['markNoShowData', 'canMarkNoShow', 'confirmUsage'], {
          ...schoolStatus, Swal: { fire: async () => ({ isConfirmed: true }) }
        });
      const component = new Class(), messages = [], calls = [];
      const original = schoolBase({ tipoReserva: kind === 'one-time' ? 'puntual' : 'recurrente', esReservaGratuita: false });
      const updated = { ...original, estadoReserva: action };
      Object.assign(component, { row: { reservaDto: original }, canActivate: ['ACTUALIZAR'], showLoading: false,
        reservaService: {
          markNoShow: (uuid, note) => { calls.push('no-show'); assert.equal(uuid, 'base'); assert.equal(note, 'Nota'); return of(validReply ? updated : original); },
          completeUsage: uuid => { calls.push('complete'); assert.equal(uuid, 'base'); return of(validReply ? updated : original); }
        }, emitList: { emit: () => calls.push('refresh') }, onCloseModal: () => calls.push('close'),
        notify: (_, type) => messages.push(type) });
      if (action === 'NO_SHOW') component.markNoShowData({ observation: 'Nota' });
      else component.confirmUsage();
      await new Promise(setImmediate);
      assert.equal(component.row.reservaDto, validReply ? updated : original);
      assert.equal(component.showLoading, false);
      assert.equal(calls.includes('refresh'), validReply);
      assert.equal(calls.includes('close'), validReply);
      assert.deepEqual(messages, [validReply ? 'success' : 'error']);
    }
  });
}
function schoolBase(overrides = {}) {
  return { uuid: 'base', numeroReserva: 'R-1', tipoReserva: 'recurrente', esReservaGratuita: true,
    estadoValidacion: 'APROBADA', estadoReserva: 'EN_CURSO',
    organizacionDto: { uuid: 'school', tipoOrganizacion: 'ESCUELA_MUNICIPAL' },
    tarifaDto: { uuid: 'tariff' },
    reservaRecurrenteDto: { activo: true, fechaInicio: '2026-01-01', fechaFin: '2026-08-31' }, ...overrides };
}

test('school completion eligibility uses the school organization and approved open states', () => {
  const utils = schoolStatus.StatusUtils;
  for (const state of ['PENDIENTE', 'PAGADA', 'EN_CURSO']) {
    assert.equal(utils.puedeCompletarReservaEscuela(schoolBase({ estadoReserva: state })), true);
  }
  for (const row of [undefined, schoolBase({ tipoReserva: 'puntual' }), schoolBase({ tipoReserva: 'periodo' }),
    schoolBase({ esReservaGratuita: false }), schoolBase({ organizacionDto: { tipoOrganizacion: 'CLUB' } }),
    schoolBase({ organizacionDto: undefined, motivoGratuidad: 'ESCUELA_MUNICIPAL' }),
    ...['SOLICITADA', 'CANCELADA', 'EXPIRADA', 'NO_SHOW', 'COMPLETADA'].map(estadoReserva => schoolBase({ estadoReserva })),
    ...['PENDIENTE', 'RECHAZADA', 'VENCIDA'].map(estadoValidacion => schoolBase({ estadoValidacion }))]) {
    assert.equal(utils.puedeCompletarReservaEscuela(row), false);
  }
});

test('shared table/card actions offer Completar instead of No Show for school bases, with permission', () => {
  const Class = actualMethods('src/app/shared/data-table/data-table.component.ts', ['canShow', 'showActions'],
    { statusData: schoolStatus });
  const table = new Class();
  table.actions = { check: 'Completar', process: 'No Show' };
  for (const estadoReserva of ['PENDIENTE', 'PAGADA', 'EN_CURSO']) {
    const row = { reservaDto: schoolBase({ estadoReserva }) };
    assert.equal(table.canShow('Completar', row), true);
    assert.equal(table.canShow('No Show', row), false);
    assert.deepEqual(Array.from(table.showActions(row), action => action.tooltip), ['Completar']);
  }
  const normal = schoolBase({ esReservaGratuita: false });
  assert.equal(table.canShow('Completar', normal), false);
  assert.equal(table.canShow('No Show', normal), true);
  assert.deepEqual(Array.from(table.showActions(normal), action => action.tooltip), ['No Show']);
  assert.equal(table.canShow('Completar', schoolBase({ estadoReserva: 'COMPLETADA' })), false);
  table.actions = { check: '', process: '' };
  assert.equal(table.showActions(schoolBase()).length, 0);
  const html = fs.readFileSync('src/app/pages/modules/booking-recurrent/booking-recurrent.component.html', 'utf8');
  assert.match(html, /check:\s*canActivate.includes\('ACTUALIZAR'\)\s*\?\s*'Completar'/);
  assert.match(html, /\(checkItemEmitter\)="openModal\(\$event,'completeModal','md'\)"/);
});

test('all school modal entry points open the confirmation; No Show remains for other reservations', () => {
  const Class = actualMethods(recurrentModal, ['openNoShowModal', 'canMarkNoShow', 'confirmUsage',
    'canCompleteSchoolReservation'], schoolStatus);
  const modal = new Class();
  modal.row = { reservaDto: schoolBase() };
  modal.canActivate = ['ACTUALIZAR'];
  assert.equal(modal.canCompleteSchoolReservation(), true);
  assert.equal(modal.canMarkNoShow(), false);
  modal.openNoShowModal();
  assert.equal(modal.accion, 'completeModal');
  modal.accion = 'show';
  modal.confirmUsage();
  assert.equal(modal.accion, 'completeModal');
  modal.canActivate = [];
  assert.equal(modal.canCompleteSchoolReservation(), false);
  modal.row.reservaDto.esReservaGratuita = false;
  modal.canActivate = ['ACTUALIZAR'];
  modal.openNoShowModal();
  assert.equal(modal.accion, 'noShowModal');
  assert.equal(modal.canMarkNoShow(), true);
  const html = fs.readFileSync(recurrentModal.replace('.ts', '.html'), 'utf8');
  const confirmation = html.slice(html.indexOf('<div class="modal-content" *ngIf="accion === \'completeModal\'">'),
    html.indexOf('<div class="modal-content modal-booking-recurrent"'));
  assert.match(confirmation, /\(click\)="onCloseModal\(\)">Cancelar/);
  assert.match(confirmation, /\[disabled\]="showLoading \|\| !canCompleteSchoolReservation\(\)"/);
  assert.match(confirmation, /\(click\)="completeSchoolReservation\(\)"/);
  assert.match(confirmation, /mensualidades existentes y su historial se conservarán/);
  assert.ok(!confirmation.includes('.uuid'));
});

test('school closure waits for the root endpoint and uses its confirmed DTO, with no RUAT call', async () => {
  const Class = actualMethods(recurrentModal, ['completeSchoolReservation', 'canCompleteSchoolReservation'], schoolStatus);
  const modal = new Class(), response = new Subject(), steps = [];
  const original = schoolBase(), updated = { ...original, estadoReserva: 'COMPLETADA' };
  Object.assign(modal, { row: { reservaDto: original }, canActivate: ['ACTUALIZAR'], showLoading: false,
    reservaService: { completeSchoolReservation: uuid => { assert.equal(uuid, 'base'); steps.push('request'); return response; } },
    emitList: { emit: () => steps.push('refresh') }, onCloseModal: () => steps.push('close'),
    notify: (_, type) => steps.push(type) });
  const running = modal.completeSchoolReservation();
  assert.equal(modal.row.reservaDto, original);
  assert.equal(modal.showLoading, true);
  await modal.completeSchoolReservation(); // double-click must not make a second request
  assert.deepEqual(steps, ['request']);
  response.next(updated); response.complete(); await running;
  assert.equal(modal.row.reservaDto, updated);
  assert.deepEqual(steps, ['request', 'refresh', 'close', 'success']);
  assert.equal(modal.showLoading, false);
});

test('school closure rejects failures, inconsistent replies and missing permission without false success', async () => {
  const Class = actualMethods(recurrentModal, ['completeSchoolReservation', 'canCompleteSchoolReservation'], schoolStatus);
  for (const result of [undefined, schoolBase(), schoolBase({ uuid: 'other', estadoReserva: 'COMPLETADA' }), Error('offline')]) {
    const modal = new Class(), original = schoolBase(), notices = [];
    Object.assign(modal, { row: { reservaDto: original }, canActivate: ['ACTUALIZAR'],
      reservaService: { completeSchoolReservation: () => { if (result instanceof Error) throw result; return of(result); } },
      emitList: { emit: () => assert.fail('No refresh on failure') }, onCloseModal: () => assert.fail('Keep confirmation open'),
      notify: (_, type) => notices.push(type) });
    await modal.completeSchoolReservation();
    assert.equal(modal.row.reservaDto, original);
    assert.deepEqual(notices, ['error']);
    assert.equal(modal.showLoading, false);
  }
  for (const [permissions, reserva] of [[[], schoolBase()], [['ACTUALIZAR'], schoolBase({ estadoReserva: 'COMPLETADA' })]]) {
    const modal = new Class();
    Object.assign(modal, { row: { reservaDto: reserva }, canActivate: permissions });
    await modal.completeSchoolReservation(); // no injected API: any unexpected write fails the test
    assert.equal(modal.showLoading, undefined);
  }
});

test('school closure service writes the root reservation through the protected dedicated endpoint', () => {
  let request;
  const Class = actualMethods(api + 'reserva.service.ts', ['apiUrl', 'completeSchoolReservation'], {
    HttpParams: class { values = {}; set(key, value) { this.values[key] = value; return this; } },
    environment: { backendUrl: '/api' }, apiPut: (_, url, body, operation, options) => request = { url, body, params: options.params.values }
  });
  new Class().completeSchoolReservation('base');
  assert.deepEqual(request, { url: '/api/reservas/completar-escuela', body: null, params: { uuid: 'base' } });
});

test('monthly selector excludes closed bases in every filter but retains open historical date ranges', () => {
  const Class = actualMethods(monthlyPage, ['isAvailableBaseReservation', 'applyReservaBaseFilters', 'selectReservaRecurrente'], schoolStatus);
  const component = new Class();
  const open = ['PENDIENTE', 'PAGADA', 'EN_CURSO'].map(estadoReserva => schoolBase({ estadoReserva }));
  const closed = ['COMPLETADA', 'CANCELADA', 'NO_SHOW', 'EXPIRADA', 'SOLICITADA'].map(estadoReserva => schoolBase({ estadoReserva }));
  const invalid = [schoolBase({ estadoValidacion: 'PENDIENTE' }), schoolBase({ tipoReserva: 'puntual' }),
    schoolBase({ reservaRecurrenteDto: { activo: false, fechaInicio: '2026-01-01', fechaFin: '2026-08-31' } }),
    schoolBase({ reservaRecurrenteDto: { activo: true } })];
  Object.assign(component, { catalogs: { recurrentReservations: [...open, ...closed, ...invalid] },
    isDateWithinReserva: () => true, getReferenceDateForReservationFilter: () => new Date(), hideCoveredReservations: false });
  for (const filter of ['todas', 'en_curso', 'pagadas', 'pendientes', 'activas']) {
    component.reservaBaseFilter = filter;
    component.applyReservaBaseFilters();
    assert.equal(component.catalogs.filteredRecurrentReservations.length, ['pagadas', 'pendientes'].includes(filter) ? 1 : 3);
    assert.ok(component.catalogs.filteredRecurrentReservations.every(row => open.includes(row)));
  }
  component.selection = {};
  component.selectReservaRecurrente(closed[0]);
  assert.equal(component.selection.baseReservation, undefined);
});

test('monthly lookup checks all pages, only reads authorized list states and never merges stale school rows', async () => {
  const Class = actualMethods(monthlyPage, ['getAvailableBaseReservations', 'isAvailableBaseReservation',
    'loadReservationsFromSchool'], schoolStatus);
  const component = new Class(), calls = [], base = schoolBase();
  Object.assign(component, { selection: { school: { uuid: 'school' } }, catalogs: {},
    reservationForm: { patchValue: () => {} }, applyReservaBaseFilters: () => {}, autoSelectBestReservaBase: () => {},
    reservaService: { getAll: (page, size, filters) => {
      calls.push({ page, size, filters });
      return of({ content: page === 0 ? [schoolBase({ estadoReserva: 'COMPLETADA' })]
        : [base, schoolBase({ organizacionDto: { uuid: 'other' } })], totalPages: 2 });
    } } });
  await component.loadReservationsFromSchool({ uuid: 'school', reservasDtoList: [schoolBase({ uuid: 'stale' })] });
  assert.deepEqual(Array.from(component.catalogs.recurrentReservations), [base]);
  assert.deepEqual(calls.map(r => r.page), [0, 1]);
  assert.ok(calls.every(r => r.filters.revisarEstados === false && r.filters.organization === 'school'));
  component.reservaService.getAll = () => { throw Error('offline'); };
  await component.loadReservationsFromSchool({ uuid: 'school', reservasDtoList: [base] });
  assert.equal(component.catalogs.recurrentReservations.length, 0);
});

test('late school lookup cannot overwrite another school selection', async () => {
  const Class = actualMethods(monthlyPage, ['loadReservationsFromSchool'], schoolStatus);
  const component = new Class();
  let resolve;
  Object.assign(component, { selection: { school: { uuid: 'school' } }, catalogs: {},
    reservationForm: { patchValue: () => {} }, getAvailableBaseReservations: () => new Promise(r => resolve = r),
    applyReservaBaseFilters: () => assert.fail('Stale selection'), autoSelectBestReservaBase: () => assert.fail('Stale selection') });
  const request = component.loadReservationsFromSchool({ uuid: 'school' });
  component.selection.school = { uuid: 'other' };
  resolve([schoolBase()]); await request;
  assert.equal(component.catalogs.recurrentReservations.length, 0);
});

test('monthly registration rechecks closure before creating a tasa, and validates refreshed tariff', async () => {
  const Class = actualMethods(monthlyPage, ['onSubmit'], { Swal: { fire: () => {} } });
  for (const scenario of ['closed', 'unavailable', 'invalid-tariff', 'changed-school', 'changed-base']) {
    const component = new Class(), steps = [];
    Object.assign(component, { isLoading: false, reservationForm: { invalid: false }, userRole: 'Admin',
      selection: { school: { uuid: 'school' }, baseReservation: schoolBase(), payer: {}, entrenador: 'Trainer' },
      getSelectedDetails: () => [{}], getAvailableBaseReservations: async uuid => {
        assert.equal(uuid, 'school'); steps.push('recheck');
        if (scenario === 'unavailable') throw Error('offline');
        if (scenario === 'changed-school') component.selection.school = { uuid: 'other' };
        if (scenario === 'changed-base') component.selection.baseReservation = schoolBase({ uuid: 'other' });
        return scenario === 'closed' ? [] : [schoolBase({ tarifaDto: undefined })];
      }, validateMensualidadTariffConfiguration: () => {
        assert.equal(component.selection.baseReservation.tarifaDto, undefined); return ['Tarifa no configurada'];
      }, handleError: () => steps.push('error') });
    await component.onSubmit(); // no create/save methods: either being called is a failure
    assert.deepEqual(steps, ['recheck', 'error']);
    assert.equal(component.isLoading, false);
  }
});
test('monthly registration and modal own separate flows, without a workflow base class', () => {
  const creation = source(monthlyPage), modal = source(monthlyModal);
  const names = sf => sf.statements.find(ts.isClassDeclaration).members.map(m => m.name?.getText(sf));
  for (const method of ['onSubmit', 'prepareReservaPeriodoData', 'createTasaInRuat', 'saveReservaPeriodo'])
    assert.ok(names(creation).includes(method), method);
  for (const method of ['consultPaymentInModal', 'openTicketModal', 'annularData', 'cancelReservaLocal'])
    assert.ok(names(modal).includes(method), method);
  assert.ok(!names(creation).includes('annularData'));
  assert.ok(!names(modal).includes('onSubmit'));
  assert.ok(!creation.text.includes('MensualityWorkflow'));
  assert.ok(!modal.text.includes('MensualityWorkflow'));
});
test('monthly create waits for RUAT before saving, and never saves after RUAT failure', async () => {
  for (const fail of [false, true]) {
    const Class = actualMethods(monthlyPage, ['onSubmit'], { Swal: { fire: () => {} } });
    const component = new Class(), steps = [];
    Object.assign(component, {
      isLoading: false, reservationForm: { invalid: false }, userRole: 'Admin',
      selection: { school: { uuid: 'school' }, baseReservation: { uuid: 'base', tarifaDto: { uuid: 'tariff' } }, payer: {}, entrenador: 'Trainer' },
      getAvailableBaseReservations: async () => [{ uuid: 'base', tarifaDto: { uuid: 'tariff' } }],
      getSelectedDetails: () => [{}], validateMensualidadTariffConfiguration: () => [],
      prepareReservaPeriodoData: () => ({ tipoReserva: 'periodo' }),
      createTasaInRuat: async () => { steps.push('ruat'); if (fail) throw Error('offline'); return '42'; },
      saveReservaPeriodo: async row => { steps.push('save'); assert.equal(row.numeroTasa, '42'); return row; },
      notify: () => {}, emitList: { emit: () => {} }, reservaGenerada: { emit: () => {} },
      onCloseModal: () => {}, handleError: () => steps.push('error')
    });
    await component.onSubmit();
    assert.deepEqual(steps, fail ? ['ruat', 'error'] : ['ruat', 'save']);
    assert.equal(component.isLoading, false);
  }
});
test('monthly manual annulment never calls the local cancellation until RUAT confirms', () => {
  for (const success of [false, true]) {
    const Class = actualMethods(monthlyModal, ['annularData']);
    const calls = [], component = new Class();
    Object.assign(component, {
      row: { uuid: 'r', numeroTasa: '42' },
      ruatService: { cancelTasa: () => of({ continuarFlujo: success }),
        canContinue: r => r.continuarFlujo, getResponseMessage: (_, fallback) => fallback },
      cancelReservaLocal: () => calls.push('local'), notify: () => {}
    });
    component.annularData({ motivo: 'Solicitud', observation: 'Observación' });
    assert.equal(calls.length, success ? 1 : 0);
  }
});

test('monthly DTO never enables automatic cancellation or creates a deadline', () => {
  const Class = actualMethods(monthlyPage, ['prepareReservaPeriodoData'], {
    EstadoValidacion: { APROBADA: 'APROBADA' }, EstadoReserva: { PENDIENTE: 'PENDIENTE' }
  });
  const component = new Class(), details = [{ mes: 9, año: 2026, estudianteEscuelaDto: { uuid: 'student' } }];
  Object.assign(component, {
    reservationForm: { value: {} }, selection: { school: { nombre: 'Escuela' } },
    getSelectedDetails: () => details, getTotalAmount: () => 10
  });
  const dto = component.prepareReservaPeriodoData();
  assert.equal(dto.tipoReserva, 'periodo');
  assert.equal(dto.cancelacionAutomatica, false);
  assert.equal(dto.fechaLimitePago, null);
  assert.equal(dto.reservasPeriodoDtoList, details);
  assert.equal(dto.estadoReserva, 'PENDIENTE');
});
test('a failed manual query is reported and cannot register a payment', async () => {
  const { instance, writes } = consultationService(confirmed);
  instance.checkFeePayment = () => { throw Error('offline'); };
  const row = { uuid: 'r', numeroTasa: '42538', estadoReserva: 'PENDIENTE' };
  const result = await instance.consultReservationPayment(row);
  assert.equal(result.type, 'error');
  assert.equal(result.reservaDto, row);
  assert.equal(writes.length, 0);
  assert.equal(row.estadoReserva, 'PENDIENTE');
});

const unpaidMessage = 'No Existe el registro de la tasa y otro ingreso.';
const unpaidResponse = { mensaje: unpaidMessage, continuarFlujo: false, observacion: null, pagoTasa: null };
const unpaidMessages = [unpaidMessage, 'La Tasa y Otro Ingreso no tiene pagos realizados.'];

test('known unpaid HTTP 404 is informational with the exact RUAT message and no local writes', async () => {
  for (const message of unpaidMessages) for (const wrapped of [false, true]) for (const asHttpError of [true, false]) {
    const data = { mensaje: message, observacion: null, pagoTasa: null };
    const response = { continuarFlujo: false, ...(wrapped ? { datos: data } : data) };
    const { instance, writes } = consultationService(response);
    if (asHttpError) instance.checkFeePayment = () => { throw new HttpErrorResponse(404, JSON.stringify(response), 'RUAT'); };
    const row = { uuid: 'r', numeroTasa: '42538', estadoReserva: 'PENDIENTE' };
    const result = await instance.consultReservationPayment(row);
    assert.equal(result.type, 'info');
    assert.equal(result.text, message);
    assert.equal(result.detalleLocal, undefined);
    assert.equal(row.estadoReserva, 'PENDIENTE');
    assert.equal(writes.length, 0);
    // This payment-specific interpretation must never authorize create/annul operations.
    assert.equal(instance.canContinue(response), false);
  }
});

test('other HTTP errors and local gateway errors never qualify as an unpaid query', async () => {
  for (const message of unpaidMessages) {
  const unpaidResponse = { mensaje: message, continuarFlujo: false, observacion: null, pagoTasa: null };
  for (const error of [
    new HttpErrorResponse(401, unpaidResponse, 'RUAT'),
    new HttpErrorResponse(500, unpaidResponse, 'RUAT'),
    new HttpErrorResponse(404, unpaidResponse, 'ruat-be'),
    new HttpErrorResponse(404, unpaidResponse, 'deportes-be'),
    new HttpErrorResponse(404, { ...unpaidResponse, detalle: { origen: 'ruat-be' } }),
    new HttpErrorResponse(404, { ...unpaidResponse, mensaje: 'Otro mensaje original' }, 'RUAT'),
    new HttpErrorResponse(404, { ...unpaidResponse, pagoTasa: confirmed.pagoTasa }, 'RUAT')
  ]) {
    const { instance, writes } = consultationService(confirmed);
    instance.checkFeePayment = () => { throw error; };
    const result = await instance.consultReservationPayment({ uuid: 'r', numeroTasa: '42538' });
    assert.equal(instance.isUnpaidPaymentResponse(error), false);
    assert.equal(result.type, 'error');
    assert.equal(result.text, error.error.mensaje);
    assert.equal(writes.length, 0);
  }
  }
});

test('RUAT message whitespace and content survive parsing, validation and local write errors', async () => {
  const message = '  Mensaje original\n &amp; <texto>  ';
  const { instance } = consultationService({ ...confirmed, mensaje: message });
  for (const response of [
    { mensaje: message }, { datos: { mensaje: message } }, message,
    JSON.stringify({ mensaje: message }), new HttpErrorResponse(400, { mensaje: message }, 'RUAT')
  ]) assert.equal(instance.getResponseMessage(response), message);
  instance.pagoService.save = () => { throw Error('database unavailable'); };
  const failure = await instance.consultReservationPayment({ uuid: 'r', numeroTasa: '42538' });
  assert.equal(failure.type, 'error');
  assert.equal(failure.text, message);
  assert.ok(failure.detalleLocal);
  const invalid = consultationService({ continuarFlujo: true, mensaje: message });
  const malformed = await invalid.instance.consultReservationPayment({ uuid: 'r', numeroTasa: '42538' });
  assert.equal(malformed.type, 'error');
  assert.equal(malformed.text, message);
  assert.equal(invalid.writes.length, 0);
});

for (const [folder, method, field, endpoint, kind] of screens) {
  const path = 'src/app/pages/modules/' + folder + '/' +
    (folder === 'booking-schools' ? 'booking-periodo' : folder) + '.component.ts';

  test(folder + ': pagination, sorting and filters only read; explicit refresh reviews', () => {
    const Class = actualMethods(path, ['onPageChange', 'onPageSizeChange', 'onSortChange',
      'onNavChange', 'applyFilters', 'clearFilters'], { clearTimeout });
    const component = new Class(), calls = [];
    Object.assign(component, { filters: {}, itemsList: [{ prop: kind ? 'reservaDto.numeroReserva' : 'numeroReserva', sortable: true }],
      [method]: value => calls.push(value) });
    component.onPageChange(2);
    component.onPageSizeChange(10);
    component.onSortChange({ column: kind ? 'reservaDto.numeroReserva' : 'numeroReserva', direction: 'asc' });
    component.onNavChange({ nextId: 2 });
    component.applyFilters();
    component.clearFilters();
    assert.deepEqual(calls, [false, false, false, false, false, true]);
  });

  test(folder + ': navigation during full review shares it and fetches only the latest page afterwards', async () => {
    const shown = [], calls = [], pending = new Subject();
    const Class = actualMethods(path, [method], {
      showReservationRevision: report => { if (report) shown.push(report); }, firstValueFrom, takeUntil, clearTimeout
    });
    const component = new Class();
    const latestPage = { content: [{ numeroReserva: 'PAGE-3' }], totalElements: 205 };
    Object.assign(component, {
      currentPage: 1, pageSize: 5, requestVersion: 0, listRequestVersion: 0,
      filters: {}, cancelListRequest: new Subject(),
      getPaginationFilters: () => ({}), ['get' + kind + 'ReservationFilters']: () => ({}),
      enrichReservationsForDisplay: rows => rows,
      [field]: { getAll: (...args) => { calls.push(args); return calls.length === 1 ? pending : of(latestPage); } },
      handleError: error => { throw error; }
    });
    const first = component[method]();
    component.currentPage = 2;
    const second = component[method](false);
    component.currentPage = 3;
    const third = component[method](false);
    assert.equal(calls.length, 1);
    assert.equal(calls[0][2].revisarEstados, true);
    pending.next({ content: ['old page'], revision });
    pending.complete();
    await Promise.all([first, second, third]);
    assert.equal(calls.length, 2);
    assert.equal(calls[1][0], 2); // Zero-based page three.
    assert.equal(calls[1][2].revisarEstados, false);
    assert.equal(component.reservasList.content, latestPage.content);
    assert.deepEqual(shown, [revision]);
    assert.equal(component.loading, false);
    await component[method](false);
    assert.equal(calls[2][2].revisarEstados, false);
    assert.deepEqual(shown, [revision]); // Paging never replays a previous report.
  });
}

test('review report preserves upstream message and separates any local diagnostic', () => {
  const { reservationRevisionText } = evaluate(functions);
  const message = '  Respuesta original\n &amp; <texto>  ';
  const text = reservationRevisionText({ ...revision, resultados: [{
    reservaDto: { numeroReserva: 'R-42', estadoReserva: 'PENDIENTE' },
    estadoAnterior: 'PENDIENTE', resultado: 'ERROR', motivo: message, ruat: 'NO_CONFIRMADO',
    detalleLocal: 'Fallo de registro local.'
  }] });
  assert.ok(text.includes(message));
  assert.ok(text.includes('Sistema local: Fallo de registro local.'));
  assert.ok(!text.includes('PENDIENTE → PENDIENTE'));
  assert.ok(!text.includes('(RUAT:'));
  assert.ok(!text.includes('página solicitada'));
});

function monthlySummaryComponent() {
  const Class = actualMethods(monthlyModal, ['months', 'getMonthName', 'formatPeriodoDetalle',
    'getPeriodosUnicos', 'periodosUnicosActuales', 'getPeriodoResumen', 'getDocumentoContribuyente']);
  return new Class();
}

test('monthly summary displays one period for all 28 student details without changing their data', () => {
  const component = monthlySummaryComponent();
  const details = Array.from({ length: 28 }, (_, i) => ({ mes: 8, año: 2026, estudianteEscuelaDto: { nombreCompleto: 'Estudiante ' + i } }));
  const reserva = { reservasPeriodoDtoList: details };
  const before = JSON.stringify(reserva);
  component.row = reserva;
  assert.equal(component.getPeriodoResumen(reserva), 'Agosto 2026');
  assert.equal(component.periodosUnicosActuales.length, 1);
  assert.equal(JSON.stringify(reserva), before);
});

test('monthly result summary uses each selected reservation, not the first modal row', () => {
  const component = monthlySummaryComponent();
  component.row = { reservasPeriodoDtoList: [{ mes: 8, año: 2026 }] };
  assert.equal(component.getPeriodoResumen({ reservasPeriodoDtoList: [{ mes: 9, año: 2026 }] }), 'Septiembre 2026');
  assert.equal(component.getPeriodoResumen(undefined), 'Sin período registrado');
  assert.equal(component.getPeriodoResumen({}), 'Sin período registrado');
});

test('multiple months are summarized as a count and distinct periods remain available in chronological order', () => {
  const component = monthlySummaryComponent();
  const reserva = { reservasPeriodoDtoList: [
    { mes: 1, año: 2027 }, { mes: 12, año: 2026 }, { mes: 1, año: 2027 }, { mes: '12', año: '2026' }
  ] };
  assert.equal(component.getPeriodoResumen(reserva), '2 períodos');
  assert.equal(JSON.stringify(component.getPeriodosUnicos(reserva)), JSON.stringify(['Diciembre 2026', 'Enero 2027']));
  for (const detail of [undefined, {}, { mes: 0, año: 2026 }, { mes: 13, año: 2026 }, { mes: 8, año: null }])
    assert.equal(component.formatPeriodoDetalle(detail), 'N/A');
});

test('responsible contributor document has no internal identifier fallback', () => {
  const component = monthlySummaryComponent();
  assert.equal(component.getDocumentoContribuyente({ tipoDocumento: 'CI', numeroDocumento: '12345', uuid: 'private' }), 'CI 12345');
  assert.equal(component.getDocumentoContribuyente({ uuid: 'private' }), 'N/A');
  assert.equal(component.getDocumentoContribuyente(undefined), 'N/A');
});

test('all three modal templates show feedback in both consultation and payment-detail views', async () => {
  const { parseTemplate } = await import('@angular/compiler');
  for (const kind of ['one-time', 'recurrent', 'school']) {
    const path = 'src/app/pages/modals/modal-booking-' + kind + '/modal-booking-' + kind + '.component.html';
    const html = fs.readFileSync(path, 'utf8');
    assert.equal(parseTemplate(html, path).errors, null, kind + ': template must be valid');
    assert.equal((html.match(/#ruatConsultationFeedback\b/g) || []).length, 1);
    assert.equal((html.match(/\*ngTemplateOutlet="ruatConsultationFeedback;/g) || []).length, 2);
    assert.ok(html.includes('{{ result.text }}'));
    assert.ok(html.includes("'ri-information-fill': result.type === 'info'"));
    assert.ok(html.includes("'ri-close-circle-fill': result.type === 'error'"));
    assert.ok(html.includes('value="NO SE EFECTUO EL PAGO EN EL DIA DEL REGISTRO"'));
    assert.ok(!html.includes('value="NO SE EFECTUO EL PAGO EN EL DIA DE REGISTRO"'));
    const consult = html.slice(html.indexOf('class="modal-content gamq-ruat-consultation"'), html.indexOf("*ngIf=\"accion === 'show'"));
    assert.ok(consult.includes('Contribuyente responsable'));
    assert.ok(consult.includes('consultationResult.reservaDto?.numeroReserva'));
    assert.ok(!consult.includes('uuid'));
    if (kind === 'school') {
      assert.ok(consult.includes('getPeriodoResumen(consultationResult.reservaDto)'));
      assert.ok(!consult.includes('*ngFor="let detalle'));
      assert.ok(html.includes('*ngFor="let detalle of getReservationDetails()"'));
    }
  }
});

test('falsy malformed payment values cannot be presented as a confirmed unpaid query', async () => {
  for (const pagoTasa of [false, 0, '']) {
    const { instance, writes } = consultationService({ continuarFlujo: true, mensaje: 'Original RUAT', pagoTasa });
    const result = await instance.consultReservationPayment({ uuid: 'r', numeroTasa: '42538' });
    assert.equal(result.type, 'error');
    assert.equal(result.text, 'Original RUAT');
    assert.ok(result.detalleLocal);
    assert.equal(writes.length, 0);
  }
});

test('manual consultation requires the local save response to confirm the same payment', async () => {
  for (const saved of [undefined, {}, { folio: 'another', numeroTasa: '42538' }, { folio: 'folio', numeroTasa: 'different' }]) {
    const { instance } = consultationService({ ...confirmed, mensaje: 'Original RUAT' });
    instance.pagoService.save = () => of(saved);
    const row = { uuid: 'r', numeroTasa: '42538', estadoReserva: 'PENDIENTE' };
    const result = await instance.consultReservationPayment(row);
    assert.equal(result.type, 'error');
    assert.equal(result.text, 'Original RUAT');
    assert.ok(result.detalleLocal);
    assert.equal(row.pagosDtoList, undefined);
    assert.equal(row.estadoReserva, 'PENDIENTE');
  }
});

test('consultation modal styles compile and keep long responses and separate results readable', () => {
  const sass = require('sass');
  const scss = fs.readFileSync('src/assets/scss/components/_modal.scss', 'utf8');
  const { css } = sass.compileString('$prefix: vz-; $font-weight-semibold: 600; $modal-dialog-margin-y-sm-up: 1.75rem;\n' + scss);
  assert.ok(css.includes('.gamq-ruat-consultation .modal-body'));
  assert.ok(css.includes('.ruat-consultation-result + .ruat-consultation-result'));
  assert.ok(css.includes('overflow-wrap: anywhere'));
  assert.ok(css.includes('white-space: pre-wrap'));
});

for (const kind of ['one-time', 'recurrent', 'school']) {
  const modal = 'src/app/pages/modals/modal-booking-' + kind + '/modal-booking-' + kind + '.component.ts';
  test(kind + ': both unpaid RUAT messages pass through the actual bulk consultation as information', async () => {
    for (const message of unpaidMessages) {
      const response = { continuarFlujo: false, mensaje: message, pagoTasa: null };
      const { instance, writes } = consultationService(response);
      instance.checkFeePayment = () => { throw new HttpErrorResponse(404, JSON.stringify(response), 'RUAT'); };
      const Class = actualMethods(modal, ['consultPaymentInModal']);
      const component = new Class();
      const reservations = [1, 2, 3].map(i => ({ uuid: 'r-' + i, numeroTasa: '' + i, estadoReserva: 'PENDIENTE' }));
      const rows = kind === 'school' ? reservations : reservations.map(reservaDto => ({ reservaDto }));
      Object.assign(component, { accion: 'consult', selectedRows: rows, row: rows[0],
        ruatService: instance, emitList: { emit: () => assert.fail('No state change to refresh') } });
      await component.consultPaymentInModal();
      assert.equal(component.consultationResults.length, 3);
      for (const result of component.consultationResults) {
        assert.equal(result.type, 'info');
        assert.equal(result.text, message);
        assert.equal(result.reservaDto.estadoReserva, 'PENDIENTE');
      }
      assert.equal(writes.length, 0);
    }
  });
}

test('unpaid-only list reports do not show an incomplete-review dialog', () => {
  const { showReservationRevision } = evaluate(functions, {
    Swal: { fire: () => assert.fail('Unpaid is not a review failure') },
    document: { createElement: () => assert.fail('No changes to report') }
  });
  for (const message of unpaidMessages) {
    showReservationRevision({ ...revision, revisadas: 18, actualizadas: 0, sinCambios: 18,
      fallidas: 0, omitidas: 0, completa: true, resultados: [{
        reservaDto: { numeroReserva: 'R-0071/26', numeroTasa: '36126', estadoReserva: 'PENDIENTE' },
        estadoAnterior: 'PENDIENTE', resultado: 'SIN_CAMBIOS', ruat: 'SIN_PAGO', motivo: message
      }] });
  }
});

for (const kind of ['one-time', 'recurrent']) {
  const modal = 'src/app/pages/modals/modal-booking-' + kind + '/modal-booking-' + kind + '.component.ts';
  test(kind + ': approval waits for RUAT and saved rate, then displays the server-calculated deadline', async () => {
    for (const failAt of ['', 'ruat', 'save', 'approve']) {
      const Class = actualMethods(modal, ['approveReserva', 'registerReservationInRuat']);
      const component = new Class(), steps = [], messages = [];
      const request = { uuid: 'r', estadoReserva: 'SOLICITADA', fechaLimitePago: '2026-01-02T10:00:00',
        contribuyenteDto: { codigoContribuyente: 'payer' }, tarifaDto: { clasificadorRuatDto: { codigo: 'classifier' } }, montoTotal: 100 };
      const approved = { ...request, numeroTasa: '42538', estadoReserva: 'PENDIENTE', estadoValidacion: 'APROBADA',
        fechaAprobacion: '2026-09-23T14:30:00', fechaLimitePago: '2026-09-24T14:30:00' };
      Object.assign(component, {
        row: { reservaDto: request }, userData: { nombreCompleto: 'Admin' },
        getReservaByUuid: async () => ({ ...request }),
        ruatService: {
          createTasa: () => { steps.push('ruat'); return of(failAt === 'ruat'
            ? { continuarFlujo: false, mensaje: 'Mensaje original RUAT' }
            : { continuarFlujo: true, numeroTasa: '42538' }); },
          canContinue: r => r.continuarFlujo, getResponseData: r => r,
          getResponseMessage: r => r.mensaje
        },
        updateReserva: async r => { steps.push('save'); assert.equal(r.numeroTasa, '42538');
          if (failAt === 'save') throw Error('save failed'); return r; },
        approveReservaAfterRuat: async () => { steps.push('approve');
          if (failAt === 'approve') throw Error('approve failed'); return approved; },
        openTicketModal: () => { steps.push('ticket'); assert.equal(component.row.reservaDto, approved); },
        emitList: { emit: () => steps.push('refresh') }, notify: (...args) => messages.push(args)
      });
      await component.approveReserva('r');
      assert.deepEqual(steps, failAt === 'ruat' ? ['ruat'] : failAt === 'save' ? ['ruat', 'save']
        : failAt === 'approve' ? ['ruat', 'save', 'approve'] : ['ruat', 'save', 'approve', 'ticket', 'refresh']);
      assert.equal(component.showLoading, false);
      if (failAt) assert.equal(component.row.reservaDto, request);
      else assert.equal(component.row.reservaDto.fechaLimitePago, approved.fechaLimitePago);
      if (failAt === 'ruat') assert.equal(messages[0][0], 'Mensaje original RUAT');
    }
  });

  test(kind + ': approval does not create a rate for a free reservation or duplicate a previously saved rate', async () => {
    for (const free of [false, true]) {
      const Class = actualMethods(modal, ['approveReserva']);
      const component = new Class();
      const request = { uuid: 'r', esReservaGratuita: free, numeroTasa: free ? undefined : '42538' };
      const approved = { ...request, fechaLimitePago: free ? null : '2026-09-24T14:30:00' };
      Object.assign(component, {
        row: { reservaDto: request }, userData: {}, getReservaByUuid: async () => request,
        registerReservationInRuat: () => assert.fail('No rate creation expected'),
        approveReservaAfterRuat: async () => approved, openTicketModal: () => {},
        emitList: { emit: () => {} }, notify: (_, type) => assert.equal(type, 'success')
      });
      await component.approveReserva('r');
      assert.equal(component.row.reservaDto, approved);
    }
  });
}
