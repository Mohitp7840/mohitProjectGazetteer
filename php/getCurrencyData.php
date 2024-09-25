<?php
require_once 'config.php';
require_once 'functions.php';

header('Content-Type: application/json');

if (isset($_GET['country'])) {
    $countryCode = $_GET['country'];
    
    $countryUrl = "https://restcountries.com/v3.1/alpha/{$countryCode}?fields=currencies";
    $countryResponse = makeApiCall($countryUrl);
    
    if ($countryResponse !== false) {
        $countryData = json_decode($countryResponse, true);
        if (isset($countryData['currencies'])) {
            $currencyCode = array_keys($countryData['currencies'])[0];
            $currencyName = $countryData['currencies'][$currencyCode]['name'];
            $currencySymbol = $countryData['currencies'][$currencyCode]['symbol'] ?? '';

            $exchangeUrl = "https://v6.exchangerate-api.com/v6/" . EXCHANGE_RATE_API_KEY . "/latest/USD";
            $exchangeResponse = makeApiCall($exchangeUrl);

            if ($exchangeResponse !== false) {
                $exchangeData = json_decode($exchangeResponse, true);
                if (isset($exchangeData['conversion_rates'])) {
                    echo json_encode([
                        'currency' => [
                            'code' => $currencyCode,
                            'name' => $currencyName,
                            'symbol' => $currencySymbol
                        ],
                        'rates' => $exchangeData['conversion_rates']
                    ]);
                } else {
                    http_response_code(404);
                    echo json_encode(['error' => 'No exchange rates found']);
                }
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Error fetching exchange rates']);
            }
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'No currency information found for this country']);
        }
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error fetching country data']);
    }
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Country code not provided']);
}