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
  // @Output() mapItemEmitter = new EventEmitter();
  // @Output() docItemEmitter = new EventEmitter();
  

  masterSelected!: boolean;
  // allcontent: any;

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

  public consultItem(item: any) {
    this.consultItemEmitter.emit(item);
  }


  public deleteItem(item: any) {
    this.deleteItemEmitter.emit(item);
  }

  // public mapItem(item: any) {
  //   this.mapItemEmitter.emit(item);
  // }  
 
  // public docItem(item: any) {
  //   this.docItemEmitter.emit(item);
  // }
  
  @Output() seleccionarItemEmitter = new EventEmitter();
  // Select Checkbox value Get
  onCheckboxChange(e: any) {
    var checkedVal: any[] = [];
    var result
    for (var i = 0; i < this.content.length; i++) {
      if (this.content[i].state == true) {
        result = this.content[i];
        checkedVal.push(result);
      }
    }
    this.checkedValGet = checkedVal
    this.seleccionarItemEmitter.emit(this.checkedValGet);
    // checkedVal.length > 0 ? (document.getElementById("remove-actions") as HTMLElement).style.display = "block" : (document.getElementById("remove-actions") as HTMLElement).style.display = "none";
  }
    /**
  * Multiple Default Select
  */
  checkedValGet: any[] = [];
  checkUncheckAll(ev: any) {
    this.content.forEach((x: { state: any; }) => x.state = ev.target.checked)
    var checkedVal: any[] = [];
    var result
    for (var i = 0; i < this.content.length; i++) {
      if (this.content[i].state == true) {
        result = this.content[i];
        checkedVal.push(result);
      }
    }
    this.checkedValGet = checkedVal
    this.seleccionarItemEmitter.emit(this.checkedValGet);
    // checkedVal.length > 0 ? (document.getElementById("remove-actions") as HTMLElement).style.display = "block" : (document.getElementById("remove-actions") as HTMLElement).style.display = "none";
  }


  getPropertyValue(obj: any, item: any): any {
    const propPath:String =item.prop
    const value = propPath.split('.').reduce((o, p) => o && o[p], obj);
    if ( item.date) {
        return this.formatDate(value); 
    }
    if(item.name==='Estado'){
      return this.ponerEstado(value)
    }
    return value;
  }
  /* state for reclamos */
  ponerEstado(i: boolean)
  {
      if (i) return "Activo";
      else return "Bloqueado";
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
