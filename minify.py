# This script minifies JS and CSS to "minified" folder using REST APIs
import http.client, urllib.parse

# Minify JS files from GitHub using Google Closure Compiler Advanced Optimizations REST API
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
f = open('minified/dumb.js', 'wb')
f.write(data)
f.close()

# Now minify CSS using http://cssminifier.com/
f = open('css/chess.css', 'r')
data = f.read()
f.close()

# Do the REST request
params = urllib.parse.urlencode([('input',data)])
headers = { "Content-type": "application/x-www-form-urlencoded" }
conn = http.client.HTTPSConnection('cssminifier.com')
conn.request('POST', '/raw', params, headers)
response = conn.getresponse()
data = response.read()
conn.close()

# Save result to file
f = open('minified/dumb.css', 'wb')
f.write(data)
f.close()
