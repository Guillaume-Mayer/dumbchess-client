import http.client, urllib.parse

# Define the parameters for the POST request and encode them in
# a URL-safe format.
params = urllib.parse.urlencode([
    ('code_url', 'https://raw.githubusercontent.com/Guillaume-Mayer/dumbchess-client/master/js/dumb-const.js'),
    ('code_url', 'https://raw.githubusercontent.com/Guillaume-Mayer/dumbchess-client/master/js/dumb-chess.js'),
    ('code_url', 'https://raw.githubusercontent.com/Guillaume-Mayer/dumbchess-client/master/js/dumb-client.js'),
    ('code_url', 'https://raw.githubusercontent.com/Guillaume-Mayer/dumbchess-client/master/js/dumb-main.js'),
    ('compilation_level', 'ADVANCED_OPTIMIZATIONS'),
    ('output_format', 'text'),
    ('output_info', 'compiled_code'),
  ])

# Always use the following value for the Content-type header.
headers = { "Content-type": "application/x-www-form-urlencoded" }
conn = http.client.HTTPConnection('closure-compiler.appspot.com')
conn.request('POST', '/compile', params, headers)
response = conn.getresponse()
data = response.read()
conn.close()

# Save result to file
f = open('dumb.js', 'wb')
f.write(data)
f.close()