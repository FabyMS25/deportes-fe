import { AfterViewInit, Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { Observable } from 'rxjs';
// import { PaginationInstance } from 'ngx-pagination';
import { DatePipe } from '@angular/common';
import { PaginationService } from 'src/app/core/services/pagination.service';

@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss']
})
export class DataTableComponent {

  @Input() multiCheck: boolean = true;
  @Input() loading: boolean = true;
  @Input() listaItems!: any[];
  @Input() content!: any[];
  @Input() allcontent!: any[];
  @Input() sortField!: any;
  @Input() show!: boolean;
  @Input() edit!: boolean;
  @Input() delete!: boolean;
  @Input() consult!: boolean;

  @Input() telf!:boolean;
  @Input() comment!: boolean;

  @Output() showItemEmitter = new EventEmitter();
  @Output() editItemEmitter = new EventEmitter();
  @Output() deleteItemEmitter = new EventEmitter();
  @Output() consultItemEmitter = new EventEmitter();  


  constructor( public service: PaginationService){}
  
  ngOnChanges() {
      this.content = this.service.changePage(this.allcontent,this.itemsPerPage)
  }

  public showItem(item: any) {
    this.showItemEmitter.emit(item);
  }
  public editItem(item: any) {
    this.editItemEmitter.emit(item);
  }
  public deleteItem(item: any) {
    this.deleteItemEmitter.emit(item);
  }

  public consultItem(item: any) {
    this.consultItemEmitter.emit(item);
  }

  @Output() seleccionarItemEmitter = new EventEmitter();
  // Select Checkbox value Get
  masterSelected: boolean = false;
  checkedValGet: any[] = [];

onCheckboxChange(e: any, item: any) {
    if (e.target.checked) {
        this.checkedValGet.push(item);
    } else {
        this.checkedValGet = this.checkedValGet.filter(i => i !== item);
    }

    // Check if all items are selected
    if (this.checkedValGet.length === this.allcontent.length) {
        this.masterSelected = true;
    } else {
        this.masterSelected = false;
    }
    console.log(this.checkedValGet);

    this.seleccionarItemEmitter.emit(this.checkedValGet);
    this.checkedValGet.length > 0 
        ? (document.getElementById("remove-actions") as HTMLElement).style.display = "block"
        : (document.getElementById("remove-actions") as HTMLElement).style.display = "none";
}



  // onCheckboxChange(e: any, item:any) {
    
  //   if(this.masterSelected && !e.target.checked){
  //     this.masterSelected = false;
  //   }
  //   if(e.target.checked){
  //     this.checkedValGet.push(item);
  //     if(this.checkedValGet.length === this.allcontent.length){
  //       console.log("all ")
  //       this.masterSelected = false;  
  //       (document.getElementById("checkAll") as HTMLElement).target.checked = true;
  //     }
  //   }else{
  //     for (var i = 0; i < this.checkedValGet.length; i++) {
  //       if (this.checkedValGet[i] == item) {
  //         this.checkedValGet.splice(i, 1);
  //         break;
  //       }
  //     }
  //   }
  //   console.log(this.checkedValGet)
  //   this.seleccionarItemEmitter.emit(this.checkedValGet);
  //   this.checkedValGet.length > 0 ? (document.getElementById("remove-actions") as HTMLElement).style.display = "block" : (document.getElementById("remove-actions") as HTMLElement).style.display = "none";
  // }
  /**
  * Multiple Default Select
  */
checkUncheckAll(e: any) {
  this.masterSelected = e.target.checked;
  if (this.masterSelected) {
      this.checkedValGet = [...this.allcontent];
  } else {
      this.checkedValGet = [];
  }
  this.seleccionarItemEmitter.emit(this.checkedValGet);
  this.checkedValGet.length > 0 
      ? (document.getElementById("remove-actions") as HTMLElement).style.display = "block"
      : (document.getElementById("remove-actions") as HTMLElement).style.display = "none";
}
  // checkUncheckAll(ev: any) {
  //   this.masterSelected = ev.target.checked;
  //   console.log(ev.target.checked);
  //   this.allcontent.forEach((x: { state: any; }) => x.state = ev.target.checked)
  //   this.checkedValGet = this.allcontent// checkedVal
  //   this.seleccionarItemEmitter.emit(this.allcontent);
  //   this.checkedValGet.length > 0 ? (document.getElementById("remove-actions") as HTMLElement).style.display = "block" : (document.getElementById("remove-actions") as HTMLElement).style.display = "none";
  // }


  getPropertyValue(obj: any, prop: String): any {
    return prop.split('.').reduce((o, p) => o && o[p], obj);
  }    
  public getBadgeClass(value:any) {
    switch (value) {
    case 'Activo' : return 'bg-success-subtle text-success';
    case 'Bloqueado' : return 'bg-warning-subtle text-warning';
    case 'Pagado' : return 'bg-success-subtle text-success';
    case 'Pendiente' : return 'bg-secondary-subtle text-secondary';
    case 'Vencido' : return 'bg-danger-subtle text-danger';
    case 'Anulado' : return 'bg-warning-subtle text-warning';
    default: 
      return 'bg-info-subtle text-info';
    }
 }
  formatDate(data: any): string |null{
    var date = new Date(data);
    var yyyy = date.getFullYear().toString();
    var mm = (date.getMonth()+1).toString();
    var dd  = date.getDate().toString();
    var mmChars = mm.split('');
    var ddChars = dd.split('');
    return   (ddChars[1]?dd:"0"+ddChars[0]) + '/' + (mmChars[1]?mm:"0"+mmChars[0])  +'/'+yyyy;
  }
  
  // Search Data
  searchTerm: any;
  searchResults: any;
  performSearch(): void {
    this.searchResults = this.allcontent.filter((item: any) => {
      return (
        item.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    });
    this.content = this.service.changePage(this.searchResults,this.itemsPerPage)
  }

  /**
   * ******* to sort ******* 
   */
  sortBy: any
  SortFilter() {
    this.sortField = (document.getElementById("choices-single-default") as HTMLInputElement).value;
    if (this.sortField[0] == 'A') {
      this.sortBy = 'desc';
      this.sortField = this.sortField.replace(/A/g, '')
    }
    if (this.sortField[0] == 'D') {
      this.sortBy = 'asc';
      this.sortField = this.sortField.replace(/D/g, '')
    }
  }

  // Sort data
  onSort(column: any) {
    this.content = this.service.onSort(column, this.content)
  }

  /**
   * ******* pagination *******
   */
  changePage() {
    this.content = this.service.changePage(this.allcontent,this.itemsPerPage)
  }

  itemsPerPage: number = this.service.pageSize; 
  tableSizes:number[]= [8,10,15,20];
  public onTableSizeChange(event:any): void {
    this.itemsPerPage = Number(event.target.value);
    this.content = this.service.changePage(this.allcontent,this.itemsPerPage)
  }
}
