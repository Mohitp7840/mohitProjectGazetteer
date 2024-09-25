<?php
require_once 'config.php';
require_once 'functions.php';

header('Content-Type: application/json');

if (isset($_GET['country'])) {
    $country = urlencode($_GET['country']);
    
    $url = "https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=1&explaintext=1&titles={$country}";
    
    $response = makeApiCall($url);
    
    if ($response !== false) {
        $data = json_decode($response, true);
        
        if (isset($data['query']['pages'])) {
            $page = reset($data['query']['pages']);
            if (isset($page['extract'])) {
                echo json_encode(['extract' => $page['extract']]);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'No Wikipedia extract found']);
            }
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'No Wikipedia data found']);
        }
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error fetching Wikipedia data']);
    }
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Country not provided']);
}