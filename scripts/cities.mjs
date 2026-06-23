// City catalogue for the climate-comparison build step.
// Coordinates are city-centre; timezone is the IANA zone used for local daily aggregation.
export const CITIES = [
  { id: 'sydney',      name: 'Sydney',      country: 'Australia',      lat: -33.8688, lon: 151.2093, timezone: 'Australia/Sydney' },
  { id: 'london',      name: 'London',      country: 'United Kingdom', lat:  51.5074, lon:  -0.1278, timezone: 'Europe/London' },
  { id: 'new-york',    name: 'New York',    country: 'United States',  lat:  40.7128, lon: -74.0060, timezone: 'America/New_York' },
  { id: 'tokyo',       name: 'Tokyo',       country: 'Japan',          lat:  35.6762, lon: 139.6503, timezone: 'Asia/Tokyo' },
  { id: 'singapore',   name: 'Singapore',   country: 'Singapore',      lat:   1.3521, lon: 103.8198, timezone: 'Asia/Singapore' },
  { id: 'dubai',       name: 'Dubai',       country: 'UAE',            lat:  25.2048, lon:  55.2708, timezone: 'Asia/Dubai' },
  { id: 'reykjavik',   name: 'Reykjavik',   country: 'Iceland',        lat:  64.1466, lon: -21.9426, timezone: 'Atlantic/Reykjavik' },
  { id: 'cape-town',   name: 'Cape Town',   country: 'South Africa',   lat: -33.9249, lon:  18.4241, timezone: 'Africa/Johannesburg' },
  { id: 'los-angeles', name: 'Los Angeles', country: 'United States',  lat:  34.0522, lon: -118.2437, timezone: 'America/Los_Angeles' },
  { id: 'moscow',      name: 'Moscow',      country: 'Russia',         lat:  55.7558, lon:  37.6173, timezone: 'Europe/Moscow' },
  { id: 'krakow',      name: 'Kraków',      country: 'Poland',         lat:  50.0647, lon:  19.9450, timezone: 'Europe/Warsaw' },
]
