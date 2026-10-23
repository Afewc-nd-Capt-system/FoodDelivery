function New-DevSecret {
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $bytes = New-Object byte[] 48
  $rng.GetBytes($bytes)
  return [Convert]::ToBase64String($bytes)
}

$env:NODE_ENV = "development"
$env:PORT = 5000
$env:MONGODB_URI = "mongodb://localhost:27017/food-delivery"
if (-not $env:JWT_SECRET) { $env:JWT_SECRET = New-DevSecret }
if (-not $env:JWT_REFRESH_SECRET) { $env:JWT_REFRESH_SECRET = New-DevSecret }
$env:FRONTEND_URL = "http://localhost:3000"
$env:DISABLE_RATE_LIMIT = "true"

node src/server.js