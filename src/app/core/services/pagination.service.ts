// pagination.service.ts
import { Injectable, Input } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class PaginationService {
    // Pagination
    pageSize: any = 8;
    page: any = 1;
    startIndex: number = 1;
    endIndex: number = 9;
    //sort direction
    private sortColumn: string = '';
    private sortDirection: 'asc' | 'desc' = 'asc';

    changePage(alldata: any[], pageSize:number) {
        const startItem = (this.page - 1) * pageSize + 1;
        const endItem = (this.page - 1) * pageSize + pageSize;
        this.endIndex = endItem;
        if (this.endIndex > alldata.length) {
            this.endIndex = alldata.length;
        }
        return alldata.slice(startItem - 1, endItem);
    }

    // Sort Data
    // onSort(column: any, dataList: any[]) {
    //     if (this.direction == 'asc') {
    //         this.direction = 'desc';
    //     } else {
    //         this.direction = 'asc';
    //     }
    //     const sortedArray = [...dataList]; // Create a new array
    //     sortedArray.sort((a, b) => {
    //         const res = this.compare(a[column], b[column]);
    //         return this.direction === 'asc' ? res : -res;
    //     });
    //     return dataList = sortedArray;
    // }
    // compare(v1: string | number, v2: string | number) {
    //     return v1 < v2 ? -1 : v1 > v2 ? 1 : 0;
    // }
    onSort(column: string, data: any[]): any[] {
        if (this.sortColumn === column) {
          this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          this.sortColumn = column;
          this.sortDirection = 'asc';
        }
    
        return data.sort((a, b) => {
          let valueA = this.getNestedValue(a, column);
          let valueB = this.getNestedValue(b, column);
    
          if (typeof valueA === 'string') valueA = valueA.toLowerCase();
          if (typeof valueB === 'string') valueB = valueB.toLowerCase();
    
          if (valueA < valueB) return this.sortDirection === 'asc' ? -1 : 1;
          if (valueA > valueB) return this.sortDirection === 'asc' ? 1 : -1;
          return 0;
        });
      }
    
      private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((prev, curr) => 
          prev && prev[curr] !== undefined ? prev[curr] : null
        , obj);
      }

}
