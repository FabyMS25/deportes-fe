import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-deals-status',
  templateUrl: './deals-status.component.html',
  styleUrls: ['./deals-status.component.scss']
})

export class DealsStatusComponent implements OnInit {
  @Input() DealsStatus: Array<{
    name?: string;
    date?: string;
    profile?: string;
    userName?: string;
    status?: string;
    value?: string;
  }> | undefined;
  
  constructor() { }

  ngOnInit(): void {
  }

}
