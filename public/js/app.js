// ---------------------------------------------------------
// GLOBAL DECLARATIONS
// ---------------------------------------------------------
let map;
let countryBorder;
let userCountry;
let countryInfo;
let weatherData;
let newsData;
let currencyData;

// tile layers
const streets = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
  {
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012",
  }
);

const satellite = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
  }
);

const basemaps = {
  Streets: streets,
  Satellite: satellite,
};

// overlays
var airports = L.markerClusterGroup({
  polygonOptions: {
    fillColor: "#fff",
    color: "#000",
    weight: 2,
    opacity: 1,
    fillOpacity: 0.5,
  },
});

var cities = L.markerClusterGroup({
  polygonOptions: {
    fillColor: "#fff",
    color: "#000",
    weight: 2,
    opacity: 1,
    fillOpacity: 0.5,
  },
});

var overlays = {
  Airports: airports,
  Cities: cities,
};

// icons
var airportIcon = L.ExtraMarkers.icon({
  prefix: "fa",
  icon: "fa-plane",
  iconColor: "black",
  markerColor: "white",
  shape: "square",
});

var cityIcon = L.ExtraMarkers.icon({
  icon: "fa-city",
  markerColor: "green",
  shape: "square",
  prefix: "fa",
});

// buttons
const infoBtn = L.easyButton("fa-info fa-xl", function (btn, map) {
  if (countryInfo) {
    populateCountryInfoModal(countryInfo);
    $("#countryInfoModal").modal("show");
  } else {
    alert("Please select a country first.");
  }
});

const weatherBtn = L.easyButton("fa-cloud fa-xl", function (btn, map) {
  if (weatherData) {
    populateWeatherModal(weatherData);
    $("#weatherModal").modal("show");
  } else {
    alert("Please select a country first.");
  }
});

var newsBtn = L.easyButton("fa-newspaper fa-xl", function (btn, map) {
  if (countryInfo && newsData) {
    populateNewsModal(newsData, countryInfo.name);
    $("#newsModal").modal("show");
  } else {
    alert("Please select a country first.");
  }
});

var wikiBtn = L.easyButton("fa-wikipedia-w fa-xl", function (btn, map) {
  if (countryInfo) {
    fetchWikiData(countryInfo.name);
  } else {
    alert("Please select a country first.");
  }
});

var currencyBtn = L.easyButton("fa-money-bill-wave fa-xl", function (btn, map) {
  if (countryInfo) {
    fetchCurrencyData(countryInfo.code);
  } else {
    alert("Please select a country first.");
  }
});

// ---------------------------------------------------------
// EVENT HANDLERS
// ---------------------------------------------------------

// initialise and add controls once DOM is ready

$(document).ready(function () {
  map = L.map("map", {
    layers: [streets],
  }).setView([0, 0], 2);

  layerControl = L.control.layers(basemaps, overlays).addTo(map);

  infoBtn.addTo(map);
  weatherBtn.addTo(map);
  newsBtn.addTo(map);
  wikiBtn.addTo(map);
  currencyBtn.addTo(map);

  airports.addTo(map);
  cities.addTo(map);

  // Get user's location
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      function (position) {
        var lat = position.coords.latitude;
        var lon = position.coords.longitude;
        reverseGeocode(lat, lon);
      },
      function (error) {
        console.error("Error getting location: ", error);
        map.setView([0, 0], 2);
      }
    );
  } else {
    console.log("Geolocation is not available");
    map.setView([0, 0], 2);
  }

  $("#countrySelect").on("change", function () {
    var selectedCountry = $(this).val();
    if (selectedCountry) {
      fetchCountryBorders(selectedCountry);
    }
  });
});

// ---------------------------------------------------------
// FUNCTIONS
// ---------------------------------------------------------

function fetchCountryBorders(countryCode) {
  $.ajax({
    url: "php/getCountryBorders.php",
    type: "GET",
    dataType: "json",
    data: { country: countryCode },
    success: function (data) {
      displayCountryBorders(data);
      fetchCountryInfo(countryCode);
      fetchWeatherData(data.capital, data.name);
      getAirports(countryCode);
      getCities(countryCode);
    },
    error: function (jqXHR, textStatus, errorThrown) {
      console.error( "Error fetching country borders: ", textStatus, errorThrown );
    },
  });
}

function displayCountryBorders(geoJsonData) {
  if (countryBorder) {
    map.removeLayer(countryBorder);
  }
  countryBorder = L.geoJSON(geoJsonData, {
    style: {
      color: "#ff7800",
      weight: 2,
      opacity: 0.65,
    },
  }).addTo(map);
  map.fitBounds(countryBorder.getBounds());
}

function reverseGeocode(lat, lon) {
  $.ajax({
    url: "php/reverseGeocode.php",
    type: "GET",
    dataType: "json",
    data: { lat: lat, lon: lon },
    success: function (data) {
      if (data && data.countryCode) {
        userCountry = data.countryCode;
        $("#countrySelect").val(userCountry).trigger("change");
        fetchCountryInfo(userCountry);
      } else {
        console.error("Couldn't determine user's country");
      }
    },
  });
}

function fetchCountryInfo(countryCode) {
  $.ajax({
    url: "php/getCountryInfo.php",
    type: "GET",
    dataType: "json",
    data: { country: countryCode },
    success: function (data) {
      countryInfo = data;
      if (data.capital && data.name && data.code) {
        fetchWeatherData(data.capital, data.name);
        fetchNewsData(data.code);
      } else {
        console.error("Required country info is missing");
      }
    },
    error: function (jqXHR, textStatus, errorThrown) {
      console.error("Error fetching country info: ", textStatus, errorThrown);
    },
  });
}

function populateCountryInfoModal(info) {
  $("#countryName").text(info.name);
  $("#countryFlag").attr("src", info.flag);
  $("#countryRegion").text(info.region);
  $("#countryCapital").text(info.capital);
  $("#countryPopulation").text(info.population.toLocaleString());
  $("#countryCurrency").text(info.currency);
  $("#countryLanguages").text(info.languages);
  $("#countryArea").text(info.area.toLocaleString() + " km²");
}

function fetchWeatherData(city, country) {
  $.ajax({
    url: "php/getWeatherData.php",
    type: "GET",
    dataType: "json",
    data: { city: city, country: country },
    success: function (data) {
      weatherData = data;
    },
    error: function (jqXHR, textStatus, errorThrown) {
      console.error("Error fetching weather data: ", textStatus, errorThrown);
    },
  });
}

function populateWeatherModal(data) {
  $("#weatherCity").text(data.location);
  $("#weatherDescription").text(data.current.condition);
  $("#weatherIcon").attr("src", data.current.icon);
  $("#tempMax").text(data.current.temp_c + "°C");
  $("#tempMin").text(data.current.feelslike_c + "°C");
  for (let i = 1; i <= 2; i++) {
    $(`#forecastDay${i}`).text(data.forecast[i - 1].date);
    $(`#forecastIcon${i}`).attr("src", data.forecast[i - 1].icon);
    $(`#forecastTempMax${i}`).text(data.forecast[i - 1].maxtemp_c + "°C");
    $(`#forecastTempMin${i}`).text(data.forecast[i - 1].mintemp_c + "°C");
  }
  $("#lastUpdated").text(data.current.last_updated);
}

function fetchNewsData(countryCode) {
  $.ajax({
    url: "php/getNewsData.php",
    type: "GET",
    dataType: "json",
    data: { country: countryCode },
    success: function (data) {
      if (data.news && data.news.length > 0) {
        newsData = data.news;
        populateNewsModal(newsData, countryInfo.name);
      } else {
        $("#newsList").html("<p>No news available for this country.</p>");
      }
    },
    error: function (jqXHR, textStatus, errorThrown) {
      console.error("Error fetching news data:", textStatus, errorThrown);
      console.log("Response:", jqXHR.responseText);
      $("#newsList").html(
        "<p>Error fetching news. Please try again later.</p>"
      );
    },
  });
}

function populateNewsModal(news, countryName) {
  $("#newsCountry").text(countryName);
  let newsHtml = "";
  if (news && news.length > 0) {
    news.forEach((article) => {
      newsHtml += `
        <div class="card mb-3">
          <div class="card-body">
            <h5 class="card-title">${article.title}</h5>
            <p class="card-text">${
              article.description || "No description available."
            }</p>
            <div class="d-flex justify-content-between align-items-center">
              <a href="${
                article.url
              }" target="_blank" class="btn btn-primary btn-sm">Read More</a>
              <small class="text-muted">Published on ${new Date(
                article.publishedAt
              ).toLocaleDateString()}</small>
            </div>
          </div>
        </div>
      `;
    });
  } else {
    newsHtml =
      '<div class="alert alert-info">No news available for this country at the moment.</div>';
  }
  $("#newsList").html(newsHtml);
}

function fetchWikiData(countryName) {
  $.ajax({
    url: "php/getWikiData.php",
    type: "GET",
    dataType: "json",
    data: { country: countryName },
    success: function (data) {
      if (data.extract) {
        populateWikiModal(data, countryName);
        var wikiModal = new bootstrap.Modal(
          document.getElementById("wikiModal")
        );
        wikiModal.show();
      } else {
        alert("No Wikipedia information found for this country.");
      }
    },
  });
}

function populateWikiModal(data, countryName) {
  $("#wikiCountry").text(countryName);
  $("#wikiContent").html(data.extract);
  $("#wikiLink").attr(
    "href",
    `https://en.wikipedia.org/wiki/${encodeURIComponent(countryName)}`
  );
}

function fetchCurrencyData(countryCode) {
  $.ajax({
    url: "php/getCurrencyData.php",
    type: "GET",
    dataType: "json",
    data: { country: countryCode },
    success: function (data) {
      if (data.currency) {
        populateCurrencyModal(data, countryInfo.name);
        var currencyModal = new bootstrap.Modal(
          document.getElementById("currencyModal")
        );
        currencyModal.show();
      } else {
        alert("No currency information found for this country.");
      }
    },
  });
}

function populateCurrencyModal(data, countryName) {
  currencyData = data;
  $("#currencyCountry").text(countryName);
  let infoHtml = `
    <p><strong>Currency:</strong> ${data.currency.name} (${data.currency.code})</p>
    <p><strong>Symbol:</strong> ${data.currency.symbol}</p>
  `;
  $("#currencyInfo").html(infoHtml);

  $("#baseAmount").val(1);

  let selectHtml = "";
  for (let [code, rate] of Object.entries(data.rates)) {
    selectHtml += `<option value="${code}">${code}</option>`;
  }
  $("#baseCurrencySelect").html(selectHtml);

  $("#baseCurrencySelect").val("USD");

  $("#baseAmount").on("input", updateConversion);
  $("#baseCurrencySelect").on("change", updateConversion);

  updateConversion();
}

function updateConversion() {
  const baseAmount = parseFloat($("#baseAmount").val());
  const baseCurrency = $("#baseCurrencySelect").val();
  const targetCurrency = currencyData.currency.code;

  if (!isNaN(baseAmount)) {
    const baseToUsd =
      baseCurrency === "USD" ? 1 : 1 / currencyData.rates[baseCurrency];
    const usdToTarget = currencyData.rates[targetCurrency];
    const convertedAmount = baseAmount * baseToUsd * usdToTarget;

    $("#conversionResult").html(`
      ${baseAmount} ${baseCurrency} = 
      ${convertedAmount.toFixed(2)} ${targetCurrency} 
      (${currencyData.currency.name})
    `);
  } else {
    $("#conversionResult").html("Please enter a valid amount");
  }
}

function getAirports(countryCode) {
  $.ajax({
    url: "php/getAirports.php",
    type: "POST",
    dataType: "json",
    data: {
      iso: countryCode,
    },
    success: function (result) {
      if (result.status.code == 200) {
        airports.clearLayers();
        result.data.forEach(function (item) {
          L.marker([item.lat, item.lng], { icon: airportIcon })
            .bindTooltip(item.name, { direction: "top", sticky: true })
            .addTo(airports);
        });
      } else {
        showToast("Error retrieving airport data", 4000, false);
      }
    },
  });
}

const formatNumber = (num) => new Intl.NumberFormat().format(num);

function getCities(countryCode) {
  $.ajax({
    url: "php/getCities.php",
    type: "POST",
    dataType: "json",
    data: {
      iso: countryCode,
    },
    success: function (result) {
      if (result.status.code == 200) {
        cities.clearLayers();
        result.data.forEach(function (item) {
          var marker = L.marker([item.lat, item.lng], {
            icon: cityIcon,
          }).bindTooltip(
            "<div class='col text-center'><strong>" +
              item.name +
              "</strong><br><i>(" +
              formatNumber(item.population) +
              ")</i></div>",
            { direction: "top", sticky: true }
          );
          cities.addLayer(marker);
        });
      } else {
        showToast("Error retrieving city data", 4000, false);
      }
    },
  });
}