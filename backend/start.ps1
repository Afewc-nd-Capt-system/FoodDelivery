$env:NODE_ENV = "development"
$env:PORT = 5000
$env:MONGODB_URI = "mongodb://localhost:27017/food-delivery"
$env:JWT_SECRET = "dev-secret-key-minimum-32-characters-long"
$env:JWT_REFRESH_SECRET = "dev-refresh-secret-key-minimum-32-characters"
$env:FRONTEND_URL = "http://localhost:3000"
$env:DISABLE_RATE_LIMIT = "true"

node src/server.js