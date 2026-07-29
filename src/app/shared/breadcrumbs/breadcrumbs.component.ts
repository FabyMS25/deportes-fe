import { Component, OnInit, Input } from '@angular/core';

export interface BreadCrumbItem {
  active?: boolean;
  label?: string;
  description?: string;
  link?: string;
}

@Component({
  selector: 'app-breadcrumbs',
  templateUrl: './breadcrumbs.component.html',
  styleUrls: ['./breadcrumbs.component.scss']
})

export class BreadcrumbsComponent implements OnInit {
  @Input() breadcrumbItems!: Array<BreadCrumbItem>;

  constructor() { }

  ngOnInit(): void { }

  get title() { return this.breadcrumbItems[0]?.label; }
  get subtitle()    { return this.breadcrumbItems.at(-1)?.label; }
  get description() { return this.breadcrumbItems.at(-1)?.description; }
  
}
