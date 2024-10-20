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