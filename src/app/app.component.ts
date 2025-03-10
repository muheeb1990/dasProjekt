import { Component, OnInit } from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  ngOnInit(): void {
    this.initMap();
  }

  private initMap(): void {
    const map = L.map('map', {
      maxBounds: [
        [55.2, 5.0],  // nördlicher / westlicher
        [47.0, 15.0]  // südlicher / östlicher
      ],
      maxBoundsViscosity: 1.0,
      minZoom: 6,
      maxZoom: 10
    }).setView([51.1657, 10.4515], 6);

    map.fitBounds([
      [55.1, 5.5],
      [47.2, 15.5]
    ]);

    L.tileLayer('', {
      attribution: ''
    }).addTo(map);
    
    // Variable, um das aktuell ausgewählte Bundesland zu merken
    let selectedLayer: L.Layer | null = null;

    // GeoJSON der Bundesländer laden und hinzufügen
    fetch('assets/bundeslaender.geojson')
      .then(response => response.json())
      .then(geojsonData => {
        L.geoJSON(geojsonData, {
          onEachFeature: (feature, layer) => {
            // Popup mit Bundeslandnamen
            layer.bindPopup(`<b>${feature.properties.NAME}</b>`);

            // Event: Klick auf ein Bundesland
            layer.on({
              click: () => {
                if (selectedLayer) {
                  // Alte Auswahl zurücksetzen
                  (selectedLayer as L.Path).setStyle({
                    color: 'blue',
                    weight: 2,
                    fillOpacity: 0.1
                  });
                }

                // Neue Auswahl hervorheben
                (layer as L.Path).setStyle({
                  color: 'yellow',
                  weight: 3,
                  fillOpacity: 0.5
                });

                selectedLayer = layer;
              }
            });
          },
          // Standardstil für alle Bundesländer
          style: {
            color: 'blue',
            weight: 2,
            fillOpacity: 0.1
          }
        }).addTo(map);
      });
  }
}
