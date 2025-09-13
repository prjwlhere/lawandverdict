import http.client

conn = http.client.HTTPSConnection("dev-8whvepj1827d3ilh.us.auth0.com")

payload = "{\"client_id\":\"HA92iJwWRZz5dAYKOuXY6mG8RdtBjFCE\",\"client_secret\":\"kTak6a9z0-oVRX6WTb16rSywRK3hanQWwljMpKAk0Q6eq2zfH3hSVl1vMDPcpqUu\",\"audience\":\"https://fastapi-backend\",\"grant_type\":\"client_credentials\"}"

headers = { 'content-type': "application/json" }

conn.request("POST", "/oauth/token", payload, headers)

res = conn.getresponse()
data = res.read()

print(data.decode("utf-8"))