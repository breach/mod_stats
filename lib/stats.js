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

  my.GA_TRACKING_ID = 'UA-52485001-2';
  my.MODULES_STATE_UPDATE_FREQUENCY = 1000 * 60 * 60;

  my.client_id = null;
  my.breach_version = null;

  my.ga = null;

  //
  // ### _public_
  //
  var init;                       /* init(cb_); */
  var kill;                       /* kill(cb_); */

  //
  // ### _private_
  //
  var stats_reducer;              /* stats_reducer(oplog); */
  var update_modules_state;      /* update_modules_state(); */

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

  // ### update_modules_state
  //
  // Periodically update the state ot the modules (running, installed)
  update_modules_state = function() {
    breach.module('core').call('modules_list', {}, function(err, modules) {
      modules.forEach(function(m) {
        my.ga.track('/' + my.breach_version + '/modules/' + 
                    (m.running ? 'running' : 'stopped') + '/' +
                    m.type + '/' + m.name + '/' + m.version);
      });
    });
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
       rpc_call.prc === 'set_title' ||
       rpc_call.src === 'mod_stats') {
      return;
    }
    my.ga.track('/' + my.breach_version + '/rpc_call/' + rpc_call.dst + '/' + 
                rpc_call.prc + '/' + rpc_call.src);
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
        breach.module('core').call('version', {}, function(err, version) {
          my.breach_version = version;
          return cb_(err);
        });
      },
      function(cb_) {
        my.ga = require('./ga.js').ga({
          tracking_id: my.GA_TRACKING_ID,
          client_id: my.client_id,
          app_name: 'Breach',
          app_version: my.breach_version
        });

        /* We update the module state after startup (20s) and every hour. */
        setTimeout(update_modules_state, 1000 * 20);
        setInterval(update_modules_state, my.MODULES_STATE_UPDATE_FREQUENCY);

        common.log.out('[init] client_id: `' + my.client_id + '`');
        common.log.out('[init] breach_version: `' + my.breach_version + '`');
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
