import { useState, useEffect } from 'react'
import './App.css'

const WMO_CODES = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Icy fog',
  51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
  61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
  71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
  80: 'Slight showers', 81: 'Moderate showers', 82: 'Violent showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail',
}

export default function App() {
  const [countries, setCountries] = useState([])
  const [selected, setSelected] = useState('')
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('https://restcountries.com/v3.1/all?fields=name,capital,flags,cca2')
      .then(r => r.json())
      .then(data => {
        const sorted = data
          .filter(c => c.capital?.length > 0)
          .sort((a, b) => a.name.common.localeCompare(b.name.common))
        setCountries(sorted)
      })
  }, [])

  const handleSelect = async (e) => {
    const cca2 = e.target.value
    setSelected(cca2)
    setWeather(null)
    setError(null)
    if (!cca2) return

    const country = countries.find(c => c.cca2 === cca2)
    if (!country) return

    setLoading(true)
    try {
      const capital = country.capital[0]
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(capital)}&count=1&language=en&format=json`
      )
      const geoData = await geoRes.json()
      if (!geoData.results?.length) throw new Error('Location not found')

      const { latitude, longitude } = geoData.results[0]
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`
      )
      const weatherData = await weatherRes.json()

      setWeather({ country, capital, ...weatherData.current })
    } catch {
      setError('Could not fetch weather. Please try another country.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <h1>Weather by Country</h1>

      <select value={selected} onChange={handleSelect}>
        <option value="">Select a country...</option>
        {countries.map(c => (
          <option key={c.cca2} value={c.cca2}>{c.name.common}</option>
        ))}
      </select>

      {loading && <p className="status">Loading...</p>}
      {error && <p className="status error">{error}</p>}

      {weather && (
        <div className="card">
          <img src={weather.country.flags.svg} alt={`${weather.country.name.common} flag`} className="flag" />
          <h2>{weather.country.name.common}</h2>
          <p className="capital">{weather.capital}</p>
          <div className="stats">
            <div className="stat">
              <span className="value">{weather.temperature_2m}°C</span>
              <span className="label">Temperature</span>
            </div>
            <div className="stat">
              <span className="value">{weather.relative_humidity_2m}%</span>
              <span className="label">Humidity</span>
            </div>
            <div className="stat">
              <span className="value">{weather.wind_speed_10m} km/h</span>
              <span className="label">Wind</span>
            </div>
          </div>
          <p className="condition">{WMO_CODES[weather.weather_code] ?? 'Unknown'}</p>
        </div>
      )}
    </div>
  )
}
