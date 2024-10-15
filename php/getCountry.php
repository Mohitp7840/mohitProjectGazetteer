<?php
$codes_json = file_get_contents("../data/countryBorders.geo.json");
$decoded = json_decode($codes_json);
$features = $decoded->features;
$countries = [];

foreach ($features as $feature) {
    $name = $feature->properties->name;
    $iso_a2 = $feature->properties->iso_a2;
    $countries[] = [$name, $iso_a2];
}

usort($countries, function($a, $b) {
    return strcasecmp($a[0], $b[0]);
});

header('Content-Type: application/json; charset=UTF-8');
echo json_encode($countries);

?>