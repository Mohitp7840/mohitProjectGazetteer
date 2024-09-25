<?php
require_once 'config.php';
require_once 'functions.php';

if (isset($_GET['lat']) && isset($_GET['lon'])) {
    $lat = $_GET['lat'];
    $lon = $_GET['lon'];
    
    $url = "http://api.geonames.org/countryCodeJSON?lat=$lat&lng=$lon&username=" . GEONAMES_USERNAME;
    
    $response = file_get_contents($url);
    
    if ($response !== false) {
        $data = json_decode($response, true);
        if (isset($data['countryCode'])) {
            echo json_encode(['countryCode' => $data['countryCode']]);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Country not found']);
        }
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error contacting Geonames API']);
    }
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Latitude and longitude not provided']);
}

?>