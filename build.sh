#!/bin/bash

./node_modules/.bin/uglifyjs patrun.js -c "evaluate=false" --comments "/ Copyright .*/" -m --source-map patrun-min.map -o patrun-min.js
./node_modules/.bin/jshint patrun.js
./node_modules/.bin/docco patrun.js -o doc
cp -r doc/* ../gh-pages/patrun/doc
