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

  darkMode: boolean = false; // Darkmode Toggle

  ngOnInit(): void {
    this.initMap();
  }

  private initMap(): void {
    this.map = L.map('map', {
      zoomControl: false, // ⛔️ Kein Zoom-Control-Button
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
            weight: 0.5,
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
                  weight: 0.5,
                  fillOpacity: 1
                });
              },
              mouseout: (e) => {
                const target = e.target;
                target.setStyle({
                  fillColor: 'black',
                  color: 'white',
                  weight: 0.5,
                  fillOpacity: 1
                });
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
    fetch('/api/locations.php')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(automaten => {
        console.log('Automaten geladen:', automaten);
  
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
              <h4 style="margin: 0 0 5px; font-size: 14px;">${automat.name}</h4>
              ${automat.nameSub ? `<p style="margin: 0 0 5px; font-size: 12px; color: #777;">${automat.nameSub}</p>` : ''}
              <p style="margin: 0 0 5px;">
                📍 ${automat.zipcode} ${automat.city}<br>${automat.address}
              </p>
              <p style="margin: 0 0 5px;">🕒 ${automat.working_from} - ${automat.working_till}</p>
              <p style="margin: 0 0 5px;">☎️ <a href="tel:${automat.phone}">${automat.phone}</a></p>
              <p style="margin: 0;">✉️ <a href="mailto:${automat.email}">${automat.email}</a></p>
              <small style="display:block; margin-top: 5px; color: #aaa;">${automat.date}</small>
            </div>
          `, { maxWidth: 200, closeButton: true });
  
          (marker as any).automatData = automat;
  
          // ➡️ Automaten für Dropdown speichern
          this.automatNames.push({
            name: automat.name,
            city: automat.city,
            zipcode: automat.zipcode,
            machines: automat.machines
          });
  
          this.automatMarkers.push(marker);
          marker.addTo(this.map!);
        });
  
        // 🔧 ➡️ NACH DEM LADEN: Sortiere alphabetisch nach Stadtname & Automatenname
        this.automatNames.sort((a, b) => {
          const cityA = a.city.toLowerCase();
          const cityB = b.city.toLowerCase();
  
          if (cityA < cityB) return -1;
          if (cityA > cityB) return 1;
  
          // Wenn Städte gleich → Sortiere nach Automatenname
          const nameA = a.name.toLowerCase();
          const nameB = b.name.toLowerCase();
  
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
  
          return 0;
        });
  
        console.log('Sortierte Automaten:', this.automatNames);
      })
      .catch(error => {
        console.error('Fehler beim Laden der Automaten:', error);
      });
  }
  

  searchCityZip(searchTerm: string): void {
    const trimmedTerm = searchTerm.trim();

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
    const button = document.querySelector('.mode-toggle');
  
    if (this.darkMode) {
      body.classList.add('dark-mode');
      mapDiv?.classList.add('dark');
      mapDiv?.classList.remove('light');
      if (button) button.textContent = 'Light Mode';
    } else {
      body.classList.remove('dark-mode');
      mapDiv?.classList.remove('dark');
      mapDiv?.classList.add('light');
      if (button) button.textContent = 'Dark Mode';
    }
  }
  
}
