// map.component.ts

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
  selector: 'app-map',
  standalone: true,
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
  imports: [CommonModule]
})
export class MapComponent implements OnInit {

  // === Eigenschaften ===
  map: L.Map | null = null;
  geoJsonLayer: L.GeoJSON<any> | null = null;
  streetsLayer: L.TileLayer | null = null;

  automatMarkers: L.Marker[] = [];
  currentLocationMarker: L.Marker | null = null;

  automatNames: {
    name: string;
    city: string;
    zipcode: string;
    machines: number;
  }[] = [];

  noAutomatFound: boolean = false;
  darkMode: boolean = false;

  private locationMarkerIcon = L.icon({
    iconUrl: 'assets/icons/current-location-icon.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  // === Lifecycle Hook ===
  ngOnInit(): void {
    this.initMap();
    this.showCurrentLocation();
  }

  // === Karten-Setup ===
  private initMap(): void {
    this.map = L.map('map', {
      zoomControl: false,
      minZoom: 3,
      maxZoom: 13,
      attributionControl: false,
      maxBounds: [
        [55.5, 5],
        [47, 16]
      ],
      maxBoundsViscosity: 1.0
    }).setView([51.1657, 10.4515], 7);

    this.map.scrollWheelZoom.enable();

    this.loadGeoJson();
    this.loadAutomaten();

    this.map.on('zoomend', () => {
      const zoomLevel = this.map!.getZoom();
      if (zoomLevel >= 10) {
        this.enableStreetLayer();
        this.disableGeoJsonStyles();
      } else {
        this.disableStreetLayer();
        this.enableGeoJsonStyles();
      }
    });
  }

  // === Daten laden ===
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
                if (this.map!.getZoom() < 12) {
                  const target = e.target;
                  target.setStyle({
                    fillColor: 'white',
                    color: 'black',
                    weight: 0.5,
                    fillOpacity: 1
                  });
                }
              },
              mouseout: (e) => {
                if (this.map!.getZoom() < 12) {
                  const target = e.target;
                  target.setStyle({
                    fillColor: 'black',
                    color: 'white',
                    weight: 0.5,
                    fillOpacity: 1
                  });
                }
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
    fetch('https://muheeb.createoceans.eu/api/locations.php')
      .then(response => response.json())
      .then(automaten => {
        automaten.forEach((automat: any) => {
          const lat = parseFloat(automat.lat);
          const lon = parseFloat(automat.lon);

          if (!lat || !lon) return;

          const marker = L.marker([lat, lon]);

          marker.bindTooltip(automat.name, {
            permanent: false,
            direction: 'auto',
            opacity: 0.9
          });

          const from = automat.working_from?.trim() || '';
          const till = automat.working_till?.trim() || '';

          const simplifyTime = (time: string): string => {
            if (!time) return '';
            return time.length === 8 ? time.substring(0, 5) : time;
          };

          const simplifiedFrom = simplifyTime(from);
          const simplifiedTill = simplifyTime(till);

          const isAlwaysOpen =
            (simplifiedFrom === '00:00' &&
              (simplifiedTill === '23:59' || simplifiedTill === '24:00' || simplifiedTill === '00:00')) ||
            from.toLowerCase() === '24/7' ||
            till.toLowerCase() === '24/7';

          let openingHours = '';
          if (isAlwaysOpen) {
            openingHours = '🕒 Rund um die Uhr (24/7)';
          } else if (simplifiedFrom && simplifiedTill) {
            openingHours = `🕒 ${simplifiedFrom} - ${simplifiedTill}`;
          } else {
            openingHours = '🕒 Keine Öffnungszeiten verfügbar';
          }

          const popupContent = `
            <div class="popup-content" style="max-width: 180px; font-size: 12px; line-height: 1.3;">
              <h4 style="margin: 0 0 5px;">${automat.name}</h4>
              ${automat.nameSub ? `<p style="color: #777;">${automat.nameSub}</p>` : ''}
              <p> ${automat.zipcode} ${automat.city}<br>${automat.address}</p>
              <p>${openingHours}</p>
              ${automat.phone ? `<p>☎️ <a href="tel:${automat.phone}">${automat.phone}</a></p>` : ''}
              ${automat.email ? `<p>✉️ <a href="mailto:${automat.email}">${automat.email}</a></p>` : ''}
            </div>`;

          marker.bindPopup(popupContent, {
            maxWidth: 250,
            closeButton: true,
            autoPan: true,
            autoPanPadding: [30, 30]
          });

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

        this.automatNames.sort((a, b) => {
          const cityA = a.city.toLowerCase();
          const cityB = b.city.toLowerCase();
          return cityA === cityB
            ? a.name.toLowerCase().localeCompare(b.name.toLowerCase())
            : cityA.localeCompare(cityB);
        });
      })
      .catch(error => {
        console.error('Fehler beim Laden der Automaten:', error);
      });
  }

  // === Layer-Management ===
  private enableStreetLayer(): void {
    if (!this.streetsLayer) {
      this.streetsLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      });
    }

    if (!this.map!.hasLayer(this.streetsLayer)) {
      this.map!.addLayer(this.streetsLayer);
    }
  }

  private disableStreetLayer(): void {
    if (this.streetsLayer && this.map!.hasLayer(this.streetsLayer)) {
      this.map!.removeLayer(this.streetsLayer);
    }
  }

  private enableGeoJsonStyles(): void {
    if (!this.geoJsonLayer) return;
    this.geoJsonLayer.setStyle({
      fillOpacity: 1,
      fillColor: 'black',
      color: 'white',
      weight: 0.5
    });
  }

  private disableGeoJsonStyles(): void {
    if (!this.geoJsonLayer) return;
    this.geoJsonLayer.setStyle({
      fillOpacity: 0,
      color: 'transparent'
    });
  }

  // === User Location ===
  private showCurrentLocation(): void {
    if (!this.map) return;

    this.map.locate({ setView: false, watch: false });

    this.map.once('locationfound', (e: L.LocationEvent) => {
      if (this.currentLocationMarker) {
        this.map!.removeLayer(this.currentLocationMarker);
      }

      this.currentLocationMarker = L.marker(e.latlng, { icon: this.locationMarkerIcon })
        .addTo(this.map!)
        .bindPopup('<span class="current-location-popup">Du bist hier!</span>')
        .openPopup();

      this.map!.flyTo(e.latlng, 14, {
        animate: true,
        duration: 1.5
      });
    });

    this.map.once('locationerror', (e: L.ErrorEvent) => {
      console.warn('Standortermittlung fehlgeschlagen:', e.message);
    });
  }

  locateMe(): void {
    this.showCurrentLocation();
  }

  // === Suchen und Filtern ===
  searchCityZip(searchTerm: string): void {
    const trimmedTerm = searchTerm.trim();

    if (!trimmedTerm) {
      this.showAllAutomaten();
      return;
    }

    const lowerCaseSearch = trimmedTerm.toLowerCase();

    const foundMarkers = this.automatMarkers.filter(marker => {
      const automat = (marker as any).automatData;
      return automat.city?.toLowerCase().includes(lowerCaseSearch) ||
             automat.zipcode?.toLowerCase().includes(lowerCaseSearch);
    });

    this.updateMapForSearch(foundMarkers);
  }

  searchAutomat(searchName: string): void {
    const trimmedName = searchName.trim();
    if (!trimmedName) {
      this.showAllAutomaten();
      return;
    }

    const lowerCaseSearch = trimmedName.toLowerCase();
    const foundMarkers = this.automatMarkers.filter(marker => {
      const automat = (marker as any).automatData;
      return automat.name?.toLowerCase().includes(lowerCaseSearch);
    });

    this.updateMapForSearch(foundMarkers);
  }

  private updateMapForSearch(foundMarkers: L.Marker[]): void {
    this.automatMarkers.forEach(marker => this.map!.removeLayer(marker));

    if (foundMarkers.length === 0) {
      this.noAutomatFound = true;
      return;
    }

    this.noAutomatFound = false;

    foundMarkers.forEach(marker => marker.addTo(this.map!));

    if (foundMarkers.length === 1) {
      this.map!.flyTo(foundMarkers[0].getLatLng(), 12, {
        animate: true,
        duration: 1.5
      });
      foundMarkers[0].openPopup();
    } else {
      const group = L.featureGroup(foundMarkers);
      this.map!.flyToBounds(group.getBounds(), {
        padding: [20, 20],
        animate: true,
        duration: 1.5
      });
    }
  }

  private showAllAutomaten(): void {
    this.automatMarkers.forEach(marker => {
      if (!this.map!.hasLayer(marker)) {
        marker.addTo(this.map!);
      }
    });
    this.noAutomatFound = false;
  }

  // === Dark Mode ===
  toggleMode(): void {
    this.darkMode = !this.darkMode;

    const body = document.body;
    const mapDiv = document.getElementById('map');

    if (this.darkMode) {
      body.classList.add('dark-mode');
      mapDiv?.classList.add('dark');
      mapDiv?.classList.remove('light');
    } else {
      body.classList.remove('dark-mode');
      mapDiv?.classList.remove('dark');
      mapDiv?.classList.add('light');
    }
  }

  // === Reset Map ===
  resetMap(): void {
    this.showAllAutomaten();

    if (this.map) {
      this.map.setView([51.1657, 10.4515], 6);
      this.disableStreetLayer();
      this.enableGeoJsonStyles();
    }

    (document.querySelector('#stateInput') as HTMLInputElement).value = '';
    (document.querySelector('#automatSelect') as HTMLSelectElement).value = '';

    this.noAutomatFound = false;
  }
}
