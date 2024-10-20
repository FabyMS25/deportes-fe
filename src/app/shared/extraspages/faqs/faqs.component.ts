import { Component, OnInit } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from 'src/app/shared/shared.module';

import { NestedTreeControl } from '@angular/cdk/tree';
import { MatTreeNestedDataSource } from '@angular/material/tree';

@Component({
  selector: 'app-faqs',
  templateUrl: './faqs.component.html',
  styleUrls: ['./faqs.component.scss'],
  standalone: true,
  imports: [
    NgbModule,
    SharedModule,
  ],
})

/**
 * Faqs Component
 */
export class FaqsComponent implements OnInit {
  treeControl = new NestedTreeControl<ComplexNode>(node => node.children);
  dataSource = new MatTreeNestedDataSource<ComplexNode>();

  constructor() {
    this.dataSource.data = TREE_DATA
  }

  ngOnInit(): void {}

  hasChild = (_: number, node: ComplexNode) => !!node.children && node.children.length > 0;

}
interface ComplexNode {
  name: string;
  children?: ComplexNode[];
}

const TREE_DATA: ComplexNode[] = [
{
  name: 'GAMQ',
  children: [
    {
      name: 'Complejos Deportivos',
      children: [
        {
          name: 'Complejo 1',
          children: [
            {
              name: 'Campo Deportivo 1.1',
              children: [
                { name: 'Horarios' },
                { name: 'Tarifas' },
                { name: 'Categoría' },
                { name: 'Superficie' }
              ]
            },
            { name: 'Campo Deportivo 1.2' },
            { name: 'Campo Deportivo 1.n' }
          ]
        },
        {
          name: 'Complejo 2',
          children: [
            { name: 'Campo Deportivo 2.1' },
            { name: 'Campo Deportivo 2.2' },
            { name: 'Campo Deportivo 2.n' }
          ]
        },
        {
          name: 'Complejo n',
          children: [
            { name: 'Campo Deportivo n.1' },
            { name: 'Campo Deportivo n.2' },
            { name: 'Campo Deportivo n.n' }
          ]
        }
      ]
    }
  ]
}
];