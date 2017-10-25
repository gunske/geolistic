var assert = require('assert');

describe('geolistic-cli', function() {

    const exec = require('child_process').exec;

    describe('no arguments', function () {

        it('should contain usage statement', function (done) {

            this.timeout(6000);

            exec('node geolistic-cli.js', function (err, stdout, stderr) {

                assert.equal(null, err);
                assert.ok((stdout.indexOf('Usage: node geolistic-cli') > -1));

                done();

            });

        });

        it('download NU.zip', function (done) {

            this.timeout(10000);

            exec('node geolistic-cli.js -download NU', function (err, stdout, stderr) {

                assert.equal(null, err);
                assert.ok((stdout.indexOf('1 files downloaded and extracted') > -1));

                done();

            });

        });

        it('add test', function (done) {

            this.timeout(10000);

            exec('node geolistic-cli.js -add 00', function (err, stdout, stderr) {

                assert.equal(null, err);
                assert.ok((stdout.indexOf('All done with 109 processed and 109 added records') > -1));

                done();

            });

        });
        it('download all (TEST)', function (done) {

            this.timeout(10000);

            exec('export TEST=1; node geolistic-cli.js -downloadall', function (err, stdout, stderr) {

                assert.equal(null, err);
                assert.ok((stdout.indexOf(' files downloaded and extracted') > -1));

                done();

            });

        });
        it('add all (TEST)', function (done) {

            this.timeout(10000);

            exec('export TEST=1; node geolistic-cli.js -addall', function (err, stdout, stderr) {

                assert.equal(null, err);

                done();

            });

        });

    });

});

describe('geolistic-lib', function() {

    const geolistic = require('../lib');
    var libObject;

    describe('init', function () {

        it('init without config', function (done) {

            assert.doesNotThrow(function () {
                libObject = geolistic.init({});
            }, 'should not throw exception');

            assert.equal(typeof libObject, 'object');

            done();

        });

        it('init with all config options right', function (done) {

            assert.doesNotThrow(function () {
                libObject = geolistic.init({elasticPath: 'geos/geo',
                    elasticClient: {},
                    dataPath: '/var/tmp/'});
            });

            done();

        });

        it('init with wrong client object', function (done) {

            assert.throws(function () {
                libObject = geolistic.init({elasticPath: 'geos/geo',
                    elasticClient: '',
                    dataPath: '/var/tmp/'});
            }, /elasticClient is not a valid object/, 'did not throw with expected message');

            done();

        });

        it('init with wrong elasticPath', function (done) {

            assert.throws(function () {
                libObject = geolistic.init({elasticPath: 'geos',
                    elasticClient: {},
                    dataPath: '/var/tmp/'});
            }, /elasticPath must be in the form of/, 'did not throw with expected message');

            done();

        });

        it('init with wrong dataPath', function (done) {

            assert.throws(function () {
                libObject = geolistic.init({elasticPath: 'geos/geo',
                    elasticClient: {},
                    dataPath: null});
            }, /Path is not a valid string/, 'did not throw with expected message');

            done();

        });

        it('init with unknown parameter', function (done) {

            assert.throws(function () {
                libObject = geolistic.init({elasticPath: 'geos/geo',
                    haha: '',
                    elasticClient: {},
                    dataPath: null});
            }, /Unknown config key 'haha'/, 'did not throw with expected message');

            done();

        });

    });

    describe('config', function () {

        it('init with all config options right', function (done) {

            assert.doesNotThrow(function () {
                libObject = geolistic.init({elasticPath: 'geos/geo',
                    elasticClient: {},
                    dataPath: '/var/tmp/'});
                libObject.config({elasticPath: 'geos/geo',
                    elasticClient: {},
                    dataPath: '/var/tmp/'});
            });

            done();

        });

    });

    describe('setDataPath', function () {

        it('setDataPath right', function (done) {

            assert.doesNotThrow(function () {
                geolistic.setDataPath('/tmp/');
            });

            done();

        });

        it('setDataPath null', function (done) {

            assert.throws(function () {
                geolistic.setDataPath(null);
            }, /Path is not a valid string/, 'did not throw with expected message');

            done();

        });

    });

    describe('setElasticPath', function () {

        it('setElasticPath right', function (done) {

            assert.doesNotThrow(function () {
                geolistic.setElasticPath('geos/geo');
            });

            done();

        });

        it('setElasticPath null', function (done) {

            assert.throws(function () {
                geolistic.setElasticPath(null);
            }, /elasticPath is not a valid string/, 'did not throw with expected message');

            done();

        });

        it('setElasticPath empty index/type', function (done) {

            assert.throws(function () {
                geolistic.setElasticPath('/');
            }, /Index or Type should not be empty/, 'did not throw with expected message');

            done();

        });

        it('setElasticPath no slash', function (done) {

            assert.throws(function () {
                geolistic.setElasticPath('geos');
            }, /elasticPath must be in the form of /, 'did not throw with expected message');

            done();

        });

        it('setElasticPath too many slashes', function (done) {

            assert.throws(function () {
                geolistic.setElasticPath('g/e/o');
            }, /elasticPath must be in the form of /, 'did not throw with expected message');

            done();

        });

    });

    describe('setElasticClient', function () {

        it('setElasticClient right', function (done) {

            assert.doesNotThrow(function () {
                geolistic.setElasticClient({});
            });

            done();

        });

        it('setElasticClient ""', function (done) {

            assert.throws(function () {
                geolistic.setElasticClient('');
            }, /elasticClient is not a valid object/, 'did not throw with expected message');

            done();

        });

    });

    describe('getGeoNameCountries/getCountries', function () {

        it('getGeoNameCountries no options right', function (done) {

            geolistic.getGeoNameCountries(function (err, result) {

                assert.equal(err, null);
                assert.notEqual(result, null);
                assert.ok(Array.isArray(result));
                assert.ok(result.length > 10);

                done();
            });


        });

        it('getGeoNameCountries options allColoumns right', function (done) {

            geolistic.getGeoNameCountries({allColoumns: true}, function (err, result) {

                assert.equal(err, null);
                assert.notEqual(result, null);
                assert.ok(Array.isArray(result));
                assert.ok(result.length > 10);
                assert.ok(Array.isArray(result[0]));
                assert.equal(typeof result[0][0], 'string');

                done();

            });

        });

        it('getCountries right', function (done) {

            geolistic.getCountries(function (err, result) {

                assert.equal(err, null);
                assert.notEqual(result, null);
                assert.ok(Array.isArray(result));
                assert.ok(result.length > 10);
                assert.doesNotThrow(function () {
                    var tmp = result[0]["country"];
                });
                assert.equal(typeof result[0]["country"], 'string');

                done();

            });

        });

    });

    describe('addFileToElastic', function () {

        it('addFileToElastic right', function (done) {

            assert.doesNotThrow(function () {

                // 00 as country means test mode
                geolistic.addFileToElastic('00', function (err, result) {

                    assert.equal(err, null);
                    assert.notEqual(result, null);
                    assert.equal(result.processed, 109);
                    assert.equal(result.added, 109);

                    done();

                });

            });

        });
        it('addFileToElastic filter P', function (done) {

            assert.doesNotThrow(function () {

                // 00 as country means test mode
                geolistic.addFileToElastic('00', {classFilters: ['P']}, function (err, result) {

                    assert.equal(err, null);
                    assert.notEqual(result, null);
                    assert.equal(result.processed, 109);
                    assert.equal(result.added, 45);

                    done();

                });

            });

        });
        it('addFileToElastic short buffer', function (done) {

            assert.doesNotThrow(function () {

                // 00 as country means test mode
                geolistic.addFileToElastic('00', {bufferRecords: 5}, function (err, result) {

                    assert.equal(err, null);
                    assert.notEqual(result, null);
                    assert.equal(result.processed, 109);
                    assert.equal(result.added, 109);

                    done();

                });

            });

        });

        it('addFileToElastic wrong country code format', function (done) {

            geolistic.addFileToElastic('yes sir', function (err, result) {

                assert.notEqual(err, null);
                assert.equal(result, undefined);
                assert.ok(err.toString().indexOf('Invalid countryCode ') > -1);

                done();

            });

        });

        it('addFileToElastic country does not exists', function (done) {

            geolistic.addFileToElastic('01', function (err, result) {

                assert.notEqual(err, null);
                assert.equal(result, undefined);
                assert.ok(err.toString().indexOf('Missing datafile for 01') > -1);

                done();

            });

        });

    });

});
