<?php
require_once 'config.php';
header('Content-Type: application/json');

$countryCode = $_POST['iso'] ?? '';

if (empty($countryCode)) {
    echo json_encode(['status' => ['code' => 400, 'message' => 'Country code is required']]);
    exit;
}

$geonamesUsername = GEONAMES_USERNAME;
$url = "http://api.geonames.org/searchJSON?country={$countryCode}&featureClass=P&maxRows=1000&username={$geonamesUsername}";

error_log("Fetching cities from URL: " . $url);

$response = file_get_contents($url);
if ($response === false) {
    error_log("Failed to fetch data from GeoNames API");
    echo json_encode(['status' => ['code' => 500, 'message' => 'Failed to fetch data from GeoNames API']]);
    exit;
}

$data = json_decode($response, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    error_log("Failed to parse JSON response: " . json_last_error_msg());
    echo json_encode(['status' => ['code' => 500, 'message' => 'Failed to parse API response']]);
    exit;
}

$cities = [];
if (isset($data['geonames'])) {
    foreach ($data['geonames'] as $city) {
        $cities[] = [
            'name' => $city['name'],
            'lat' => $city['lat'],
            'lng' => $city['lng'],
            'population' => $city['population'] ?? 0
        ];
    }
}

error_log("Found " . count($cities) . " cities for country code: " . $countryCode);

echo json_encode([
    'status' => ['code' => 200, 'message' => 'Success'],
    'data' => $cities
]);