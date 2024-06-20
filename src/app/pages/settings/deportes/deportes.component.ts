import { Component, QueryList, ViewChildren, TemplateRef } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { NgbModal, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { UntypedFormBuilder, UntypedFormGroup, FormArray, Validators } from '@angular/forms';

// Date Format
import { DatePipe } from '@angular/common';

// Sweet Alert
import Swal from 'sweetalert2';

import { RootReducerState } from 'src/app/store';
import { Store } from '@ngrx/store';
import { PaginationService } from 'src/app/core/services/pagination.service';
import { Deporte } from 'src/app/core/models/deporte.model';


@Component({
  selector: 'app-deportes',
  templateUrl: './deportes.component.html',
  styleUrls: ['./deportes.component.scss']
})
/**
 * Leads Component
 */
export class DeportesComponent {

  // bread crumb items
  breadCrumbItems!: Array<{}>;
  title="Deportes";
  submitted = false;
  contentForm!: UntypedFormGroup;
  deporteData!: Deporte;
  masterSelected!: boolean;
  checkedList: any;

  // Api Data
  content?: any;
  leads?: any;
  econtent?: any;

  closeResult: any;
  allleads: any;
  searchResults: any;
  searchTerm: any;

  listaItems:any[]=[];
  List:any[]=[];

  constructor(private modalService: NgbModal,
    public service: PaginationService,
    private formBuilder: UntypedFormBuilder,
    private store: Store<{ data: RootReducerState }>,
    private offcanvasService: NgbOffcanvas,
    private datePipe: DatePipe) {
  }

  ngOnInit(): void {
    /**
    * BreadCrumb
    */
    this.breadCrumbItems = [
      { label: 'Administracion' },
      { label: this.title, active: true }
    ];

    this.listaItems = [
      {name: 'Nombre', prop: 'nombre'},
      {name: 'Estado', prop: 'estado'},
      {name: 'Canchas',prop: 'canchas'},
    ];
    /**
     * Form Validation
     */
    this.contentForm = this.formBuilder.group({
      uuid: [''],
      estado:[''],
      nombre: ['', [Validators.required]]
    });

    /**
     * fetches data
     */
    // this.store.dispatch(fetchCrmLeadData());
    // this.store.select(selectCRMLoading).subscribe((data) => {
    //   if (data == false) {
    //     document.getElementById('elmLoader')?.classList.add('d-none');
    //   }
    // });

    // this.store.select(selectLeadData).subscribe((data) => {
    //   this.leads = data;
    //   this.allleads = cloneDeep(data);
    //   this.leads = this.service.changePage(this.allleads)
    // });

  }



  /**
   * Open modal
   * @param content modal content
   */
  openModal(content: any) {
    this.submitted = false;
    this.modalService.open(content, { size: 'md', centered: true });
  }

  /**
   * Form data get
   */
  get form() {
    return this.contentForm.controls;
  }

  // File Upload
  imageURL: string | undefined;
  fileChange(event: any) {
    let fileList: any = (event.target as HTMLInputElement);
    let file: File = fileList.files[0];
    document.getElementById('')
    this.contentForm.patchValue({
      // image_src: file.name
      image_src: 'avatar-8.jpg'
    });
    const reader = new FileReader();
    reader.onload = () => {
      this.imageURL = reader.result as string;
      (document.getElementById('lead-img') as HTMLImageElement).src = this.imageURL;
    }
    reader.readAsDataURL(file)
  }

  /**
  * Save user
  */
  saveUser() {
    if (this.contentForm.valid) {
      if (this.contentForm.get('_id')?.value) {
        const updatedData = this.contentForm.value;
        // this.store.dispatch(updateLead({ updatedData }));
        this.modalService.dismissAll();
      }
      else {
        const contactId = (this.allleads.length + 1).toString();
        this.contentForm.controls['_id'].setValue(contactId);
        const newData = this.contentForm.value;
        // this.store.dispatch(addLead({ newData }));
        let timerInterval: any;
        Swal.fire({
          title: 'Leads inserted successfully!',
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          willClose: () => {
            clearInterval(timerInterval);
          },
        }).then((result) => {
          if (result.dismiss === Swal.DismissReason.timer) {
          }
        });
      }
    }
    this.modalService.dismissAll();
    this.contentForm.reset();
    this.submitted = true
  }

  /**
   * Open Edit modal
   * @param content modal content
   */
  editDataGet(id: any, content: any) {
    this.submitted = false;
    this.modalService.open(content, { size: 'md', centered: true });
    var modelTitle = document.querySelector('.modal-title') as HTMLAreaElement;
    modelTitle.innerHTML = 'Edit Lead';
    var updateBtn = document.getElementById('add-btn') as HTMLAreaElement;
    updateBtn.innerHTML = "Update";

    this.econtent = this.allleads[id];
    var img_data = document.getElementById('lead-img') as HTMLImageElement;
    img_data.src = 'assets/images/users/' + this.econtent.image_src
    this.contentForm.controls['name'].setValue(this.econtent.name);
    this.contentForm.controls['company'].setValue(this.econtent.company);
    this.contentForm.controls['score'].setValue(this.econtent.score);
    this.contentForm.controls['phone'].setValue(this.econtent.phone);
    this.contentForm.controls['location'].setValue(this.econtent.location);
    this.contentForm.controls['tags'].setValue(this.econtent.tags);
    this.contentForm.controls['date'].setValue(this.econtent.date);
    this.contentForm.controls['_id'].setValue(this.econtent._id);
    this.contentForm.controls['image_src'].setValue(this.econtent.image_src);
  }
  /**
   * Delete model
   */
  deleteId: any;
  confirm(content: any, id: any) {
    this.deleteId = id;
    this.modalService.open(content, { centered: true });
  }

  // Delete Data
  deleteData(id: any) {
    if (id) {
      // this.store.dispatch(deleteLead({ id: this.deleteId.toString() }));
    } else {
      // this.store.dispatch(deleteLead({ id: this.checkedValGet.toString() }));
    }
    this.deleteId = '';
    this.masterSelected = false;
  }

  /**
   * Multiple Delete
   */
  checkedValGet: any[] = [];
  deleteMultiple(content: any) {
    var checkboxes: any = document.getElementsByName('checkAll');
    var result
    var checkedVal: any[] = [];
    for (var i = 0; i < checkboxes.length; i++) {
      if (checkboxes[i].checked) {
        result = checkboxes[i].value;
        checkedVal.push(result);
      }
    }
    if (checkedVal.length > 0) {
      this.modalService.open(content, { centered: true });
    }
    else {
      Swal.fire({ text: 'Please select at least one checkbox', confirmButtonColor: '#299cdb', });
    }
    this.checkedValGet = checkedVal;
  }

  // The master checkbox will check/ uncheck all items
  checkUncheckAll(ev: any) {
    this.leads.forEach((x: { state: any; }) => x.state = ev.target.checked)
    var checkedVal: any[] = [];
    var result
    for (var i = 0; i < this.leads.length; i++) {
      if (this.leads[i].state == true) {
        result = this.leads[i];
        checkedVal.push(result);
      }
    }
    this.checkedValGet = checkedVal
    checkedVal.length > 0 ? (document.getElementById("remove-actions") as HTMLElement).style.display = "block" : (document.getElementById("remove-actions") as HTMLElement).style.display = "none";

  }

  // Select Checkbox value Get
  onCheckboxChange(e: any) {
    var checkedVal: any[] = [];
    var result
    for (var i = 0; i < this.leads.length; i++) {
      if (this.leads[i].state == true) {
        result = this.leads[i];
        checkedVal.push(result);
      }
    }
    this.checkedValGet = checkedVal
    checkedVal.length > 0 ? (document.getElementById("remove-actions") as HTMLElement).style.display = "block" : (document.getElementById("remove-actions") as HTMLElement).style.display = "none";
  }

  /**
  * Multiple Default Select2
  */
  selectValue = ['Lead', 'Partner', 'Exiting', 'Long-term'];

  //  Filter Offcanvas Set
  openEnd(content: TemplateRef<any>) {
    this.offcanvasService.open(content, { position: 'end' });
  }

  // Filtering
  isstatus?: any
  SearchData() {
    var date = document.getElementById("isDate") as HTMLInputElement;
    var dateVal = date.value ? this.datePipe.transform(new Date(date.value), "yyyy-MM-dd") : '';

    if (dateVal != '') {
      this.leads = this.content.filter((order: any) => {
        return this.datePipe.transform(new Date(order.date), "yyyy-MM-dd") == dateVal;
      });
    }
    else {
      this.leads = this.content;
    }
  }

  changePage() {
    this.leads = this.service.changePage(this.allleads)
  }

  // Search Data
  performSearch(): void {
    this.searchResults = this.allleads.filter((item: any) => {
      return (
        item.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    });
    this.leads = this.service.changePage(this.searchResults)
  }

  onSort(column: any) {
    this.leads = this.service.onSort(column, this.leads)
  }


}
