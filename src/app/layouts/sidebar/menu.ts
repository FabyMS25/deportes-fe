import { MenuItem } from './menu.model';

export const MENU: MenuItem[] = [
  {
    orden: 1,
    nombreMenu: 'DASHBOARDS.ADMIN',
    icono: 'ri-dashboard-2-line',
    ruta: '/',
  },
  {
    orden: 1,
    nombreMenu: 'DASHBOARDS.EMPLOYEE',
    // nombreMenu: 'Empleado',
    icono: 'ri-dashboard-2-line',
    ruta: '/dashboard-employee',
  },
  {
    orden: 1,
    nombreMenu: 'DASHBOARDS.TAXPAYER',
    // nombreMenu: 'Contribuyente',
    icono: 'ri-dashboard-2-line',
    ruta: '/dashboard-taxpayer',
  },

  {
    orden: 1,
    nombreMenu: 'MENUITEMS.MENU.TEXT',
    isTitle: true
  },
  {
    orden: 2,
    nombreMenu: 'RESERVATIONS.TEXT',
    ruta: '/reservas/reservas',
    icono: 'ri-pages-line',
    isCollapsed: true,
    permisoHijoListDto: [
      {
        orden: 1,
        nombreMenu: 'RESERVATIONS.ORDERS',
        ruta: '/reservations',
        permisoPadreDto: 12
      },
      {
        orden: 2,
        nombreMenu: 'RESERVATIONS.CUSTOMERS',
        ruta: '/taxpayers',
        permisoPadreDto: 12
      },
    ]
  },
  {
    orden: 1,
    nombreMenu: 'RESERVATIONS.ORDERS',
    ruta: '/reservations',
    permisoPadreDto: 2
  },
  {
    orden: 2,
    nombreMenu: 'RESERVATIONS.CUSTOMERS',
    ruta: '/taxpayers',
    permisoPadreDto: 2
  },
  {
    orden: 5,
    nombreMenu: 'ADMINISTRATION.TEXT',
    icono: 'ri-settings-3-line',
    isCollapsed: true,
    permisoHijoListDto: [
      {
        orden: 1,
        nombreMenu: 'ADMINISTRATION.EMPLOYEES',
        ruta: '/settings/employees',
        permisoPadreDto: 5
      },
      {
        orden: 2,
        nombreMenu: 'ADMINISTRATION.FIELDS',
        ruta: '/settings/fields',
        permisoPadreDto: 5
      },
      {
        orden: 3,
        nombreMenu: 'MENUITEMS.APPS.LIST.LEADS',
        ruta: '/settings/leads',
        permisoPadreDto: 5
      }
    ]
  },
  {
    orden: 1,
    nombreMenu: 'ADMINISTRATION.EMPLOYEES',
    ruta: '/settings/employees',
    permisoPadreDto: 5
  },
  {
    orden: 2,
    nombreMenu: 'ADMINISTRATION.FIELDS',
    ruta: '/settings/fields',
    permisoPadreDto: 5
  },
  {
    orden: 3,
    nombreMenu: 'MENUITEMS.APPS.LIST.LEADS',
    ruta: '/settings/leads',
    permisoPadreDto: 5
  },
      



  {
    orden: 10,
    nombreMenu: 'MENUITEMS.APPS.TEXT',
    icono: 'ri-apps-2-line',
    isCollapsed: true,
    permisoHijoListDto: [
      {
        orden: 11,
        nombreMenu: 'MENUITEMS.APPS.LIST.ECOMMERCE',
        permisoPadreDto: 10,
        isCollapsed: true,
        permisoHijoListDto: [
          {
            orden: 1,
            nombreMenu: 'MENUITEMS.APPS.LIST.ORDERS',
            ruta: '/ecommerce/orders',
            permisoPadreDto: 11
          },
          {
            orden: 1,
            nombreMenu: 'MENUITEMS.APPS.LIST.CUSTOMERS',
            ruta: '/ecommerce/customers',
            permisoPadreDto: 11
          },
        ]
      },
      {
        orden: 14,
        nombreMenu: 'MENUITEMS.APPS.LIST.INVOICES',
        permisoPadreDto: 10,
        isCollapsed: true,
        permisoHijoListDto: [
          {
            orden: 1,
            nombreMenu: 'MENUITEMS.APPS.LIST.LISTVIEW',
            ruta: '/invoices/list',
            permisoPadreDto: 14
          },
          {
            orden: 2,
            nombreMenu: 'MENUITEMS.APPS.LIST.DETAILS',
            ruta: '/invoices/details',
            permisoPadreDto: 14
          },
          {
            orden: 3,
            nombreMenu: 'MENUITEMS.APPS.LIST.CREATEINVOICE',
            ruta: '/invoices/create',
            permisoPadreDto: 14
          }
        ]
      },
      {
        orden: 16,
        nombreMenu: 'MENUITEMS.APPS.LIST.NFTMARKETPLACE',
        permisoPadreDto: 10,
        isCollapsed: true,
        permisoHijoListDto: [
          {
            orden: 1,
            nombreMenu: 'MENUITEMS.APPS.LIST.ITEMDETAILS',
            ruta: '/marletplace/item-details',
            permisoPadreDto: 16
          },
        ]
      },
      {
        orden: 17,
        nombreMenu: 'MENUITEMS.APPS.LIST.APIKEY',
        ruta: '/apikey',
        permisoPadreDto: 10,
      },
      {
        orden: 18,
        nombreMenu: 'MENUITEMS.PAGES.LIST.PRICING',
        ruta: '/pages/pricing',
        permisoPadreDto: 10
      },
    ]
  },
  {
    orden: 12,
    nombreMenu: 'MENUITEMS.APPS.LIST.TASK',
    permisoPadreDto: 10,
    isCollapsed: true,
    permisoHijoListDto: [
      {
        orden: 1,
        nombreMenu: 'MENUITEMS.APPS.LIST.LISTVIEW',
        ruta: '/tasks/list-view',
        permisoPadreDto: 12
      },
      {
        orden: 1,
        nombreMenu: 'MENUITEMS.APPS.LIST.TASKDETAILS',
        ruta: '/tasks/details',
        permisoPadreDto: 12
      }
    ]
  },
  {
    orden: 1,
    nombreMenu: 'MENUITEMS.APPS.LIST.LISTVIEW',
    ruta: '/tasks/list-view',
    permisoPadreDto: 12
  },
  {
    orden: 1,
    nombreMenu: 'MENUITEMS.APPS.LIST.TASKDETAILS',
    ruta: '/tasks/details',
    permisoPadreDto: 12
  },
  {
    orden: 13,
    nombreMenu: 'MENUITEMS.APPS.LIST.CRYPTO',
    permisoPadreDto: 10,
    isCollapsed: true,
    permisoHijoListDto: [
      {
        orden: 1,
        nombreMenu: 'MENUITEMS.APPS.LIST.MYWALLET',
        ruta: '/crypto/orders',
        permisoPadreDto: 13
      },
    ]
  },
  {
    orden: 1,
    nombreMenu: 'MENUITEMS.APPS.LIST.MYWALLET',
    ruta: '/crypto/orders',
    permisoPadreDto: 13
  },
  {
    orden: 14,
    nombreMenu: 'MENUITEMS.APPS.LIST.INVOICES',
    permisoPadreDto: 10,
    isCollapsed: true,
    permisoHijoListDto: [
      {
        orden: 1,
        nombreMenu: 'MENUITEMS.APPS.LIST.LISTVIEW',
        ruta: '/invoices/list',
        permisoPadreDto: 14
      },
      {
        orden: 2,
        nombreMenu: 'MENUITEMS.APPS.LIST.DETAILS',
        ruta: '/invoices/details',
        permisoPadreDto: 14
      },
      {
        orden: 3,
        nombreMenu: 'MENUITEMS.APPS.LIST.CREATEINVOICE',
        ruta: '/invoices/create',
        permisoPadreDto: 14
      },
    ]
  },
  {
    orden: 1,
    nombreMenu: 'MENUITEMS.APPS.LIST.LISTVIEW',
    ruta: '/invoices/list',
    permisoPadreDto: 14
  },
  {
    orden: 2,
    nombreMenu: 'MENUITEMS.APPS.LIST.DETAILS',
    ruta: '/invoices/details',
    permisoPadreDto: 14
  },
  {
    orden: 3,
    nombreMenu: 'MENUITEMS.APPS.LIST.CREATEINVOICE',
    ruta: '/invoices/create',
    permisoPadreDto: 14
  },
  {
    orden: 15,
    nombreMenu: 'MENUITEMS.APPS.LIST.SUPPORTTICKETS',
    permisoPadreDto: 10,
    isCollapsed: true,
    permisoHijoListDto: [
      {
        orden: 1,
        nombreMenu: 'MENUITEMS.APPS.LIST.LISTVIEW',
        ruta: '/tickets/list',
        permisoPadreDto: 15
      },
      {
        orden: 2,
        nombreMenu: 'MENUITEMS.APPS.LIST.TICKETDETAILS',
        ruta: '/tickets/details',
        permisoPadreDto: 15
      }
    ]
  },
  {
    orden: 1,
    nombreMenu: 'MENUITEMS.APPS.LIST.LISTVIEW',
    ruta: '/tickets/list',
    permisoPadreDto: 15
  },
  {
    orden: 2,
    nombreMenu: 'MENUITEMS.APPS.LIST.TICKETDETAILS',
    ruta: '/tickets/details',
    permisoPadreDto: 15
  },
  {
    orden: 16,
    nombreMenu: 'MENUITEMS.APPS.LIST.NFTMARKETPLACE',
    permisoPadreDto: 10,
    isCollapsed: true,
    permisoHijoListDto: [
      {
        orden: 1,
        nombreMenu: 'MENUITEMS.APPS.LIST.ITEMDETAILS',
        ruta: '/marletplace/item-details',
        permisoPadreDto: 16
      },
    ]
  },
  {
    orden: 1,
    nombreMenu: 'MENUITEMS.APPS.LIST.ITEMDETAILS',
    ruta: '/marletplace/item-details',
    permisoPadreDto: 16
  },
  {
    orden: 17,
    nombreMenu: 'MENUITEMS.APPS.LIST.APIKEY',
    ruta: '/apikey',
    permisoPadreDto: 10,
  },
  {
    orden: 18,
    nombreMenu: 'MENUITEMS.PAGES.LIST.PRICING',
    ruta: '/pages/pricing',
    permisoPadreDto: 10
  },

  {
    orden: 20,
    nombreMenu: 'MENUITEMS.CHARTS.TEXT',
    icono: 'ri-pie-chart-line',
    isCollapsed: true,
    permisoHijoListDto: [
      {
        orden: 21,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.APEXCHARTS',
        permisoPadreDto: 20,
        isCollapsed: true,
        permisoHijoListDto: [
          {
            orden: 1,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.LINE',
            ruta: '/charts/apex-line',
            permisoPadreDto: 21
          },
          {
            orden: 2,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.AREA',
            ruta: '/charts/apex-area',
            permisoPadreDto: 21
          },
          {
            orden: 3,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.COLUMN',
            ruta: '/charts/apex-column',
            permisoPadreDto: 21
          },
          {
            orden: 4,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.BAR',
            ruta: '/charts/apex-bar',
            permisoPadreDto: 21
          },
          {
            orden: 5,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.MIXED',
            ruta: '/charts/apex-mixed',
            permisoPadreDto: 21
          },
          {
            orden: 6,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.TIMELINE',
            ruta: '/charts/apex-timeline',
            permisoPadreDto: 21
          },
          {
            orden: 7,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.RANGEAREA',
            ruta: '/charts/range-area',
            badge: {
              variant: 'bg-success',
              text: 'MENUITEMS.DASHBOARD.BADGE',
            },
            permisoPadreDto: 21
          },
          {
            orden: 8,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.FUNNEL',
            ruta: '/charts/funnel',
            badge: {
              variant: 'bg-success',
              text: 'MENUITEMS.DASHBOARD.BADGE',
            },
            permisoPadreDto: 21
          },
          {
            orden: 9,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.CANDLSTICK',
            ruta: '/charts/apex-candlestick',
            permisoPadreDto: 21
          },
          {
            orden: 10,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.BOXPLOT',
            ruta: '/charts/apex-boxplot',
            permisoPadreDto: 21
          },
          {
            orden: 11,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.BUBBLE',
            ruta: '/charts/apex-bubble',
            permisoPadreDto: 21
          },
          {
            orden: 12,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.SCATTER',
            ruta: '/charts/apex-scatter',
            permisoPadreDto: 21
          },
          {
            orden: 13,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.HEATMAP',
            ruta: '/charts/apex-heatmap',
            permisoPadreDto: 21
          },
          {
            orden: 14,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.TREEMAP',
            ruta: '/charts/apex-treemap',
            permisoPadreDto: 21
          },
          {
            orden: 15,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.PIE',
            ruta: '/charts/apex-pie',
            permisoPadreDto: 21
          },
          {
            orden: 16,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.RADIALBAR',
            ruta: '/charts/apex-radialbar',
            permisoPadreDto: 21
          },
          {
            orden: 17,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.RADAR',
            ruta: '/charts/apex-radar',
            permisoPadreDto: 21
          },
          {
            orden: 18,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.POLARAREA',
            ruta: '/charts/apex-polar',
            permisoPadreDto: 21
          },
        ]
      },
      {
        orden: 2,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.CHARTJS',
        ruta: '/charts/chartjs',
        permisoPadreDto: 20
      },
      {
        orden: 3,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.ECHARTS',
        ruta: '/charts/echarts',
        permisoPadreDto: 20
      }
    ]
  },
      {
        orden: 21,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.APEXCHARTS',
        permisoPadreDto: 20,
        isCollapsed: true,
        permisoHijoListDto: [
          {
            orden: 1,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.LINE',
            ruta: '/charts/apex-line',
            permisoPadreDto: 21
          },
          {
            orden: 2,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.AREA',
            ruta: '/charts/apex-area',
            permisoPadreDto: 21
          },
          {
            orden: 3,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.COLUMN',
            ruta: '/charts/apex-column',
            permisoPadreDto: 21
          },
          {
            orden: 4,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.BAR',
            ruta: '/charts/apex-bar',
            permisoPadreDto: 21
          },
          {
            orden: 5,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.MIXED',
            ruta: '/charts/apex-mixed',
            permisoPadreDto: 21
          },
          {
            orden: 6,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.TIMELINE',
            ruta: '/charts/apex-timeline',
            permisoPadreDto: 21
          },
          {
            orden: 7,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.RANGEAREA',
            ruta: '/charts/range-area',
            badge: {
              variant: 'bg-success',
              text: 'MENUITEMS.DASHBOARD.BADGE',
            },
            permisoPadreDto: 21
          },
          {
            orden: 8,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.FUNNEL',
            ruta: '/charts/funnel',
            badge: {
              variant: 'bg-success',
              text: 'MENUITEMS.DASHBOARD.BADGE',
            },
            permisoPadreDto: 21
          },
          {
            orden: 9,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.CANDLSTICK',
            ruta: '/charts/apex-candlestick',
            permisoPadreDto: 21
          },
          {
            orden: 10,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.BOXPLOT',
            ruta: '/charts/apex-boxplot',
            permisoPadreDto: 21
          },
          {
            orden: 11,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.BUBBLE',
            ruta: '/charts/apex-bubble',
            permisoPadreDto: 21
          },
          {
            orden: 12,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.SCATTER',
            ruta: '/charts/apex-scatter',
            permisoPadreDto: 21
          },
          {
            orden: 13,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.HEATMAP',
            ruta: '/charts/apex-heatmap',
            permisoPadreDto: 21
          },
          {
            orden: 14,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.TREEMAP',
            ruta: '/charts/apex-treemap',
            permisoPadreDto: 21
          },
          {
            orden: 15,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.PIE',
            ruta: '/charts/apex-pie',
            permisoPadreDto: 21
          },
          {
            orden: 16,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.RADIALBAR',
            ruta: '/charts/apex-radialbar',
            permisoPadreDto: 21
          },
          {
            orden: 17,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.RADAR',
            ruta: '/charts/apex-radar',
            permisoPadreDto: 21
          },
          {
            orden: 18,
            nombreMenu: 'MENUITEMS.CHARTS.LIST.POLARAREA',
            ruta: '/charts/apex-polar',
            permisoPadreDto: 21
          },
        ]
      },
      {
        orden: 1,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.LINE',
        ruta: '/charts/apex-line',
        permisoPadreDto: 21
      },
      {
        orden: 2,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.CHARTJS',
        ruta: '/charts/chartjs',
        permisoPadreDto: 20
      },
      {
        orden: 3,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.ECHARTS',
        ruta: '/charts/echarts',
        permisoPadreDto: 20
      },

      {
        orden: 1,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.LINE',
        ruta: '/charts/apex-line',
        permisoPadreDto: 21
      },
      {
        orden: 2,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.AREA',
        ruta: '/charts/apex-area',
        permisoPadreDto: 21
      },
      {
        orden: 3,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.COLUMN',
        ruta: '/charts/apex-column',
        permisoPadreDto: 21
      },
      {
        orden: 4,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.BAR',
        ruta: '/charts/apex-bar',
        permisoPadreDto: 21
      },
      {
        orden: 5,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.MIXED',
        ruta: '/charts/apex-mixed',
        permisoPadreDto: 21
      },
      {
        orden: 6,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.TIMELINE',
        ruta: '/charts/apex-timeline',
        permisoPadreDto: 21
      },
      {
        orden: 7,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.RANGEAREA',
        ruta: '/charts/range-area',
        badge: {
          variant: 'bg-success',
          text: 'MENUITEMS.DASHBOARD.BADGE',
        },
        permisoPadreDto: 21
      },
      {
        orden: 8,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.FUNNEL',
        ruta: '/charts/funnel',
        badge: {
          variant: 'bg-success',
          text: 'MENUITEMS.DASHBOARD.BADGE',
        },
        permisoPadreDto: 21
      },
      {
        orden: 9,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.CANDLSTICK',
        ruta: '/charts/apex-candlestick',
        permisoPadreDto: 21
      },
      {
        orden: 10,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.BOXPLOT',
        ruta: '/charts/apex-boxplot',
        permisoPadreDto: 21
      },
      {
        orden: 11,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.BUBBLE',
        ruta: '/charts/apex-bubble',
        permisoPadreDto: 21
      },
      {
        orden: 12,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.SCATTER',
        ruta: '/charts/apex-scatter',
        permisoPadreDto: 21
      },
      {
        orden: 13,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.HEATMAP',
        ruta: '/charts/apex-heatmap',
        permisoPadreDto: 21
      },
      {
        orden: 14,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.TREEMAP',
        ruta: '/charts/apex-treemap',
        permisoPadreDto: 21
      },
      {
        orden: 15,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.PIE',
        ruta: '/charts/apex-pie',
        permisoPadreDto: 21
      },
      {
        orden: 16,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.RADIALBAR',
        ruta: '/charts/apex-radialbar',
        permisoPadreDto: 21
      },
      {
        orden: 17,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.RADAR',
        ruta: '/charts/apex-radar',
        permisoPadreDto: 21
      },
      {
        orden: 18,
        nombreMenu: 'MENUITEMS.CHARTS.LIST.POLARAREA',
        ruta: '/charts/apex-polar',
        permisoPadreDto: 21
      },
];
