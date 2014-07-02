/*
 * Breach: [mod_stats] stats.js
 *
 * Copyright (c) 2014, Stanislas Polu. All rights reserved.
 *
 * @author: spolu
 *
 * @log:
 * - 2014-06-30 spolu  Creation
 */
"use strict" 

var common = require('./common.js');

var async = require('async');
var breach = require('breach_module');

// ### stats
//
// ```
// @spec {}
// ```
var stats = function(spec, my) {
  var _super = {};
  my = my || {};
  spec = spec || {};

  my.client_id = null;

  //
  // ### _public_
  //
  var init;                       /* init(cb_); */
  var kill;                       /* kill(cb_); */

  //
  // ### _private_
  //
  var stats_reducer;              /* stats_reducer(oplog); */

  var core_inst_rpc_call_handler; /* core_inst_handler(evt); */

  //
  // ### _that_
  //
  var that = {};

  /****************************************************************************/
  /* PRIVATE HELPERS */
  /****************************************************************************/
  // ### stats_reducer
  //
  // Reducer used with core_data to store stats state (client_id)
  // ```
  // @oplog {array} the array of ops to reduce
  // ```
  stats_reducer = function(oplog) {
    /* Returns an object inluding the client_id */
    var value = {
      client_id: null
    };
    oplog.forEach(function(op) {
      if(typeof op.value !== 'undefined') {
        value = op.value || value;
      }
      else if(op.payload) {
        switch(op.payload.type) {
          case 'init': {
            if(!value.client_id) {
              /* This is not ideal but it'll do the trick for now. */
              value.client_id = Date.now() + '-' + Math.random()
            }
            break;
          }
          default: {
            break;
          }
        }
      }
    });
    return value;
  };

  /****************************************************************************/
  /* CORE EVENT HANDLERS */
  /****************************************************************************/
  // ### core_inst_rpc_call_handler
  //
  // Handler called when an instruementation event for rpc_call is received
  // ```
  // @state {object} the state
  // ```
  core_inst_rpc_call_handler = function(rpc_call) {
    /* We filter uninformative events */
    if(rpc_call.prc === 'store_push' ||
       rpc_call.prc === 'set_title') {
      return;
    }
    common.log.out(my.client_id + ': /rpc_call/' + rpc_call.dst + '/' + rpc_call.prc);
  };

  /****************************************************************************/
  /* PUBLIC METHODS */
  /****************************************************************************/
  // ### init 
  //
  // Called at initialisation of the module
  // ```
  // @cb_  {function(err)} the async callback
  // ```
  init = function(cb_) {
    async.series([
      function(cb_) {
        breach.module('core').call('store_register', {
          type: 'stats',
          reduce: stats_reducer.toString()
        }, cb_);
      },
      function(cb_) {
        breach.module('core').call('store_push', {
          type: 'stats',
          path: '/stats',
          payload: { type: 'init' }
        }, function(err, value) {
          if(err) {
            return cb_(err);
          }
          my.client_id = value.client_id;
          return cb_();
        });
      },
      function(cb_) {
        breach.module('core').on('inst:rpc_call', core_inst_rpc_call_handler);
        return cb_();
      },
      function(cb_) {
        return cb_();
      }
    ], cb_);
  };

  // ### kill 
  //
  // Called at destruction of the module
  // ```
  // @cb_  {function(err)} the async callback
  // ```
  kill = function(cb_) {
    return cb_();
  };


  common.method(that, 'init', init, _super);
  common.method(that, 'kill', kill, _super);

  return that;
};

exports.stats = stats;
