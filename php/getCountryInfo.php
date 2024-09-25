<?php
require_once 'config.php';
require_once 'functions.php';

error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');

if (isset($_GET['country'])) {
    $countryCode = trim($_GET['country']);
    
    if (!preg_match('/^[A-Z]{2}$/', $countryCode)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid country code']);
        exit;
    }
    
    $url = "https://restcountries.com/v3.1/alpha/{$countryCode}?fields=name,capital,population,currencies,languages,flags,region,area,cca2";
    
    $response = makeApiCall($url);
    
    if ($response !== false) {
        $data = json_decode($response, true);
        
        if (isset($data['name'])) {
            $countryInfo = [
                'name' => $data['name']['common'],
                'code' => $data['cca2'],
                'flag' => $data['flags']['png'],
                'region' => $data['region'],
                'capital' => isset($data['capital'][0]) ? $data['capital'][0] : 'N/A',
                'population' => $data['population'],
                'currency' => isset($data['currencies']) ? array_values($data['currencies'])[0]['name'] : 'N/A',
                'languages' => isset($data['languages']) ? implode(', ', $data['languages']) : 'N/A',
                'area' => $data['area']
            ];
            
            echo json_encode($countryInfo);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Country not found']);
        }
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error fetching country information']);
    }
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Country code not provided']);
}

?>