import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { apiPost } from './apiResponses';

describe('API error normalization', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('shows the backend business payload instead of Angular transport text', () => {
    apiPost(http, '/api/contribuyente', {}, 'registrar contribuyente').subscribe({
      next: () => fail('Expected a conflict'),
      error: error => {
        expect(error.message).toBe('Ya existe un contribuyente registrado con el número de documento 8695227.');
        expect(error.status).toBe(409);
        expect(error.error.status).toBe('DUPLICATE_ENTITY');
      }
    });

    controller.expectOne('/api/contribuyente').flush(
      {
        status: 'DUPLICATE_ENTITY',
        payload: 'Ya existe un contribuyente registrado con el número de documento 8695227.'
      },
      { status: 409, statusText: 'Conflict' }
    );
  });
});
