<?php

require_once 'php/functions.php';

$countries = getCountryList();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gazetteer</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css">
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet-extra-markers@1.2.1/dist/css/leaflet.extra-markers.min.css" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <link rel="stylesheet" href="public/css/bootstrap.min.css">
    <link rel="stylesheet" href="public/css/easy-button.min.css">
    <link rel="stylesheet" href="public/css/leaflet.css">
    <link rel="stylesheet" href="public/css/style.css">
</head>
<body>

    <div id="selectContainer">
        <select id="countrySelect" class="form-select shadow-sm">
            <?php foreach ($countries as $code => $name): ?>
                <option value="<?php echo $code; ?>"><?php echo $name; ?></option>
            <?php endforeach; ?>
        </select>
    </div>


    <div id="map"></div>

<div id="countryInfoModal" class="modal" data-bs-backdrop="false" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
    <div class="modal-content shadow">
      <div class="modal-header bg-success bg-gradient text-white">
        <h5 class="modal-title" id="countryName">Country Information</h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div class="text-center mb-3">
          <img id="countryFlag" src="" alt="Country Flag" class="img-fluid" style="max-height: 100px;">
        </div>
        <table class="table table-striped">
          <tr>
            <td class="text-center"><i class="fa-solid fa-earth-americas fa-xl text-success"></i></td>
            <td>Region</td>
            <td class="text-end" id="countryRegion"></td>
          </tr>
          <tr>
            <td class="text-center"><i class="fa-solid fa-city fa-xl text-success"></i></td>
            <td>Capital</td>
            <td class="text-end" id="countryCapital"></td>
          </tr>
          <tr>
            <td class="text-center"><i class="fa-solid fa-users fa-xl text-success"></i></td>
            <td>Population</td>
            <td class="text-end" id="countryPopulation"></td>
          </tr>
          <tr>
            <td class="text-center"><i class="fa-solid fa-money-bill-wave fa-xl text-success"></i></td>
            <td>Currency</td>
            <td class="text-end" id="countryCurrency"></td>
          </tr>
          <tr>
            <td class="text-center"><i class="fa-solid fa-language fa-xl text-success"></i></td>
            <td>Languages</td>
            <td class="text-end" id="countryLanguages"></td>
          </tr>
          <tr>
            <td class="text-center"><i class="fa-solid fa-map fa-xl text-success"></i></td>
            <td>Area</td>
            <td class="text-end" id="countryArea"></td>
          </tr>
        </table>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline-success btn-sm" data-bs-dismiss="modal">Close</button>
      </div>
    </div>
  </div>
</div>

<div id="weatherModal" class="modal" data-bs-backdrop="false" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content shadow">
      <div class="modal-header bg-info bg-gradient text-white">
        <h5 class="modal-title">The weather in <span id="weatherCity"></span></h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div class="card mb-3">
          <div class="card-body">
            <h5 class="card-title">TODAY</h5>
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <p id="weatherDescription" class="mb-0"></p>
              </div>
              <div class="text-center">
                <img id="weatherIcon" src="" alt="Weather icon" class="weather-icon">
              </div>
              <div class="text-end">
                <h2 id="tempMax" class="mb-0"></h2>
                <p id="tempMin" class="text-muted mb-0"></p>
              </div>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col-6">
            <div class="card">
              <div class="card-body">
                <h5 id="forecastDay1" class="card-title"></h5>
                <div class="d-flex justify-content-between align-items-center">
                  <div class="text-center">
                    <img id="forecastIcon1" src="" alt="Weather icon" class="weather-icon-sm">
                  </div>
                  <div class="text-end">
                    <h4 id="forecastTempMax1" class="mb-0"></h4>
                    <p id="forecastTempMin1" class="text-muted mb-0"></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-6">
            <div class="card">
              <div class="card-body">
                <h5 id="forecastDay2" class="card-title"></h5>
                <div class="d-flex justify-content-between align-items-center">
                  <div class="text-center">
                    <img id="forecastIcon2" src="" alt="Weather icon" class="weather-icon-sm">
                  </div>
                  <div class="text-end">
                    <h4 id="forecastTempMax2" class="mb-0"></h4>
                    <p id="forecastTempMin2" class="text-muted mb-0"></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p class="text-muted mt-3 mb-0">Last updated <span id="lastUpdated"></span>. Powered by WeatherAPI.com</p>
      </div>
    </div>
  </div>
</div>

<div id="newsModal" class="modal" data-bs-backdrop="false" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable ">
    <div class="modal-content">
      <div class="modal-header bg-primary text-white">
        <h5 class="modal-title">News: <span id="newsCountry"></span></h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div id="newsList" class="news-list"></div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Close</button>
      </div>
    </div>
  </div>
</div>

<div id="wikiModal" class="modal" data-bs-backdrop="false" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
    <div class="modal-content">
      <div class="modal-header bg-info text-white">
        <h5 class="modal-title">About: <span id="wikiCountry"></span></h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div id="wikiContent"></div>
      </div>
      <div class="modal-footer">
        <a id="wikiLink" href="#" target="_blank" class="btn btn-primary btn-sm">Read More on Wikipedia</a>
        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Close</button>
      </div>
    </div>
  </div>
</div>

<div id="currencyModal" class="modal" data-bs-backdrop="false" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable custom-modal-size">
    <div class="modal-content">
      <div class="modal-header bg-success text-white">
        <h5 class="modal-title">Currency Exchange: <span id="currencyCountry"></span></h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div id="currencyInfo"></div>
        <div id="currencyConverter" class="mt-3">
          <div class="input-group mb-3">
            <input type="number" class="form-control" id="baseAmount" value="1" min="0" step="0.01">
            <select class="form-select" id="baseCurrencySelect">
              <option value="USD" selected>USD</option>
            </select>
          </div>
          <div id="conversionResult" class="mb-3"></div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Close</button>
      </div>
    </div>
  </div>
</div>

    <script src="https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/leaflet.js"></script>
    <script src="public/js/jquery.min.js"></script>
    <script src="public/js/bootstrap.min.js"></script>
    <script src="https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/leaflet-extra-markers@1.2.1/dist/js/leaflet.extra-markers.min.js"></script>
    <script src="public/js/easy-button.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/toastify-js"></script>
    <script src="public/js/app.js"></script>
</body>
</html>


