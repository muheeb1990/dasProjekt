import { Component } from '@angular/core';
import { MapComponent } from './pages/map/map.component'; // Import MapComponent

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MapComponent], // MapComponent einbinden
  template: `<app-map></app-map>` // Anzeige der Karte
})
export class AppComponent { }
