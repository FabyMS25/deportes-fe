import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
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

  @Input() listaItems!: any[];
  @Input() content!: any[];
  // @Input() sortField!: any;
  @Input() show!: boolean;
  @Input() doc!:boolean;
  @Input() edit!: boolean;
  @Input() delete!: boolean;
  @Input() map!: boolean;

  @Output() showItemEmitter = new EventEmitter();
  @Output() editItemEmitter = new EventEmitter();
  @Output() deleteItemEmitter = new EventEmitter();
  @Output() mapItemEmitter = new EventEmitter();
  @Output() docItemEmitter = new EventEmitter();
  
  @Input() validate!: boolean;
  @Input() reject!: boolean;

  masterSelected!: boolean;
  allcontent: any;

  constructor( public service: PaginationService){
    this.allcontent = this.content;}
  getContentForPage(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = Math.min(startIndex + this.itemsPerPage, this.content.length);
    return this.content.slice(startIndex, endIndex);
    
}
changePage() {
  this.content = this.service.changePage(this.allcontent)
}
  public editItem(item: any) {
    this.editItemEmitter.emit(item);
  }

  public showItem(item: any) {
    this.showItemEmitter.emit(item);
  }

  public deleteItem(item: any) {
    this.deleteItemEmitter.emit(item);
  }

  public mapItem(item: any) {
    this.mapItemEmitter.emit(item);
  }  
 
  public docItem(item: any) {
    this.docItemEmitter.emit(item);
  }
  
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
    checkedVal.length > 0 ? (document.getElementById("remove-actions") as HTMLElement).style.display = "block" : (document.getElementById("remove-actions") as HTMLElement).style.display = "none";
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
    checkedVal.length > 0 ? (document.getElementById("remove-actions") as HTMLElement).style.display = "block" : (document.getElementById("remove-actions") as HTMLElement).style.display = "none";
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
    if(item.name==='Persona'){
      if(value){
        return "Juridica"
      }
      return "Natural"
    }
    return value;
  }
  /* state for reclamos */
  ponerEstado(i: number)
  {
      if (i===1) return "Recibido";
      else if (i===2) return "Validado";
            else return "Rechazado";
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
    this.searchResults = this.content.filter((item: any) => {
      return (
        item.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    });
    this.content = this.service.changePage(this.searchResults)
  }
  /**
   * ******* to sort ******* 
   */
  sortField: any;
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
  currentPage = 1;
  itemsPerPage: number = 5; 
  tableSizes = [5,10,15];
  calculateTotalPages():number {
    return Math.ceil(this.content.length / this.itemsPerPage);
  }
  public onTableSizeChange(event:any): void {
    this.itemsPerPage = event.target.value;
    this.currentPage = 1;
  }
  getPageNumbers(): number[] {
    const totalPages = Math.ceil(this.content.length / this.itemsPerPage);
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  getMinValue(a: number, b: number): number {
    return Math.min(a, b);
  }
}
