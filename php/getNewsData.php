<?php
require_once 'config.php';
require_once 'functions.php';

header('Content-Type: application/json');

if (isset($_GET['country'])) {
    $country = strtolower($_GET['country']);
    
    // MediaStack API URL
    $url = "http://api.mediastack.com/v1/news?access_key=" . MEDIASTACK_API_KEY . "&countries={$country}&limit=5&languages=en";
    
    $response = makeApiCall($url);
    
    if ($response !== false) {
        $data = json_decode($response, true);
        
        if (isset($data['data']) && !empty($data['data'])) {
            $newsData = array_map(function($article) {
                return [
                    'title' => $article['title'],
                    'description' => $article['description'],
                    'url' => $article['url'],
                    'publishedAt' => $article['published_at']
                ];
            }, $data['data']);
            
            echo json_encode(['news' => $newsData]);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'No news found']);
        }
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error fetching news data']);
    }
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Country not provided']);
}

?>