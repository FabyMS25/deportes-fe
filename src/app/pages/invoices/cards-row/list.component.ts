import { Component, QueryList, ViewChildren } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { UntypedFormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';

// Sweet Alert
import Swal from 'sweetalert2';

// Date Format
import { DatePipe } from '@angular/common';

// Rest Api Service
import { restApiService } from "../../../core/services/rest-api.service";
import { RootReducerState } from 'src/app/store';
import { Store } from '@ngrx/store';
import { deleteInvoice, fetchInvoiceListData } from 'src/app/store/Invoice/invoice_action';
import { selectInvoiceData, selectInvoiceLoading } from 'src/app/store/Invoice/invoice_selector';
import { cloneDeep } from 'lodash';
import { PaginationService } from 'src/app/core/services/pagination.service';
import { InvoiceListModel } from 'src/app/store/Invoice/invoice_model';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
})

/**
 * List Component
 */
export class ListComponent {

  constructor() {
  
  }

  ngOnInit(): void {
  }

  
  num: number = 0;
  option = {
    startVal: this.num,
    useEasing: true,
    duration: 2,
    decimalPlaces: 2,
  };
  
}
