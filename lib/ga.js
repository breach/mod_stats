/*
 * Breach: [mod_stats] ga.js
 *
 * Copyright (c) 2014, Stanislas Polu. All rights reserved.
 *
 * @author: spolu
 *
 * @log:
 * - 2014-07-02 spolu  Creation
 */
"use strict" 

var common = require('./common.js');

var async = require('async');
var request = require('request');
var breach = require('breach_module');

// ### ga
//
// Google analytics tracking code, largely inspired by yeoman/insight, without
// spawning a new process for requests (as we're already in a separate process)
//
// ```
// @spec { tracking_id, client_id, app_name, app_version }
// ```
var ga = function(spec, my) {
  var _super = {};
  my = my || {};
  spec = spec || {};

  my.tracking_id = spec.tracking_id;
  my.client_id = spec.client_id;
  my.app_name = spec.app_name;
  my.app_version = spec.app_version;

  //
  // ### _public_
  //
  var track;            /* track(path); */
  
  //
  // ### _private_
  //
  var process_request;  /* process_request(task, cb_); */

  //
  // ### _that_
  //
  var that = {};

  /****************************************************************************/
  /* PRIVATE HELPERS */
  /****************************************************************************/
  // ### process_request
  //
  // Worker method for the request processing queue `my.q`
  // ```
  // @task {object} the task object representing the event to track
  // @cb_  {function(err)} callback
  // ```
  process_request = function(task, cb_) {
    var qs = {
      v: 1,
      t: 'pageview',
      /* Anonymize IP. */
      aip: 1, 
      tid: my.tracking_id,
      cid: my.client_id,
      //an: my.app_name,
      //av: my.app_version,
      dp: task.path,
      qt: Date.now() - task.date
    };
    request({ url: 'http://www.google-analytics.com/collect', qs: qs }, cb_);
  };

  /****************************************************************************/
  /* PUBLIC METHODS */
  /****************************************************************************/
  // ### track
  // 
  // Tracks a new event specified by the keywords passed as arguments
  // ```
  // @path {string} path to track
  // ```
  track = function(path) {
    path = String(path).trim().replace(/ /, '-');
    my.q.push({
      path: path,
      date: Date.now()
    }, function(err) {
      if(err) {
        common.log.error(err);
      }
    });
  };

  my.q = async.queue(process_request, 2);

  common.method(that, 'track', track, _super);

  return that;
};

exports.ga = ga;
