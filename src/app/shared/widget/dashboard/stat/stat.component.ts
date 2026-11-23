import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-stat',
  templateUrl: './stat.component.html',
  styleUrls: ['./stat.component.scss']
})
export class StatComponent implements OnInit {

  @Input() title: string | undefined;
  @Input() value: any | undefined;
  @Input() icon: string | undefined;
  @Input() persantage: string | undefined;
  @Input() profit: string | undefined;
  @Input() link: string | undefined;

  /* Nuevos (opcionales, no afectan a los usos existentes del widget) */
  /** Clase completa del icono, p. ej. 'ri-building-line'. Si se define, se ignora `icon`. */
  @Input() iconClass: string | undefined;
  /** Color del tema para el icono: primary, secondary, success, warning, info, danger. */
  @Input() variant: string | undefined;
  /** Oculta el indicador de variación (%) cuando no hay tendencia que mostrar. */
  @Input() showTrend = true;
  /** Texto corto bajo el número (reemplaza al enlace). */
  @Input() caption: string | undefined;

  constructor() { }

  ngOnInit(): void {
  }

  num: number = 0;
  option = {
    startVal: this.num,
    useEasing: true,
    duration: 2,
    decimalPlaces: 2,
  };
}