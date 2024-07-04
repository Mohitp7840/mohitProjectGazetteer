let map, currentMarker, streetLayer, satelliteLayer, currentCountryData, countryBoundary;
let airportsLayer, citiesLayer;

const ZOOM_THRESHOLD = 8;
const MAX_AIRPORTS_PER_CLUSTER = 3;


// Put the application when the document is ready
$(document).ready(() => {
    initMap();
    getUserLocation();
    populateCountrySelect();
    $('#countrySelect').change(handleCountrySelection);
});

// Add Map and controls
function initMap() {
    map = L.map('map').setView([0, 0], 2);

    streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });

    airportsLayer = L.layerGroup();
    citiesLayer = L.layerGroup();

    L.control.layers({
        "Street View": streetLayer,
        "Satellite View": satelliteLayer
    },
    {
        "Airports": airportsLayer,
        "Cities": citiesLayer
    }).addTo(map);

    map.on('overlayadd', function(e) {
        if (currentCountryData) {
            if (e.name === 'Airports') {
                loadAirports(currentCountryData.cca2);
            } else if (e.name === 'Cities') {
                loadCities(currentCountryData.cca2);
            }
        }
    });

    map.on('zoomend', function() {
        if (map.hasLayer(airportsLayer)) {
            updateAirportDisplay();
        }
        if (map.hasLayer(citiesLayer)) {
            updateCityDisplay();
        }
    });

    addCustomButtons();
}

function addCustomButtons() {
    const buttonData = [
        { id: 'infoBtn', icon: 'fa-info', title: 'Country Information' },
        { id: 'weatherBtn', icon: 'fa-cloud', title: 'Weather Information' },
        { id: 'currencyBtn', icon: 'fa-dollar-sign', title: 'Currency Information' },
        { id: 'wikiBtn', icon: 'fa-wikipedia-w', title: 'Wikipedia Information' },
        { id: 'newsBtn', icon: 'fa-newspaper', title: 'News Information' }
    ];

    const CustomControl = L.Control.extend({
        options: { position: 'topleft' },
        onAdd: function() {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control custom-buttons-container');
            buttonData.forEach(button => {
                const btn = L.DomUtil.create('a', 'custom-button', container);
                btn.href = '#';
                btn.id = button.id;
                btn.innerHTML = `<i class="fas ${button.icon}"></i>`;
                btn.title = button.title;
                L.DomEvent.on(btn, 'click', L.DomEvent.stop)
                    .on(btn, 'click', () => handleButtonClick(button.id));
            });
            return container;
        }
    });

    map.addControl(new CustomControl());
}

// User location and country data handling
function getUserLocation() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude: lat, longitude: lon } = position.coords;
                fetchCountryFromCoordinates(lat, lon);
            },
            error => console.error("Error getting location:", error),
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    } else {
        console.log("Geolocation is not supported by this browser.");
    }
}

function fetchCountryFromCoordinates(lat, lon) {
    fetch(`/api/geocode?lat=${lat}&lon=${lon}`)
        .then(response => response.json())
        .then(data => {
            if (data.country && data.countryCode) {
                loadCountryData(data.countryCode);
                $('#countrySelect').val(data.countryCode).trigger('change');
            } else {
                throw new Error('Unable to determine country from API response');
            }
        })
        .catch(error => {
            console.error("Error getting country information:", error);
            updateMapView(lat, lon, "Your location", 4);
        });
}

function handleCountrySelection() {
    const countryCode = $(this).val();
    if (countryCode) {
        loadCountryData(countryCode);
    }
}

function loadCountryData(countryCode) {
    console.log(`Loading country data for code: ${countryCode}`);
    $.ajax({
        url: `https://restcountries.com/v3.1/alpha/${countryCode}`,
        method: 'GET',
        dataType: 'json',
        success: data => {
            if (data && data.length > 0) {
                currentCountryData = data[0];
                console.log('Received country data:', currentCountryData);
                updateMapView(currentCountryData.latlng[0], currentCountryData.latlng[1], currentCountryData.name.common, 4);
                fetchAndDisplayCountryBoundary(countryCode);
            } else {
                throw new Error('Invalid data received from REST Countries API');
            }
        },
        error: (jqXHR, textStatus, errorThrown) => {
            console.error('Error loading country data:', textStatus, errorThrown);
            alert('Failed to load country data. Please try again.');
        }
    });
}

function loadAirports(countryCode) {
    console.log(`Loading airports for country code: ${countryCode}`);
    airportsLayer.clearLayers();

    $.ajax({
        url: `/api/airports/${countryCode}`,
        method: 'GET',
        dataType: 'json',
        success: function(data) {
            console.log(`Received airport data:`, data);
            if (data.features && data.features.length > 0) {
                window.airportData = data;
                updateAirportDisplay();
            } else {
                console.log(`No airports found for country code: ${countryCode}`);
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.error("Error fetching airport data:", textStatus, errorThrown);
            alert("Failed to load airport data. Please try again later.");
        }
    });
}

function updateAirportDisplay() {
    if (!window.airportData) return;

    airportsLayer.clearLayers();

    const bounds = map.getBounds();
    const visibleAirports = window.airportData.features.filter(airport => 
        bounds.contains(L.latLng(airport.geometry.coordinates[1], airport.geometry.coordinates[0]))
    );

    const clusters = clusterAirports(visibleAirports);
    
    clusters.forEach(cluster => {
        if (cluster.count === 1 || map.getZoom() >= ZOOM_THRESHOLD) {
            cluster.airports.forEach(airport => addAirportMarker(airport, airportsLayer, false));
        } else if (cluster.count > MAX_AIRPORTS_PER_CLUSTER) {
            addClusterMarker(cluster.center, cluster.count, airportsLayer, 'airport');
        } else {
            cluster.airports.forEach(airport => addAirportMarker(airport, airportsLayer, true));
        }
    });
}

function addAirportMarker(airport, layer, small) {
    L.marker([airport.geometry.coordinates[1], airport.geometry.coordinates[0]], {
        icon: L.divIcon({
            html: '<div class="airport-icon-inner"><i class="fas fa-plane"></i></div>',
            className: `custom-div-icon airport-icon${small ? ' small' : ''}`,
            iconSize: small ? [20, 20] : [30, 30],
            iconAnchor: small ? [10, 20] : [15, 30],
            popupAnchor: small ? [0, -20] : [0, -30]
        })
    }).bindPopup(`
        <b>${airport.properties.name}</b><br>
        City: ${airport.properties.city}<br>
        IATA: ${airport.properties.iata || 'N/A'}<br>
        ICAO: ${airport.properties.icao || 'N/A'}<br>
        Type: ${airport.properties.type}
    `).addTo(layer);
}

function addClusterMarker(center, count, layer, type) {
    L.marker(center, {
        icon: L.divIcon({
            html: `<div class="cluster-icon">${count}</div>`,
            className: `custom-cluster-icon ${type}-cluster`,
            iconSize: L.point(40, 40),
            iconAnchor: [20, 40],
            popupAnchor: [0, -40]
        })
    }).addTo(layer);
}

function clusterAirports(airports) {
    const clusters = [];
    const gridSize = 50;

    airports.forEach(airport => {
        const pixel = map.latLngToContainerPoint(
            L.latLng(airport.geometry.coordinates[1], airport.geometry.coordinates[0])
        );
        let found = false;

        for (let i = 0; i < clusters.length; i++) {
            const clusterPixel = map.latLngToContainerPoint(clusters[i].center);
            if (Math.abs(pixel.x - clusterPixel.x) < gridSize && Math.abs(pixel.y - clusterPixel.y) < gridSize) {
                clusters[i].count++;
                clusters[i].airports.push(airport);
                clusters[i].center = L.latLng(
                    (clusters[i].center.lat * (clusters[i].count - 1) + airport.geometry.coordinates[1]) / clusters[i].count,
                    (clusters[i].center.lng * (clusters[i].count - 1) + airport.geometry.coordinates[0]) / clusters[i].count
                );
                found = true;
                break;
            }
        }

        if (!found) {
            clusters.push({
                center: L.latLng(airport.geometry.coordinates[1], airport.geometry.coordinates[0]),
                count: 1,
                airports: [airport]
            });
        }
    });

    return clusters;
}

function loadCities(countryCode) {
    console.log(`Loading cities for country code: ${countryCode}`);
    citiesLayer.clearLayers();

    $.ajax({
        url: `/api/cities/${countryCode}`,
        method: 'GET',
        dataType: 'json',
        success: function(data) {
            console.log(`Received city data:`, data);
            if (data.features && data.features.length > 0) {
                window.cityData = data;
                updateCityDisplay();
            } else {
                console.log(`No cities found for country code: ${countryCode}`);
                alert(`No cities found for ${currentCountryData.name.common}. The dataset might not include cities for this country.`);
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.error("Error fetching city data:", textStatus, errorThrown);
            let errorMessage = "Failed to load city data. ";
            if (jqXHR.responseJSON && jqXHR.responseJSON.error) {
                errorMessage += jqXHR.responseJSON.error;
            } else {
                errorMessage += "Please try again later.";
            }
            alert(errorMessage);
        }
    });
}

function updateCityDisplay() {
    if (!window.cityData) return;

    citiesLayer.clearLayers();

    const bounds = map.getBounds();
    const visibleCities = window.cityData.features.filter(city => 
        bounds.contains(L.latLng(city.geometry.coordinates[1], city.geometry.coordinates[0]))
    );

    const clusters = clusterCities(visibleCities);
    
    clusters.forEach(cluster => {
        const zoom = map.getZoom();
        const citiesToShow = Math.min(Math.max(1, Math.floor(zoom - ZOOM_THRESHOLD + 1) * 2), cluster.cities.length);

        if (citiesToShow >= cluster.cities.length || zoom >= 12) {
            cluster.cities.forEach(city => addCityMarker(city, citiesLayer));
        } else {
            cluster.cities.slice(0, citiesToShow).forEach(city => addCityMarker(city, citiesLayer));
            
            if (cluster.cities.length > citiesToShow) {
                const remainingCount = cluster.cities.length - citiesToShow;
                addClusterMarker(cluster.center, remainingCount, citiesLayer);
            }
        }
    });
}

function addCityMarker(city, layer) {
    L.marker([city.geometry.coordinates[1], city.geometry.coordinates[0]], {
        icon: L.divIcon({
            html: `
                <i class="fas fa-map-marker-alt"></i>
                <i class="fas fa-city city-inner-icon"></i>
            `,
            className: `custom-div-icon city-icon ${city.properties.capital ? 'capital' : ''}`,
            iconSize: [30, 40],
            iconAnchor: [15, 40],
            popupAnchor: [0, -40]
        })
    }).bindPopup(`
        <b>${city.properties.name}</b><br>
        Population: ${city.properties.population.toLocaleString()}<br>
        ${city.properties.capital ? 'Capital City' : ''}
    `).addTo(layer);
}

function addClusterMarker(center, count, layer) {
    L.marker(center, {
        icon: L.divIcon({
            html: `<div class="cluster-icon">${count}</div>`,
            className: 'custom-cluster-icon city-cluster',
            iconSize: L.point(40, 40),
            iconAnchor: [20, 40],
            popupAnchor: [0, -40]
        })
    }).addTo(layer);
}

function clusterCities(cities) {
    const clusters = [];
    const gridSize = 30;

    cities.sort((a, b) => b.properties.population - a.properties.population);

    cities.forEach(city => {
        const pixel = map.latLngToContainerPoint(
            L.latLng(city.geometry.coordinates[1], city.geometry.coordinates[0])
        );
        let found = false;

        for (let i = 0; i < clusters.length; i++) {
            const clusterPixel = map.latLngToContainerPoint(clusters[i].center);
            if (Math.abs(pixel.x - clusterPixel.x) < gridSize && Math.abs(pixel.y - clusterPixel.y) < gridSize) {
                clusters[i].cities.push(city);
                found = true;
                break;
            }
        }

        if (!found) {
            clusters.push({
                center: L.latLng(city.geometry.coordinates[1], city.geometry.coordinates[0]),
                cities: [city]
            });
        }
    });

    return clusters;
}

function fetchAndDisplayCountryBoundary(countryCode) {
    fetch(`/api/country-boundary/${countryCode}`)
        .then(response => response.json())
        .then(data => {
            if (countryBoundary) {
                map.removeLayer(countryBoundary);
            }
            countryBoundary = L.geoJSON(data, {
                style: {
                    color: "#ff7800",
                    weight: 2,
                    opacity: 0.65,
                    fillOpacity: 0.2
                }
            }).addTo(map);
            map.fitBounds(countryBoundary.getBounds());
        })
        .catch(error => console.error('Error fetching country boundary:', error));
}

function updateMapView(lat, lon, label, zoomLevel) {
    if (lat && lon) {
        map.setView([lat, lon], zoomLevel);
        if (currentMarker) {
            map.removeLayer(currentMarker);
        }
        currentMarker = L.marker([lat, lon]).addTo(map);
        currentMarker.bindPopup(label).openPopup();
    } else {
        console.error('Invalid coordinates:', lat, lon);
    }
}

// Button click handlers
function handleButtonClick(buttonId) {
    const handlers = {
        'infoBtn': displayCountryInfo,
        'weatherBtn': displayWeatherInfo,
        'currencyBtn': displayCurrencyConverter,
        'wikiBtn': displayWikipediaInfo,
        'newsBtn': displayNewsInfo
    };
    
    if (handlers[buttonId]) {
        handlers[buttonId]();
    } else {
        console.error('Unknown button ID:', buttonId);
    }
}

function displayCountryInfo() {
    if (!currentCountryData) {
        alert('Please select a country first.');
        return;
    }

    const content = `
        <div class="country-info-popup">
            <h3>${currentCountryData.name.common}</h3>
            <table>
                <tr><td>Flag:</td><td><img src="${currentCountryData.flags.svg}" alt="Flag" style="width:30px;"></td></tr>
                <tr><td>Region:</td><td>${currentCountryData.region}</td></tr>
                <tr><td>Capital:</td><td>${currentCountryData.capital ? currentCountryData.capital[0] : 'N/A'}</td></tr>
                <tr><td>Population:</td><td>${currentCountryData.population.toLocaleString()}</td></tr>
                <tr><td>Currency:</td><td>${Object.values(currentCountryData.currencies).map(c => `${c.name} (${c.symbol})`).join(', ')}</td></tr>
                <tr><td>Languages:</td><td>${Object.values(currentCountryData.languages).join(', ')}</td></tr>
                <tr><td>Area:</td><td>${currentCountryData.area.toLocaleString()} km²</td></tr>
            </table>
        </div>
    `;

    createCenteredPopup(content);
}

// functions
function populateCountrySelect() {
    $.ajax({
        url: '/api/countries',
        method: 'GET',
        dataType: 'json',
        success: countries => {
            const select = $('#countrySelect');
            select.empty().append($('<option></option>').attr('value', '').text('Select a country'));
            countries.forEach(country => {
                select.append($('<option></option>').attr('value', country.code).text(country.name));
            });
        },
        error: (jqXHR, textStatus, errorThrown) => {
            console.error('Error loading countries:', textStatus, errorThrown);
            alert('Failed to load country list. Please refresh the page and try again.');
        }
    });
}

function createCenteredPopup(content, className = 'centered-popup') {
    L.popup({
        closeButton: true,
        closeOnClick: false,
        autoClose: false,
        className: className
    })
    .setLatLng(map.getCenter())
    .setContent(content)
    .openOn(map);
}

//weather information
function displayWeatherInfo() {
    if (currentCountryData && currentCountryData.capital) {
        const capital = currentCountryData.capital[0];
        $.ajax({
            url: `/api/weather?city=${encodeURIComponent(capital)}`,
            method: 'GET',
            dataType: 'json',
            success: function(data) {
                const currentWeather = data.list[0];
                const content = `
                    <div class="weather-info-popup">
                        <h3>Weather Forecast</h3>
                        <h4>${capital}, ${currentCountryData.name.common}</h4>
                        <div class="current-weather">
                            <img src="https://openweathermap.org/img/wn/${currentWeather.weather[0].icon}@2x.png" alt="Weather icon">
                            <span class="temperature">${Math.round(currentWeather.main.temp)}°C</span>
                            <span class="description">${currentWeather.weather[0].description}</span>
                        </div>
                        <div class="weather-details">
                            <p>Humidity: ${currentWeather.main.humidity}%</p>
                            <p>Wind: ${(currentWeather.wind.speed * 3.6).toFixed(1)} km/h</p>
                        </div>
                        <div class="forecast">
                            ${generateForecast(data.list)}
                        </div>
                    </div>
                `;

                L.popup({
                    closeButton: true,
                    closeOnClick: false,
                    autoClose: false,
                    className: 'centered-popup weather-popup'
                })
                .setLatLng(map.getCenter())
                .setContent(content)
                .openOn(map);
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.error('Error loading weather data:', textStatus, errorThrown);
                alert('Failed to load weather data. Please try again.');
            }
        });
    } else {
        alert('Please select a country first.');
    }
}

function generateForecast(forecastList) {
    const timeSlots = ['Morning', 'Afternoon', 'Evening'];
    let forecastHtml = '<div class="forecast-grid">';
    
    for (let i = 0; i < 3; i++) {
        const forecast = forecastList[i * 8];
        forecastHtml += `
            <div class="forecast-item">
                <h5>${timeSlots[i]}</h5>
                <img src="https://openweathermap.org/img/wn/${forecast.weather[0].icon}.png" alt="Weather icon">
                <p>${Math.round(forecast.main.temp)}°C</p>
                <p>${forecast.weather[0].main}</p>
            </div>
        `;
    }
    
    forecastHtml += '</div>';
    return forecastHtml;
}


//currency converter
function displayCurrencyConverter() {
    if (currentCountryData && currentCountryData.currencies) {
        const currencyCode = Object.keys(currentCountryData.currencies)[0];
        const currencyName = currentCountryData.currencies[currencyCode].name;
        
        const content = `
            <div class="currency-converter">
                <h3>Currency Converter</h3>
                <p>Convert USD to ${currencyName} (${currencyCode})</p>
                <input type="number" id="usdAmount" value="1" min="0.01" step="0.01">
                <p id="result">Loading...</p>
            </div>
        `;
        
        const popup = L.popup()
            .setLatLng(map.getCenter())
            .setContent(content)
            .openOn(map);

        convertCurrency();

        document.getElementById('usdAmount').addEventListener('input', convertCurrency);
    } else {
        alert('Please select a country first.');
    }
}

function convertCurrency() {
    const usdAmount = document.getElementById('usdAmount').value;
    const targetCurrency = Object.keys(currentCountryData.currencies)[0];
    
    fetch(`/api/convert?from=USD&to=${targetCurrency}&amount=${usdAmount}`)
        .then(response => response.json())
        .then(data => {
            if (data.result === "success") {
                const convertedAmount = data.conversion_result.toFixed(2);
                document.getElementById('result').textContent = 
                    `${usdAmount} USD = ${convertedAmount} ${targetCurrency}`;
            } else {
                document.getElementById('result').textContent = 'Please try again.';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('result').textContent = 'An error occurred. Please try again.';
        });
}

// Wikipedia information
function displayWikipediaInfo() {
    if (currentCountryData) {
        const countryName = currentCountryData.name.common;
        
        const loadingContent = `
            <div class="wikipedia-info-popup">
                <h3>Wikipedia: ${countryName}</h3>
                <p>Loading information...</p>
            </div>
        `;
        
        const popup = L.popup({
            closeButton: true,
            closeOnClick: false,
            autoClose: false,
            className: 'centered-popup wikipedia-popup'
        })
        .setLatLng(map.getCenter())
        .setContent(loadingContent)
        .openOn(map);

        fetch(`/api/wikipedia?country=${encodeURIComponent(countryName)}`)
            .then(response => response.json())
            .then(data => {
                const content = `
                    <div class="wikipedia-info-popup">
                        <h3>Wikipedia: ${countryName}</h3>
                        <p>${data.extract}</p>
                        <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(countryName)}" target="_blank">Read more on Wikipedia</a>
                    </div>
                `;
                popup.setContent(content);
            })
            .catch(error => {
                console.error('Error fetching Wikipedia data:', error);
                popup.setContent(`
                    <div class="wikipedia-info-popup">
                        <h3>Wikipedia: ${countryName}</h3>
                        <p>Error loading Wikipedia information. Please try again.</p>
                    </div>
                `);
            });
    } else {
        alert('Please select a country first.');
    }
}

// news information 
function displayNewsInfo() {
    if (currentCountryData) {
        const countryCode = currentCountryData.cca2.toLowerCase();
        const countryName = currentCountryData.name.common;
        
        const loadingContent = `
            <div class="news-info-popup">
                <h3>News: ${countryName}</h3>
                <p>Loading news...</p>
            </div>
        `;
        
        const popup = L.popup({
            closeButton: true,
            closeOnClick: false,
            autoClose: false,
            className: 'centered-popup news-popup',
            maxWidth: 300,
            maxHeight: 400
        })
        .setLatLng(map.getCenter())
        .setContent(loadingContent)
        .openOn(map);

        fetch(`/api/news?country=${countryCode}`)
            .then(response => response.json())
            .then(data => {
                let newsHtml = `
                    <div class="news-info-popup">
                        <h3>News: ${countryName}</h3>
                `;

                if (data.articles && data.articles.length > 0) {
                    data.articles.forEach(article => {
                        newsHtml += `
                            <div class="news-item">
                                <h4>${article.title}</h4>
                                <p>${article.description || ''}</p>
                                <a href="${article.url}" target="_blank">Read more</a>
                            </div>
                        `;
                    });
                } else {
                    newsHtml += '<p>No news articles found for this country.</p>';
                }

                newsHtml += '</div>';
                popup.setContent(newsHtml);
            })
            .catch(error => {
                console.error('Error fetching news data:', error);
                popup.setContent(`
                    <div class="news-info-popup">
                        <h3>News: ${countryName}</h3>
                        <p>Error loading news. Please try again.</p>
                    </div>
                `);
            });
    } else {
        alert('Please select a country first.');
    }
}
