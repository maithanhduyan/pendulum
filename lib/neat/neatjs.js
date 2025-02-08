import methods from './methods/methods.js';
import Connection from './architecture/connection.js';
import architect from './architecture/architect.js';
import Network from './architecture/network.js';
import config from './config.js';
import Group from './architecture/group.js';
import Layer from './architecture/layer.js';
import Node from './architecture/node.js';
import Neat from './neat.js';
import multi from './multithreading/multi.js';

let NeatJS = {
  methods: methods,
  Connection: Connection,
  architect: architect,
  Network: Network,
  config: config,
  Group: Group,
  Layer: Layer,
  Node: Node,
  Neat: Neat,
  multi: multi,
};

// CommonJS & AMD
if (typeof define !== 'undefined' && define.amd) {
  define([], function () {
    return NeatJS;
  });
}

// Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NeatJS;
}

// Browser
if (typeof window === 'object') {
  (function () {
    var old = window['NeatJS'];
    NeatJS.ninja = function () {
      window['NeatJS'] = old;
      return NeatJS;
    };
  })();

  window['NeatJS'] = NeatJS;
}

export default NeatJS;
