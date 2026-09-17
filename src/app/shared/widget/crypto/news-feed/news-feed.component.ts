import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-news-feed',
  templateUrl: './news-feed.component.html',
  styleUrls: ['./news-feed.component.scss']
})

export class NewsFeedComponent implements OnInit {

   @Input() NewsFeed: Array<{
    image?: string;
    content?: string;
    date?: string;
    time?: string;
  }> | undefined;

  constructor() { }

  ngOnInit(): void {
  }

}
