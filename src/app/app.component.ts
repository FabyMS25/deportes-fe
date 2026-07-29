import { Component } from '@angular/core';
import { environment } from 'src/environments/environment';
import { NgbModalConfig } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'deportes-gamq';
  
  subscriberId = environment.subscriberId;

  applicationIdentifier = environment.applicationIdentifier;

  constructor(modalConfig: NgbModalConfig) {
    // Keep headers and footers visible while long modal content scrolls.
    modalConfig.scrollable = true;
  }


styles = {

    bellButton: {

      root: {

        svg: {

          color: 'white',

          width: '45px',

          height: '40px',

          fill: 'white',

        },

      },

      dot: {

        rect: {

          fill: 'rgb(221, 0, 49)',

          strokeWidth: '0.2',

          stroke: 'white',

          width: '3.5px',

          height: '3.5px',

        },

        left: '40%',

      },

    },

    header: {

      root: {

        backgroundColor: '',

        '&:hover': { backgroundColor: '' },

        '.some_class': { color: '' },

      },

    },

    layout: {

      root: {

        backgroundColor: '',

      },

    },

    popover: {

      arrow: {

        backgroundColor: '',

        border: '',

      },

    },

  };

}
