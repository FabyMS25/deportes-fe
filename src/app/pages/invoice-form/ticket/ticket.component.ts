import { Component, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SlickCarouselComponent } from 'ngx-slick-carousel';
import { ComplejoDeportivo } from 'src/app/core/models/complejoDeportivo.model';
import { ReportsService } from 'src/app/core/services/api/reportes.service';

import { GlobalComponent } from 'src/app/global-component';

@Component({
  selector: 'app-ticket',
  templateUrl: './ticket.component.html',
  styleUrl: './ticket.component.scss'
})
export class TicketComponent {

  breadCrumbItems!: Array<{}>;
  currentTime!: string;
  globalAdmin = GlobalComponent.admin_deportes;
  
  contribuyente : any;
  dataComplejo!:ComplejoDeportivo;

  showLoading = false;

  @ViewChild('slickModal') slickModal!: SlickCarouselComponent;
  imagesList=['assets/images/fields/img-1.png','assets/images/fields/img-2.png',
    'assets/images/fields/img-3.png','assets/images/fields/img-4.png']
  /**
 * Swiper setting
 */
  config = {
    infinite: true,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    arrows: false
  };
  slidesConfig = {
    infinite: true,
    slidesToShow: 4,
    slidesToScroll: 1,
    autoplay: true,
  }
  
  weekDays: { name: string, date: Date }[] = [];
  activeDayName: string = '';
  currentWeekStart!: Date;
  currentWeekEnd!: Date;  
  allSlots: { [key: string]: { morningSlots: { time: string, isAvailable: boolean }[], afternoonSlots: { time: string, isAvailable: boolean }[] } } = {};

  @ViewChild('pdfViewer') pdfViewer!: ElementRef;

  constructor(private reportsService: ReportsService,
    // private modalService: NgbModal,
    private route: ActivatedRoute ,
    // private ruatService: RuatRequestsService, 
  ) { }


  async ngOnInit(): Promise<void> {
    this.breadCrumbItems = [
      { label: 'Complejo' },
      { label: 'Reserva', active: true }
    ];
    this.currentTime = (new Date()).toLocaleTimeString();
    if (window.sessionStorage.getItem("auth-token") === 'isContribuyente') {
      const currentUser = window.sessionStorage.getItem("currentUser");
      this.contribuyente = currentUser ? JSON.parse(currentUser) : null;
    }else{    
      this.contribuyente = null;
      
    }  
    this.dataComplejo = history.state.data;  
    if (this.dataComplejo) {
      this.showLoading = true;
      this.generarReportePDF(this.dataComplejo);
    }
  
    
  }
  /* API Services */
  private async generarReportePDF(field: any) {
    const data = await this.reportsService.getTicket(field.uuid).subscribe(
      (data: any) => {
        const file = new Blob([data], { type: 'application/pdf' });
        const fileURL = URL.createObjectURL(file);
        this.pdfViewer.nativeElement.data = fileURL;
        this.showLoading = false;
      }
    );
  }

  
  getAvatar(employee:any): string {
    return 'avatar-admin-m.png';
  }
  
  private getTime(time: string): number {
    return parseInt(time.split(':')[0], 10);
  }

  slickChange(event: any) {
    const swiper = document.querySelectorAll('.swiperlist')
  }

  slidePreview(id: any, event: any) {
    const swiper = document.querySelectorAll('.swiperlist')
    swiper.forEach((el: any) => {
      el.classList.remove('swiper-slide-thumb-active')
    })
    event.target.closest('.swiperlist').classList.add('swiper-slide-thumb-active')
    this.slickModal.slickGoTo(id)
  }
}
