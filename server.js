const express = require('express');
const axios = require('axios');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

// API endpoints
app.get('/api/countries', getCountries);
app.get('/api/weather', getWeather);
app.get('/api/convert', convertCurrency);
app.get('/api/wikipedia', getWikipediaInfo);
app.get('/api/news', getNews);
app.get('/api/geocode', reverseGeocode);
app.get('/api/country-boundary/:code', getCountryBoundary);
app.get('/api/airports/:countryCode', getAirports);
app.get('/api/cities/:countryCode', getCities);


// Route handlers
async function getCountries(req, res) {
    try {
        const response = await axios.get('https://restcountries.com/v3.1/all?fields=name,cca2');
        const countries = response.data
            .map(country => ({
                name: country.name.common,
                code: country.cca2
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
        res.json(countries);
    } catch (error) {
        handleError(error, res, 'Failed to fetch countries');
    }
}

async function getWeather(req, res) {
    const { city } = req.query;
    if (!city) {
        return res.status(400).json({ error: 'City parameter is required' });
    }

    try {
        const response = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
            params: {
                q: city,
                appid: process.env.OPENWEATHER_API_KEY,
                units: 'metric'
            }
        });
        res.json(response.data);
    } catch (error) {
        handleError(error, res, 'Failed to fetch weather data');
    }
}

async function convertCurrency(req, res) {
    const { from, to, amount } = req.query;
    try {
        const response = await axios.get(`https://v6.exchangerate-api.com/v6/${process.env.EXCHANGERATE_API_KEY}/pair/${from}/${to}/${amount}`);
        res.json(response.data);
    } catch (error) {
        handleError(error, res, 'Failed to fetch exchange rate');
    }
}

async function getWikipediaInfo(req, res) {
    const { country } = req.query;
    if (!country) {
        return res.status(400).json({ error: 'Country parameter is required' });
    }

    try {
        const response = await axios.get('https://en.wikipedia.org/w/api.php', {
            params: {
                action: 'query',
                format: 'json',
                prop: 'extracts',
                exintro: true,
                explaintext: true,
                titles: country
            }
        });

        const pages = response.data.query.pages;
        const pageId = Object.keys(pages)[0];
        const extract = pages[pageId].extract;

        res.json({ extract });
    } catch (error) {
        handleError(error, res, 'Failed to fetch Wikipedia data');
    }
}

async function getNews(req, res) {
    const { country } = req.query;
    if (!country) {
        return res.status(400).json({ error: 'Country parameter is required' });
    }

    try {
        const response = await axios.get('https://newsapi.org/v2/top-headlines', {
            params: {
                country: country,
                apiKey: process.env.NEWS_API_KEY,
                pageSize: 5
            }
        });
        res.json(response.data);
    } catch (error) {
        handleError(error, res, 'Failed to fetch news data');
    }
}

async function reverseGeocode(req, res) {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    try {
        const response = await axios.get(`https://api.opencagedata.com/geocode/v1/json`, {
            params: {
                q: `${lat}+${lon}`,
                key: process.env.OPENCAGE_API_KEY,
                no_annotations: 1
            }
        });

        if (response.data.results && response.data.results.length > 0) {
            const result = response.data.results[0];
            res.json({
                country: result.components.country,
                countryCode: result.components.country_code.toUpperCase()
            });
        } else {
            res.status(404).json({ error: 'Location not found' });
        }
    } catch (error) {
        handleError(error, res, 'Failed to perform reverse geocoding');
    }
}

async function getCountryBoundary(req, res) {
    const { code } = req.params;
    try {
        const response = await axios.get(`https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson`);
        const allCountries = response.data;
        const country = allCountries.features.find(feature => feature.properties.ISO_A2 === code.toUpperCase());
        
        if (country) {
            res.json(country);
        } else {
            res.status(404).json({ error: 'Country not found' });
        }
    } catch (error) {
        handleError(error, res, 'Failed to fetch country boundaries');
    }
}

// Error handling middleware
function handleError(error, res, message) {
    console.error(`${message}:`, error);
    res.status(500).json({ error: message });
}

async function getAirports(req, res) {
    const { countryCode } = req.params;
    
    try {
        const countryResponse = await axios.get(`https://restcountries.com/v3.1/alpha/${countryCode}`);
        const countryName = countryResponse.data[0].name.common;
        
        console.log(`Searching for airports in ${countryName} (${countryCode})`);

        const airports = [];
        const filePath = path.join(__dirname, 'data', 'airports.dat');

        if (!fs.existsSync(filePath)) {
            console.error('airports.dat file not found');
            return res.status(500).json({ error: 'Airport data not available' });
        }

        fs.createReadStream(filePath)
            .pipe(csv(['id', 'name', 'city', 'country', 'iata', 'icao', 'latitude', 'longitude', 'altitude', 'timezone', 'dst', 'tz', 'type', 'source']))
            .on('data', (row) => {
                if (row.country.toLowerCase() === countryName.toLowerCase()) {
                    airports.push({
                        type: 'Feature',
                        properties: {
                            name: row.name,
                            city: row.city,
                            iata: row.iata,
                            icao: row.icao,
                            type: row.type
                        },
                        geometry: {
                            type: 'Point',
                            coordinates: [parseFloat(row.longitude), parseFloat(row.latitude)]
                        }
                    });
                }
            })
            .on('end', () => {
                console.log(`Found ${airports.length} airports for ${countryName}`);
                res.json({
                    type: 'FeatureCollection',
                    features: airports
                });
            });
    } catch (error) {
        console.error('Error in getAirports:', error);
        res.status(500).json({ error: 'Failed to fetch airport data' });
    }
}

async function getCities(req, res) {
    const { countryCode } = req.params;
    
    try {
        const countryResponse = await axios.get(`https://restcountries.com/v3.1/alpha/${countryCode}`);
        const countryName = countryResponse.data[0].name.common;
        
        console.log(`Searching for cities in ${countryName} (${countryCode})`);

        const cities = [];
        const filePath = path.join(__dirname, 'data', 'worldcities.csv');

        if (!fs.existsSync(filePath)) {
            console.error('worldcities.csv file not found');
            return res.status(500).json({ error: 'City data file not found.' });
        }

        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                    if (row.country.toLowerCase() === countryName.toLowerCase()) {
                        cities.push({
                            type: 'Feature',
                            properties: {
                                name: row.city,
                                population: parseInt(row.population) || 0,
                                capital: row.capital === 'primary'
                            },
                            geometry: {
                                type: 'Point',
                                coordinates: [parseFloat(row.lng), parseFloat(row.lat)]
                            }
                        });
                    }
                })
                .on('end', () => {
                    console.log(`Found ${cities.length} cities for ${countryName}`);
                    resolve();
                })
                .on('error', (error) => {
                    console.error('Error reading CSV file:', error);
                    reject(error);
                });
        });

        res.json({
            type: 'FeatureCollection',
            features: cities
        });
    } catch (error) {
        console.error('Error in getCities:', error);
        res.status(500).json({ error: 'Failed to fetch city data: ' + error.message });
    }
}

// server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});