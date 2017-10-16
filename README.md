# Geolistic

Import Geoname data to Elastic and enjoy millions of searchable locations in your app.

[Geoname](http://www.geonames.org/) is the most comprehensive open source geo location data source with
more than 11 million location points. Each location comes with a wealth of
information and can be searched in both English and local languages.

[Elastic](https://www.elastic.co/) is the leading open source search engine.

Geolistic connects these powers together and geo-enables your app 
without api restrictions.

## Features
* Blazing fast buffered import with batch indexing in elastic
* Filter unwanted data based on their type (city / country etc)
* Elastic schema included

## Install

```
$ npm install geolistic
```

### Add schema to elastic

```
$ curl -XPUT http://127.0.0.1:9200/geonames -d @data/schema.json
```

## Usage

### Using the command line tool
Use the included command line tool to download all data files

```
$ node geolistic-cli -downloadall
```

then add all files to elastic

```
$ node geolistic-cli -addall
```

You can also download and add individual countries, e.g. for Austria

```
$ node geolistic-cli -download AT
```

and add it

```
$ node geolistic-cli -add AT
```

### Using the library
Use as library or command line tool. Init the library like this:

```
const geolistic = require('geolistic');
geolistic.getGeoNameCountries({allColoumns: true}, function (err, countries) {
   // ...
});
```

See the api documentation here

## Configuration

No configuration is necessary if elastic runs on localhost port 9200 and
you're fine with using geonames/geoname as index/type in elastic.

Otherwise you can edit data/cli-config.json or use environment variables:
```
$ export ELASTIC_URL="localhost:9200"
$ export ELASTIC_PATH="geonames/geoname"
$ export DATAPATH="/tmp/"
$ node geolistic-cli.js -download AT
```

* ELASTIC_URL: Address to connect to your elastic instance
* ELASTIC_PATH: Where to store data in elastic INDEX/TYPE, e.g. geonames/geoname
* DATAPATH: Path were to download and extract data files, defaults to temp directory

## License

[The MIT License](http://opensource.org/licenses/MIT)

Copyright (c) 2017 Gunnar Skeid
