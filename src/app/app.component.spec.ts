import { Component, OnInit } from '@angular/core';
import * as L from 'leaflet';
import { CommonModule } from '@angular/common';

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
locateMe() {
throw new Error('Method not implemented.');
}
resetMap() {
throw new Error('Method not implemented.');
}
  map: L.Map | null = null;
  geoJsonLayer: L.GeoJSON<any> | null = null;

  automatMarkers: L.Marker[] = [];
  automatNames: { name: string; city: string; zipcode: string; machines: number; }[] = [];

  noAutomatFound: boolean = false;
  darkMode: boolean = false;

  ngOnInit(): void {
    this.initMap();
  }

  private initMap(): void {
    this.map = L.map('map', {
      zoomControl: false, // Zoom Buttons deaktiviert
      minZoom: 6,
      maxZoom: 13,
      attributionControl: false,
      maxBounds: [
        [55.5, 5],
        [47, 16]
      ],
      maxBoundsViscosity: 1.0,
      zoomAnimation: true,
      zoomAnimationThreshold: 4,
      easeLinearity: 0.35,
      zoomSnap: 0.1,
      zoomDelta: 0.5
    }).setView([51.1657, 10.4515], 8);

    this.map.scrollWheelZoom.enable();

    this.loadGeoJson();
    this.loadAutomaten();
  }

  private loadGeoJson(): void {
    fetch('assets/bundeslaender.geojson')
      .then(response => response.json())
      .then(geojsonData => {
        this.geoJsonLayer = L.geoJSON(geojsonData, {
          style: {
            color: 'white',
            weight: 2,
            fillColor: 'black',
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
          padding: [10, 10]
        });
      });
  }

  private loadAutomaten(): void {
    // ✅ HIER DEINE API URL! (evtl. Proxy aktivieren)
    fetch('https://muheeb.createoceans.eu/api/locations.php')
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
            <div class="popup-content" style="max-width: 180px; font-size: 12px; line-height: 1.3;">
              <h4>${automat.name}</h4>

              ${automat.nameSub ? `<p style="color: #777;">${automat.nameSub}</p>` : ''}

              <p>
                📍 ${automat.zipcode} ${automat.city}<br>
                ${automat.address}
              </p>

              <p>
                🕒 ${automat.working_from} - ${automat.working_till}
              </p>

              <p>
                ☎️ <a href="tel:${automat.phone}">${automat.phone}</a><br>
                ✉️ <a href="mailto:${automat.email}">${automat.email}</a>
              </p>

              <small style="color: #aaa;">
                Aktualisiert: ${automat.date}
              </small>
            </div>
          `, { maxWidth: 200, closeButton: true });

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
    const trimmedTerm = searchTerm.trim();
    console.log('Stadt/PLZ-Suche gestartet mit:', trimmedTerm);

    if (!trimmedTerm) {
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
    const trimmedName = searchName.trim();
    console.log('Automaten-Suche gestartet mit:', trimmedName);

    if (!trimmedName) {
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
        this.map!.flyTo(latLng, 10, {
          animate: true,
          duration: 1.5,
          easeLinearity: 0.25
        });
        foundMarkers[0].openPopup();
      } else {
        const group = L.featureGroup(foundMarkers);
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

  toggleMode(): void {
    this.darkMode = !this.darkMode;

    const body = document.body;
    const mapDiv = document.getElementById('map');
    const controlsDiv = document.querySelector('.controls');

    if (this.darkMode) {
      body.classList.add('dark-mode');
      body.classList.remove('light-mode');
      mapDiv?.classList.add('dark');
      mapDiv?.classList.remove('light');
      controlsDiv?.classList.add('dark');
      controlsDiv?.classList.remove('light');
    } else {
      body.classList.add('light-mode');
      body.classList.remove('dark-mode');
      mapDiv?.classList.add('light');
      mapDiv?.classList.remove('dark');
      controlsDiv?.classList.add('light');
      controlsDiv?.classList.remove('dark');
    }
  }
}
