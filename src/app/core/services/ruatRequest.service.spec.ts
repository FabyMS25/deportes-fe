import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RuatRequestsService } from './ruatRequest.service';
import { environment } from 'src/environments/environment';

describe('RuatRequestsService response contract', () => {
  let service: RuatRequestsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(RuatRequestsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('preserves a successful RUAT taxpayer response', () => {
    const ruatResponse = {
      mensaje: null,
      continuarFlujo: true,
      codigoContribuyente: 'RUAT-1',
      contribuyente: { numeroDocumento: '4385869' }
    };

    service.getTaxpayerByIdentityNumber('4385869', 'CI', '3').subscribe(response => {
      expect(response).toEqual(ruatResponse);
      expect(service.canContinue(response)).toBeTrue();
      expect(service.getResponseData(response).codigoContribuyente).toBe('RUAT-1');
    });

    http.expectOne(`${environment.backendUrl}/ruat/buscar`).flush(ruatResponse);
  });

  it('preserves continuarFlujo false as a business response', () => {
    const ruatResponse = {
      mensaje: 'No se encontraron datos',
      continuarFlujo: false
    };

    service.checkFeePayment('100').subscribe(response => {
      expect(response).toEqual(ruatResponse);
      expect(service.hasBusinessResponse(response)).toBeTrue();
      expect(service.canContinue(response)).toBeFalse();
    });

    http.expectOne(`${environment.backendUrl}/ruat/pago`).flush(
      ruatResponse,
      { status: 404, statusText: 'Not Found' }
    );
  });

  it('does not convert a RUAT connectivity failure into a business response', () => {
    let receivedError: any;

    service.getTaxpayerByIdentityNumber('4385869', 'CI', '3').subscribe({
      error: error => receivedError = error
    });

    http.expectOne(`${environment.backendUrl}/ruat/buscar`).flush(
      {
        mensaje: 'No se pudo conectar con RUAT. Intente nuevamente.',
        continuarFlujo: false
      },
      { status: 502, statusText: 'Bad Gateway' }
    );

    expect(receivedError.status).toBe(502);
    expect(service.getResponseMessage(receivedError)).toBe(
      'No se pudo conectar con RUAT. Intente nuevamente.'
    );
  });

  it('does not convert a transport failure into a RUAT business result', () => {
    service.checkFeePayment('100').subscribe({
      next: () => fail('Expected a transport error'),
      error: error => expect(error.status).toBe(0)
    });

    http.expectOne(`${environment.backendUrl}/ruat/pago`).error(
      new ProgressEvent('network error')
    );
  });
});
