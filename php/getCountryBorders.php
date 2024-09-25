<?php
require_once 'functions.php';

if (isset($_GET['country'])) {
    $countryCode = $_GET['country'];
    $borders = getCountryBorders($countryCode);
    
    if ($borders) {
        header('Content-Type: application/json');
        echo json_encode($borders);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Country borders not found']);
    }
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Country code not provided']);
}

?>