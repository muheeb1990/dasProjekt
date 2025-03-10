import { Component, OnInit } from '@angular/core';
import * as L from 'leaflet';
import { LatLngTuple } from 'leaflet'; // Wichtig für Typisierung

// Leaflet-Icon-Pfade setzen
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
  imports: []
})
export class AppComponent implements OnInit {
  geoJsonLayer: L.GeoJSON<any> | null = null;
  map: L.Map | null = null;
  automatMarkers: L.Marker[] = [];
  noAutomatFound: boolean = false;

  ngOnInit(): void {
    this.initMap();
  }

  private initMap(): void {
    this.map = L.map('map', {
      maxBounds: [
        [55.1, 5.5], // Norden, Westen
        [47.2, 15.5] // Süden, Osten
      ],
      maxBoundsViscosity: 1.0,
      minZoom: 6,
      maxZoom: 10
    }).setView([51.1657, 10.4515], 6);

    this.map.fitBounds([
      [55.1, 5.5],
      [47.2, 15.5]
    ]);

    // === Maske hinzufügen: Alles außerhalb von Deutschland abdecken ===
    const outerRing: LatLngTuple[] = [
      [-90, -180],
      [-90, 180],
      [90, 180],
      [90, -180],
      [-90, -180]
    ];

    const germanyCutout: LatLngTuple[] = [
      [55.1, 5.5],
      [55.1, 15.5],
      [47.2, 15.5],
      [47.2, 5.5],
      [55.1, 5.5]
    ];

    const mask = L.polygon([
      outerRing,
      germanyCutout
    ] as LatLngTuple[][], {
      color: 'black',
      fillColor: 'black',
      fillOpacity: 0.7,
      stroke: false
    }).addTo(this.map!);

    // === Lade die Bundesländer-GeoJSON ===
    fetch('assets/bundeslaender.geojson')
      .then(response => response.json())
      .then(geojsonData => {
        this.geoJsonLayer = L.geoJSON(geojsonData, {
          onEachFeature: (feature, layer) => {
            const nameProperty = feature.properties.name;

            if (!nameProperty) {
              console.warn('Kein name-Feld gefunden bei:', feature);
              return;
            }

            layer.bindPopup(`<b>${nameProperty}</b>`);

            layer.on({
              click: () => {
                layer.openPopup();
              }
            });
          },
          style: {
            color: 'blue',
            weight: 2,
            fillOpacity: 0.1
          }
        }).addTo(this.map!);
      });

    // === Lade die Verkaufsautomaten ===
    fetch('assets/automaten.json')
      .then(response => response.json())
      .then(automaten => {
        automaten.forEach((automat: any) => {
          if (!automat.lat || !automat.lon) {
            console.warn('Automat ohne Koordinaten gefunden:', automat);
            return;
          }

          const marker = L.marker([automat.lat, automat.lon]).addTo(this.map!);

          marker.bindPopup(`
            <b>${automat.name}</b><br>
            ${automat.beschreibung || 'Keine Beschreibung verfügbar.'}
          `);

          // Speichere den Automaten-Namen direkt im Marker
          (marker as any).automatName = automat.name;

          this.automatMarkers.push(marker);
        });
        console.log('Automaten-Marker geladen:', this.automatMarkers.length);
      })
      .catch(error => {
        console.error('Fehler beim Laden der Automaten:', error);
      });
  }

  // === Suche nach Bundesland ===
  searchState(stateName: string): void {
    if (!stateName || !this.geoJsonLayer) {
      return;
    }

    const layers = this.geoJsonLayer.getLayers();
    let found = false;

    layers.forEach((layer: any) => {
      const feature = layer.feature;
      const nameProperty = feature.properties.name;

      if (!nameProperty) {
        console.warn('Kein name gefunden bei:', feature);
        return;
      }

      const name = nameProperty.toLowerCase();

      if (name === stateName.toLowerCase()) {
        const bounds = layer.getBounds();

        layer.openPopup();

        layer.setStyle({
          color: '#FF5733',
          weight: 4,
          fillOpacity: 0.6
        });

        this.map!.fitBounds(bounds, {
          animate: true,
          duration: 1
        });

        found = true;
      } else {
        // Andere Bundesländer zurücksetzen
        layer.setStyle({
          color: '#3388ff',
          weight: 2,
          fillOpacity: 0.2
        });
      }
    });

    if (!found) {
      alert('Bundesland nicht gefunden!');
    }
  }

  // === Suche nach Automaten ===
  searchAutomat(searchTerm: string): void {
    console.log('Suche gestartet mit:', searchTerm);

    if (!searchTerm) {
      console.log('Suchfeld leer, zeige alle Marker.');
      this.automatMarkers.forEach(marker => {
        if (!this.map!.hasLayer(marker)) {
          this.map!.addLayer(marker);
        }
      });
      this.noAutomatFound = false;
      return;
    }

    const lowerCaseSearch = searchTerm.toLowerCase();
    let found = false;

    this.automatMarkers.forEach(marker => {
      const automatName = (marker as any).automatName;

      console.log('Vergleiche:', automatName, 'mit Suchbegriff:', lowerCaseSearch);

      if (automatName && automatName.toLowerCase().includes(lowerCaseSearch)) {
        console.log('Treffer:', automatName);
        if (!this.map!.hasLayer(marker)) {
          this.map!.addLayer(marker);
        }
        found = true;
      } else {
        if (this.map!.hasLayer(marker)) {
          console.log('Kein Treffer, entferne:', automatName);
          this.map!.removeLayer(marker);
        }
      }
    });

    this.noAutomatFound = !found;

    if (!found) {
      console.log('Kein Automat gefunden!');
    } else {
      console.log('Automaten gefunden!');
    }
  }
}
