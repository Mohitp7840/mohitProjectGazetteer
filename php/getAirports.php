<?php
require_once 'config.php';
header('Content-Type: application/json');

$countryCode = $_POST['iso'] ?? '';

if (empty($countryCode)) {
    echo json_encode(['status' => ['code' => 400, 'message' => 'Country code is required']]);
    exit;
}

$geonamesUsername = GEONAMES_USERNAME;
$url = "http://api.geonames.org/searchJSON?country={$countryCode}&featureClass=S&featureCode=AIRP&maxRows=1000&username={$geonamesUsername}";

$response = file_get_contents($url);
if ($response === false) {
    echo json_encode(['status' => ['code' => 500, 'message' => 'Failed to fetch data from GeoNames API']]);
    exit;
}

$data = json_decode($response, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode(['status' => ['code' => 500, 'message' => 'Failed to parse API response']]);
    exit;
}

$airports = [];
if (isset($data['geonames'])) {
    foreach ($data['geonames'] as $airport) {
        $airports[] = [
            'name' => $airport['name'],
            'lat' => $airport['lat'],
            'lng' => $airport['lng']
        ];
    }
}

echo json_encode([
    'status' => ['code' => 200, 'message' => 'Success'],
    'data' => $airports
]);