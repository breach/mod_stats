/*
 * Breach: [mod_stats] index.js
 *
 * Copyright (c) 2014, Stanislas Polu. All rights reserved.
 *
 * @author: spolu
 *
 * @log:
 * - 2014-06-26 spolu   Creation
 */
"use strict"

var common = require('./lib/common.js');
var async = require('async');
var breach = require('breach_module');

/******************************************************************************/
/* MODULE BOOTSTRAP */
/******************************************************************************/
var bootstrap = function(http_srv) {
  common._ = {
    stats: require('./lib/stats.js').stats({})
  };

  breach.init(function() {
    breach.register('core', 'inst:.*');
  
    breach.expose('init', function(src, args, cb_) {
      async.parallel([
        common._.stats.init,
      ], cb_);
    });
  
    breach.expose('kill', function(args, cb_) {
      async.parallel([
        common._.stats.kill,
      ], function(err) {
        common.exit(0);
      });
    });
  });
};

/******************************************************************************/
/* SETUP */
/******************************************************************************/
(function setup() {
  return bootstrap();
})();

process.on('uncaughtException', function (err) {
  common.fatal(err);
});
