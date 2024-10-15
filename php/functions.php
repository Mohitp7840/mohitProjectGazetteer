<?php
require_once 'config.php';

function getCountryBorders($countryCode) {
    $filePath = dirname(__FILE__) . '/../data/countryBorders.geo.json';
    if (!file_exists($filePath)) {
        error_log("countryBorders.geo.json file not found at: " . $filePath);
        return null;
    }
    $countryData = json_decode(file_get_contents($filePath), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("Error decoding JSON: " . json_last_error_msg());
        return null;
    }
    foreach ($countryData['features'] as $feature) {
        if ($feature['properties']['iso_a2'] === $countryCode) {
            return $feature;
        }
    }
    return null;
}

function makeApiCall($url) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $response = curl_exec($ch);
    
    if(curl_errno($ch)) {
        error_log('Curl error: ' . curl_error($ch) . ' for URL: ' . $url);
        curl_close($ch);
        return false;
    }
    
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($httpCode != 200) {
        error_log("API call failed with HTTP code $httpCode. URL: $url");
        error_log("API Response: $response");
        curl_close($ch);
        return false;
    }
    
    curl_close($ch);
    
    if (empty($response)) {
        error_log("Empty response received from API. URL: $url");
        return false;
    }
    
    return $response;
}

?>