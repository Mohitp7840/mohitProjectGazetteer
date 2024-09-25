<?php
require_once 'config.php';
require_once 'functions.php';

if (isset($_GET['city']) && isset($_GET['country'])) {
    $city = urlencode($_GET['city']);
    $country = urlencode($_GET['country']);
    
    $url = "http://api.weatherapi.com/v1/forecast.json?key=" . OPENWEATHER_API_KEY . "&q=$city,$country&days=3";
    
    $response = makeApiCall($url);
    
    if ($response !== false) {
        $data = json_decode($response, true);
        
        $weatherData = [
            'location' => $data['location']['name'] . ', ' . $data['location']['country'],
            'current' => [
                'temp_c' => $data['current']['temp_c'],
                'feelslike_c' => $data['current']['feelslike_c'],
                'condition' => $data['current']['condition']['text'],
                'icon' => $data['current']['condition']['icon'],
                'last_updated' => $data['current']['last_updated'],
            ],
            'forecast' => [],
        ];
        
        for ($i = 1; $i < 3; $i++) {
            $weatherData['forecast'][] = [
                'date' => date('D, jS M', strtotime($data['forecast']['forecastday'][$i]['date'])),
                'maxtemp_c' => $data['forecast']['forecastday'][$i]['day']['maxtemp_c'],
                'mintemp_c' => $data['forecast']['forecastday'][$i]['day']['mintemp_c'],
                'icon' => $data['forecast']['forecastday'][$i]['day']['condition']['icon'],
            ];
        }
        
        echo json_encode($weatherData);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error fetching weather data']);
    }
} else {
    http_response_code(400);
    echo json_encode(['error' => 'City and country not provided']);
}

?>