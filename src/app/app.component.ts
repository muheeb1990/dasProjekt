import { Component, OnInit } from '@angular/core';
import * as L from 'leaflet';
import { CommonModule } from '@angular/common';

// Standard-Leaflet-Icons setzen
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/icons/marker-icon-2x.png',
  iconUrl: 'assets/icons/marker-icon.png',
  shadowUrl: 'assets/icons/marker-shadow.png'
});

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [CommonModule]
})
export class AppComponent implements OnInit {

  map: L.Map | null = null;
  geoJsonLayer: L.GeoJSON<any> | null = null;

  automatMarkers: L.Marker[] = [];

  // Automaten-Liste für Dropdown
  automatNames: {
    name: string;
    city: string;
    zipcode: string;
    machines: number;
  }[] = [];

  noAutomatFound: boolean = false;

  ngOnInit(): void {
    this.initMap();
  }

  private initMap(): void {
    this.map = L.map('map', {
      zoomControl: true,
      minZoom: 6,
      maxZoom: 12,
      attributionControl: false,
      maxBounds: [
        [55.5, 5],   // Nordwesten
        [47, 16]     // Südosten
      ],
      maxBoundsViscosity: 1.0,

      // SMOOTH ZOOM & SCROLL SETTINGS
      zoomAnimation: true,
      zoomAnimationThreshold: 4,
      easeLinearity: 0.35,
      zoomSnap: 0.1,
      zoomDelta: 0.5
    }).setView([51.1657, 10.4515], 8);

    // ScrollWheel aktivieren (Optional)
    this.map.scrollWheelZoom.enable();

    // Jetzt laden wir GeoJSON & Automaten
    this.loadGeoJson();
    this.loadAutomaten();
  }

  private loadGeoJson(): void {
    fetch('assets/bundeslaender.geojson')
      .then(response => response.json())
      .then(geojsonData => {
        this.geoJsonLayer = L.geoJSON(geojsonData, {
          style: {
            color: 'white',      // Randfarbe Standard
            weight: 2,
            fillColor: 'black',  // Füllfarbe Standard
            fillOpacity: 1
          },
          onEachFeature: (feature, layer) => {
            layer.on({
              mouseover: (e) => {
                const target = e.target;
                target.setStyle({
                  fillColor: 'white',
                  color: 'black',
                  weight: 2,
                  fillOpacity: 1
                });
              },
              mouseout: (e) => {
                const target = e.target;
                target.setStyle({
                  fillColor: 'black',
                  color: 'white',
                  weight: 2,
                  fillOpacity: 1
                });
              },
              click: () => {
                layer.openPopup();
              }
            });

            layer.bindPopup(`<b>${feature.properties.name}</b>`);
          }
        }).addTo(this.map!);

        this.map!.fitBounds(this.geoJsonLayer.getBounds(), {
          padding: [10, 10] // kleineres Padding für bessere Darstellung
        });
      });
  }

  private loadAutomaten(): void {
    fetch('assets/automaten.json')
      .then(response => response.json())
      .then(automaten => {
        automaten.forEach((automat: any) => {
          const lat = parseFloat(automat.lat);
          const lon = parseFloat(automat.lon);

          if (!lat || !lon) {
            console.warn('Automat ohne gültige Koordinaten:', automat);
            return;
          }

          const marker = L.marker([lat, lon]);

          marker.bindTooltip(automat.name, {
            permanent: false,
            direction: 'top',
            opacity: 0.9
          });

          marker.bindPopup(`
            <div class="popup-content">
              <h3>${automat.name}</h3>
              ${automat.nameSub ? `<p class="subname">${automat.nameSub}</p>` : ''}
              <p><strong>Adresse:</strong><br>
                ${automat.address}<br>
                ${automat.zipcode} ${automat.city} (${automat.country})
              </p>
              <p><strong>Maschinen:</strong> ${automat.machines}</p>
              <p><strong>Kontakt:</strong><br>
                📞 <a href="tel:${automat.phone}">${automat.phone}</a><br>
                ✉️ <a href="mailto:${automat.email}">${automat.email}</a>
              </p>
              <p><strong>Öffnungszeiten:</strong><br>
                Von: ${automat.working_from} Uhr bis ${automat.working_till} Uhr<br>
                Wochenende: ${automat.on_weekends}
              </p>
              <p class="updated">Letzte Aktualisierung:<br> ${automat.date}</p>
            </div>
          `);

          (marker as any).automatData = automat;

          this.automatNames.push({
            name: automat.name,
            city: automat.city,
            zipcode: automat.zipcode,
            machines: automat.machines
          });

          this.automatMarkers.push(marker);
          marker.addTo(this.map!);
        });
      })
      .catch(error => {
        console.error('Fehler beim Laden der Automaten:', error);
      });
  }

  searchCityZip(searchTerm: string): void {
    const trimmedTerm = searchTerm.trim();  // Leerzeichen entfernen!
    console.log('Stadt/PLZ-Suche gestartet mit:', trimmedTerm);
  
    if (!trimmedTerm) {
      console.log('Eingabe leer → alle Automaten anzeigen');
      this.showAllAutomaten();
      return;
    }
  
    const lowerCaseSearch = trimmedTerm.toLowerCase();
    const foundMarkers: L.Marker[] = [];
  
    this.automatMarkers.forEach(marker => {
      const automat = (marker as any).automatData;
      const city = automat.city?.toLowerCase() || '';
      const zipcode = automat.zipcode?.toLowerCase() || '';
  
      if (city.includes(lowerCaseSearch) || zipcode.includes(lowerCaseSearch)) {
        if (!this.map!.hasLayer(marker)) {
          this.map!.addLayer(marker);
        }
        foundMarkers.push(marker);
      } else {
        if (this.map!.hasLayer(marker)) {
          this.map!.removeLayer(marker);
        }
      }
    });
  
    this.handleSearchResult(foundMarkers);
  }
  

  searchAutomat(searchName: string): void {
    const trimmedName = searchName.trim();  // Leerzeichen entfernen!
    console.log('Automaten-Suche gestartet mit:', trimmedName);
  
    if (!trimmedName) {
      console.log('Eingabe leer → alle Automaten anzeigen');
      this.showAllAutomaten();
      return;
    }
  
    const lowerCaseSearch = trimmedName.toLowerCase();
    const foundMarkers: L.Marker[] = [];
  
    this.automatMarkers.forEach(marker => {
      const automat = (marker as any).automatData;
      const name = automat.name?.toLowerCase() || '';
  
      if (name.includes(lowerCaseSearch)) {
        if (!this.map!.hasLayer(marker)) {
          this.map!.addLayer(marker);
        }
        foundMarkers.push(marker);
      } else {
        if (this.map!.hasLayer(marker)) {
          this.map!.removeLayer(marker);
        }
      }
    });
  
    this.handleSearchResult(foundMarkers);
  }
  

  private handleSearchResult(foundMarkers: L.Marker[]): void {
    if (foundMarkers.length === 0) {
      this.noAutomatFound = true;
    } else {
      this.noAutomatFound = false;

      if (foundMarkers.length === 1) {
        const latLng = foundMarkers[0].getLatLng();

        // SMOOTH FLY TO single marker
        this.map!.flyTo(latLng, 10, {
          animate: true,
          duration: 1.5,
          easeLinearity: 0.25
        });

        foundMarkers[0].openPopup();
      } else {
        const group = L.featureGroup(foundMarkers);

        // SMOOTH FLY TO bounds
        this.map!.flyToBounds(group.getBounds(), {
          padding: [20, 20],
          animate: true,
          duration: 1.5,
          easeLinearity: 0.25
        });
      }
    }
  }

  private showAllAutomaten(): void {
    this.automatMarkers.forEach(marker => {
      if (!this.map!.hasLayer(marker)) {
        this.map!.addLayer(marker);
      }
    });
    this.noAutomatFound = false;
  }
}
