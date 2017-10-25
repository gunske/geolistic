/**
 * Geolistic
 *
 * @file Enjoy millions of searchable locations in your project.
 * Geolistic features high performance import of geoname data to
 * elastic search engine.
 *
 * See the [api documentation here](./module-geolistic.html).
 * @version 0.2.2
 * @copyright Copyright (c) 2017 Gunnar Skeid
 */
'use strict';

const download = require('download'),
    parse = require('csv-parse'),
    fs = require('fs'),
    path = require('path'),
    os = require('os'),
    transform = require('stream-transform');

/** @module geolistic */
var Geolistic = (function () {

    var api = {},
        local = {
            // private local namespace for this module to avoid collisions with func scope variables
            client: null,
            /**
             * Used by addFileToElastic() to map geoname data to elastic schema
             *
             * - "geonameId"
             * - "name"
             * - "asciiName"
             * - "alternateNames"
             * - "latitude"
             * - "longitude"
             * - "featureClass"
             * - "featureCode"
             * - "country"
             * - "cc2"
             * - "admin1"
             * - "admin2"
             * - "admin3"
             * - "admin4"
             * - "population"
             * - "elevation"
             * - "dem"
             * - "timezone"
             * - "modDate"
             *
             * @const module:geolistic.geonameLocationMapper
             * @private
             * @type {Object}
             * @see  module:geolistic.addFileToElastic
             */
            geonameLocationMapper: {
                "geonameId": 0,
                "name": 1,
                "asciiName": 2,
                "alternateNames": 3,
                "latitude": 4,
                "longitude": 5,
                "featureClass": 6,
                "featureCode": 7,
                "country": 8,
                "cc2": 9,
                "admin1": 10,
                "admin2": 11,
                "admin3": 12,
                "admin4": 13,
                "population": 14,
                "elevation": 15,
                "dem": 16,
                "timezone": 17,
                "modDate": 18
            },
            /**
             * Used by getGeoNameCountries() to map geoname data to JSON documents
             *
             * - "iso"
             * - "iso3"
             * - "isoNumber"
             * - "fips"
             * - "country"
             * - "capital"
             * - "area"
             * - "population"
             * - "continent"
             * - "tld"
             * - "currencyCode"
             * - "currencyName"
             * - "phone"
             * - "postalCodeFormat"
             * - "postalCodeRegExp"
             * - "languages"
             * - "geonameId"
             * - "neighbours"
             * - "equivalentFipsCode"
             *
             * @const module:geolistic.geonameCountryMapper
             * @private
             * @type {Object}
             * @see  module:geolistic.getGeoNameCountries
             */
            geonameCountryMapper: {
                "iso": 0,
                "iso3": 1,
                "isoNumber": 2,
                "fips": 3,
                "country": 4,
                "capital": 5,
                "area": 6,
                "population": 7,
                "continent": 8,
                "tld": 9,
                "currencyCode": 10,
                "currencyName": 11,
                "phone": 12,
                "postalCodeFormat": 13,
                "postalCodeRegExp": 14,
                "languages": 15,
                "geonameId": 16,
                "neighbours": 17,
                "equivalentFipsCode": 18
            },
            geonameDownloadUrl: "http://download.geonames.org/export/dump/%s",
            elasticIndex: 'geonames',
            elasticType: 'geoname',
            dataPath: os.tmpdir()
        };

    /**
     * -------------------  PRIVATE  -------------------
     */

    /**
     * -------------------  PUBLIC  -------------------
     */

    /**
     * Set/update config
     *
     * Can be used to provide db information after init but before calling
     * db dependent methods
     *
     * - **elasticPath** {string}: index/type path in elastic, e.g. "geonames/geoname"
     * - **elasticClient** {Object}: live connection object to elastic using https://www.npmjs.com/package/elasticsearch
     * - **dataPath** {string}: local path to download data files
     *
     * @example
     * geolistic.config({elasticClient: client});
     *
     * @function module:geolistic.config
     * @param {object} data - configuration options (see above)
     * @throws if error in options or unknown option keys
     */
    api.config = function(data) {

        var result;

        for (var key in data) {

            switch (key) {
                case 'elasticPath':
                    api.setElasticPath(data[key]);
                    break;
                case 'elasticClient':
                    api.setElasticClient(data[key]);
                    break;
                case 'dataPath':
                    api.setDataPath(data[key]);
                    break;
                default:
                    throw new Error("Unknown config key '" + key + "'");
                    break;
            }

        }

    };

    /**
     * Module constructor, you only need to use it if you want to change the default
     * configuration
     *
     * @example
     * const geolistic = require('geolistic').init({dataPath: '/var/tmp/'});
     *
     * @example
     * const geolistic = require('geolistic');
     *
     * @constructor
     * @function module:geolistic.init
     * @param {Object} data - configuration options (see config())
     * @returns {Object} module - returns the public api of the module
     * @throws if error in options or unknown option keys
     */
    api.init  = function(data) {

        api.config(data);

        return Geolistic;

    };

    /**
     * Set path to where downloaded files should be stored
     *
     * Defaults to os.tmpdir()
     *
     * @example
     * geolistic.setDataPath("/tmp/");
     *
     * @function module:geolistic.setDataPath
     * @param {string} pathParam - local path, e.g. "/tmp/"
     * @throws if error in parameter
     */
    api.setDataPath = function (pathParam) {

        if (typeof pathParam !== 'string') {
            throw new Error("Path is not a valid string");
        }

        local.dataPath = pathParam;

    };

    /**
     * Set where documents should be stored in elastic in the form of "index/type"
     *
     * Defaults to "geonames/geoname", i.e. index "geonames" and type (schema) "geoname"
     *
     * @example
     * geolistic.setElasticPath("geonames/geoname");
     *
     * @function module:geolistic.setElasticPath
     * @param {string} pathParam - "index/type"
     * @throws if error in parameter
     */
    api.setElasticPath = function (pathParam) {

        if (typeof pathParam !== 'string') {
            throw new Error("elasticPath is not a valid string");
        }

        var elasticPath = pathParam.split('/');

        if (elasticPath.length !== 2) {

            throw new Error("elasticPath must be in the form of 'index/type'");

        } else if (elasticPath[0].length < 1 || elasticPath[1].length < 1) {

            throw new Error("Index or Type should not be empty");

        } else {

            local.elasticIndex = elasticPath[0];
            local.elasticPath = elasticPath[1];

        }

    };

    /**
     * Set connection object to elastic using client library https://www.npmjs.com/package/elasticsearch
     *
     * Are only used if you call methods that need to access elastic. You can use other library
     * methods without providing a connection
     *
     * @example
     * geolistic.setElasticPath("geonames/geoname");
     *
     * @function module:geolistic.setElasticClient
     * @param {Object} dbClient - elastic connection object
     * @throws if error in parameter
     */
    api.setElasticClient = function (dbClient) {

        if (typeof dbClient !== 'object') {
            throw new Error("elasticClient is not a valid object");
        }

        local.client = dbClient;

    };

    /**
     * Get GeoName's country list from http://download.geonames.org/export/dump/countryInfo.txt
     *
     * Options:
     * - **allColoumns** {boolean}: return [all coloumns](#.geonameCountryMapper) (defaults to only iso-codes)
     *
     * Callback:
     * - **data** {array}: ISO codes of countries or array of JSON objects for each country
     * @see module:geolistic.geonameCountryMapper
     *
     * @function module:geolistic.getGeoNameCountries
     * @param {requestCallback|Object} optionsOrCb - callback or options
     * @param {requestCallback} cb - callback(err, data)
     */
    api.getGeoNameCountries = function(optionsOrCb, cb) {

        if (typeof optionsOrCb === 'function') {
            cb = optionsOrCb;
            optionsOrCb = {};
        }

        const that = this,
            allColoumns = optionsOrCb.allColoumns || false;

        var countries,
            parser,
            transformer;


        const downloadUrl = local.geonameDownloadUrl.replace("%s", "countryInfo.txt");

        countries = [];
        parser = parse({delimiter: "\t"});

        transformer = transform(function(record, callback) {

            if (!record[0].startsWith('#')) {

                countries.push((allColoumns ? record : record[0]));

            }
            callback();

        }, {parallel: 10});

        download(downloadUrl).pipe(parser).pipe(transformer);

        transformer.on('finish', function () {

            (cb ? cb(null, countries) : null);

        });

    };

    /**
     * Parse and index individual country datafiles (XX.txt) into elastic
     *
     * Options:
     * - **bufferRecords** {number}: Buffer x records before indexing in elastic with batch. Defaults to 1000
     * - **classFilters** {array}: Include filter on fclass, e.g. ['A', 'P'] to include country/area and city (see "feature classes" at [geonames.org](http://download.geonames.org/export/dump/))
     * - **bufferAdded** {function}: Hook that is executed after every buffer commit to elastic, recordsProcessed is passed as param
     *
     * @function module:geolistic.addFileToElastic
     * @param {string} countryCode - iso code of country
     * @param {requestCallback|Object} optionsOrCb - callback or options
     * @param {requestCallback} cb - callback
     */
    api.addFileToElastic = function(countryCode, optionsOrCb, cb) {

        if (typeof optionsOrCb === 'function') {
            cb = optionsOrCb;
            optionsOrCb = {};
        }

        const that = this,
            testMode = (countryCode === '00'),
            featureClassFilters = optionsOrCb.classFilters || null,
            fnBufferComplete = optionsOrCb.bufferAdded || null;

        var input,
            transformer,
            dataPath = local.dataPath,
            client = local.client,
            bufferRecords = optionsOrCb.bufferRecords || 1000,
            recordsProcessed = 0,
            recordsAdded = 0,
            isFiltered,
            parser,
            lineOutput,
            output = [],
            i;

        function helperAddBuffer(next) {

            if (!testMode && !local.client) {
                throw new Error("No db connection to elastic");
            }

            client.bulk({
                body: output
            }, function(err, result) {

                (fnBufferComplete ? fnBufferComplete(recordsProcessed) : null);

                if (err) {

                    var errorMessage = "",
                        isIndex = false,
                        isType = false;

                    if (err.message) {
                        if (err.message.indexOf("index is missing") !== -1) {
                            isIndex = true;
                        }
                        if (err.message.indexOf("type is missing") !== -1) {
                            isType = true;
                        }

                        if (isIndex || isType) {
                            errorMessage = "Missing schema in elastic:";
                            if (isIndex) {
                                errorMessage += " ['" + elasicIndex + "' no such index]";
                            }
                            if (isType) {
                                errorMessage += " ['" + elasicType + "' no such type]";
                            }
                        }

                        if (errorMessage) {
                            err = new Error(errorMessage);
                        }
                    }

                    (cb ? cb(err) : null);

                } else {

                    output = [];
                    next ? next() : null;

                }

            });

        }

        if (!countryCode || typeof countryCode !== 'string' || countryCode.length !== 2) {

            (cb ? cb(new Error("Invalid countryCode '" + countryCode + "', should be two char string")) : null);
            return;

        }

        if (testMode) {

            countryCode = 'NU';
            dataPath = './test/data/';

            // Make mockup db client bulk add
            client = {bulk: function (input, fn) {

                fn(null, null);

            }};

        }

        countryCode = countryCode.toLocaleUpperCase();
        bufferRecords = bufferRecords * 2;

        parser = parse({delimiter: "\t",
            quote: '',
            relax: true,
            escape: ""});

        input = fs.createReadStream(path.join(dataPath, countryCode + '.txt'));
        input.on('error', function (err) {

            if (err && err.code === 'ENOENT') {
                err = new Error("Missing datafile for " + countryCode + " at " + err.path);
            }

            (cb ? cb(err) : null);

        });

        transformer = transform(function(record, callback) {

            recordsProcessed += 1;

            if (featureClassFilters && featureClassFilters.length != 0) {

                isFiltered = true;
                for (i = 0; i < featureClassFilters.length; i += 1) {

                    if (record[local.geonameLocationMapper["featureClass"]] === featureClassFilters[i]) {
                        isFiltered = false;
                    }
                }

                if (isFiltered) {
                    callback();
                    return;
                }
            }

            lineOutput = {};
            for (var key in local.geonameLocationMapper) {
                lineOutput[key] = record[local.geonameLocationMapper[key]];
            }
            lineOutput.location = record[local.geonameLocationMapper["latitude"]] + ',' +
                record[local.geonameLocationMapper["longitude"]];

            output.push({ "index" : { _index: local.elasticIndex,
                _type: local.elasticType,
                _id: record[local.geonameLocationMapper["geonameId"]] } });

            recordsAdded += 1;

            if (output.push(lineOutput) === bufferRecords) {

                helperAddBuffer(function () {

                    callback();

                });

            } else {

                callback();

            }

        }, {parallel: 1});

        transformer.on('finish', function(){

            if (output.length) {

                helperAddBuffer(function () {

                    (cb ? cb(null, {processed: recordsProcessed, added: recordsAdded}) : null);

                });

            } else {
                (cb ? cb(null, {processed: recordsProcessed, added: recordsAdded}) : null);
            }

        });

        input.pipe(parser).pipe(transformer);

    };

    /**
     * Fetches and maps Geoname country list to JSON
     *
     * @function module:geolistic.getCountries
     * @param {requestCallback} cb - callback
     */
    api.getCountries = function(cb) {

        const that = this;

        var returnVariable = null,
            item,
            languages = {},
            continentLanguages = {};

        api.getGeoNameCountries({allColoumns: true}, function (err, countries) {

            if (err) {
                (cb ? cb(err) : null);
                return;
            }

            returnVariable = [];
            for (var i = 0; i < countries.length; i += 1) {

                item = {};
                for (var key in local.geonameCountryMapper) {
                    item[key] = countries[i][local.geonameCountryMapper[key]];
                }

                item["languages"] = item["languages"].split(",");
                item["neighbours"] = item["neighbours"].split(",");
                item["population"] = +item["population"];
                item["area"] = +item["area"];

                returnVariable.push(item);

            }

            (cb ? cb(null, returnVariable) : null);

        });

    };

    /**
     * Download [country files](http://download.geonames.org/export/dump/) and optionally extracts them
     *
     * Options:
     * - **parallelDownloads** {number}: How many parallell downloads to allow
     * - **extract** {boolean}: Whether to extract files (from XX.zip to XX.txt)
     * - **preDownload** {function}: hook executed before each batch of parallel downloads, file list is passed in array
     * - **postDownload** {function}: hook executed after each batch of parallel downloads, file list is passed in array
     *
     * @function module:geolistic.downloadGeoNameCountryFiles
     * @param {array} countries - iso country codes
     * @param {requestCallback|Object} optionsOrCb - callback or options
     * @param {requestCallback} cb - callback
     */
    api.downloadGeoNameCountryFiles = function(countries, optionsOrCb, cb) {

        if (typeof optionsOrCb === 'function') {
            cb = optionsOrCb;
            optionsOrCb = {};
        }

        var that = this,
            parallelDownloads = optionsOrCb.parallelDownloads || 2,
            extract = optionsOrCb.extract || false,
            fnPreParallelDownload = optionsOrCb.preDownload || null,
            fnPostParallelDownload = optionsOrCb.postDownload || null,
            hasErrors = false,
            downloadQueue = [],
            downloadsLeft = [],
            i,
            filesProcessed = 0;

        if (!Array.isArray(countries)) {

            (cb ? cb(new Error("countries incorrect (array with two character strings)")) : null);
            return;

        }

        if (countries.length === 0) {

            // Nothing to do...
            (cb ? cb(null, filesProcessed) : null);
            return;

        }

        for (i = 0; i < countries.length; i += 1) {

            var countryCode = countries[i].toLocaleUpperCase();

            if (countryCode.length !== 2) {
                (cb ? cb(new Error("Not all countries in array was correct (two character string)")) : null);
                return;
            }

            var downloadUrl = local.geonameDownloadUrl.replace("%s", countryCode + ".zip");
            downloadsLeft.push(downloadUrl);

        }

        (function downloadNextFiles() {

            function helperDownloadsDone() {

                (cb ? cb(null, filesProcessed) : null);

            }

            for (i = 0; i < parallelDownloads; i += 1) {

                downloadQueue.push(downloadsLeft.shift());

                if (!downloadsLeft.length) {
                    // No more downloads, exit loop
                    break;
                }

            }

            if(!downloadQueue.length) {
                // Nothing more to download
                helperDownloadsDone();
            }

            (fnPreParallelDownload ? fnPreParallelDownload(downloadQueue.join(",").split(",")) : null);

            Promise.all(downloadQueue.map(function(x) {
                return download(x, local.dataPath, {extract: extract});
            })).catch(function(err) {

                (cb ? cb(new Error("Error downloading " + downloadQueue.join(", ") + ": " + err)) : null);
                hasErrors = true;

            }).then(function(res) {

                if (hasErrors) {
                    return;
                }

                (fnPostParallelDownload ? fnPostParallelDownload(downloadQueue.join(",").split(",")) : null);

                filesProcessed += downloadQueue.length;
                downloadQueue = [];

                if (!downloadsLeft.length) {
                    // Nothing more to download
                    helperDownloadsDone();
                    return;
                }

                downloadNextFiles();
            });

        })();

    };

    return api;

})();

module.exports = Geolistic;
