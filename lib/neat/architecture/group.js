/* Import */
import methods from '../methods/methods.js';
import config from '../config.js';
import Layer from './layer.js';
import Node from './node.js';

class Group {
  constructor(size) {
    this.nodes = [];
    this.connections = {
      in: [],
      out: [],
      self: [],
    };

    for (let i = 0; i < size; i++) {
      this.nodes.push(new Node());
    }
  }
  /**
   * Activates all the nodes in the group
   */
  activate(value) {
    let values = [];

    if (typeof value !== 'undefined' && value.length !== this.nodes.length) {
      throw new Error(
        'Array with values should be same as the amount of nodes!',
      );
    }

    for (let i = 0; i < this.nodes.length; i++) {
      let activation;
      if (typeof value === 'undefined') {
        activation = this.nodes[i].activate();
      } else {
        activation = this.nodes[i].activate(value[i]);
      }

      values.push(activation);
    }

    return values;
  }
  /**
   * Propagates all the node in the group
   */
  propagate(rate, momentum, target) {
    if (typeof target !== 'undefined' && target.length !== this.nodes.length) {
      throw new Error(
        'Array with values should be same as the amount of nodes!',
      );
    }

    for (let i = this.nodes.length - 1; i >= 0; i--) {
      if (typeof target === 'undefined') {
        this.nodes[i].propagate(rate, momentum, true);
      } else {
        this.nodes[i].propagate(rate, momentum, true, target[i]);
      }
    }
  }
  /**
   * Connects the nodes in this group to nodes in another group or just a node
   */
  connect(target, method, weight) {
    let connections = [];
    let i, j;
    if (target instanceof Group) {
      if (typeof method === 'undefined') {
        if (this !== target) {
          if (config.warnings)
            console.warn('No group connection specified, using ALL_TO_ALL');
          method = methods.connection.ALL_TO_ALL;
        } else {
          if (config.warnings)
            console.warn('No group connection specified, using ONE_TO_ONE');
          method = methods.connection.ONE_TO_ONE;
        }
      }
      if (
        method === methods.connection.ALL_TO_ALL ||
        method === methods.connection.ALL_TO_ELSE
      ) {
        for (i = 0; i < this.nodes.length; i++) {
          for (j = 0; j < target.nodes.length; j++) {
            if (
              method === methods.connection.ALL_TO_ELSE &&
              this.nodes[i] === target.nodes[j]
            )
              continue;
            let connection = this.nodes[i].connect(target.nodes[j], weight);
            this.connections.out.push(connection[0]);
            target.connections.in.push(connection[0]);
            connections.push(connection[0]);
          }
        }
      } else if (method === methods.connection.ONE_TO_ONE) {
        if (this.nodes.length !== target.nodes.length) {
          throw new Error('From and To group must be the same size!');
        }

        for (i = 0; i < this.nodes.length; i++) {
          let connection = this.nodes[i].connect(target.nodes[i], weight);
          this.connections.self.push(connection[0]);
          connections.push(connection[0]);
        }
      }
    } else if (target instanceof Layer) {
      connections = target.input(this, method, weight);
    } else if (target instanceof Node) {
      for (i = 0; i < this.nodes.length; i++) {
        let connection = this.nodes[i].connect(target, weight);
        this.connections.out.push(connection[0]);
        connections.push(connection[0]);
      }
    }

    return connections;
  }
  /**
   * Make nodes from this group gate the given connection(s)
   */
  gate(connections, method) {
    if (typeof method === 'undefined') {
      throw new Error('Please specify Gating.INPUT, Gating.OUTPUT');
    }

    if (!Array.isArray(connections)) {
      connections = [connections];
    }

    let nodes1 = [];
    let nodes2 = [];

    let i, j;
    for (i = 0; i < connections.length; i++) {
      let connection = connections[i];
      if (!nodes1.includes(connection.from)) nodes1.push(connection.from);
      if (!nodes2.includes(connection.to)) nodes2.push(connection.to);
    }

    switch (method) {
      case methods.gating.INPUT:
        for (i = 0; i < nodes2.length; i++) {
          let node = nodes2[i];
          let gater = this.nodes[i % this.nodes.length];

          for (j = 0; j < node.connections.in.length; j++) {
            let conn = node.connections.in[j];
            if (connections.includes(conn)) {
              gater.gate(conn);
            }
          }
        }
        break;
      case methods.gating.OUTPUT:
        for (i = 0; i < nodes1.length; i++) {
          let node = nodes1[i];
          let gater = this.nodes[i % this.nodes.length];

          for (j = 0; j < node.connections.out.length; j++) {
            let conn = node.connections.out[j];
            if (connections.includes(conn)) {
              gater.gate(conn);
            }
          }
        }
        break;
      case methods.gating.SELF:
        for (i = 0; i < nodes1.length; i++) {
          let node = nodes1[i];
          let gater = this.nodes[i % this.nodes.length];

          if (connections.includes(node.connections.self)) {
            gater.gate(node.connections.self);
          }
        }
    }
  }
  /**
   * Sets the value of a property for every node
   */
  set(values) {
    for (let i = 0; i < this.nodes.length; i++) {
      if (typeof values.bias !== 'undefined') {
        this.nodes[i].bias = values.bias;
      }

      this.nodes[i].squash = values.squash || this.nodes[i].squash;
      this.nodes[i].type = values.type || this.nodes[i].type;
    }
  }
  /**
   * Disconnects all nodes from this group from another given group/node
   */
  disconnect(target, twosided) {
    twosided = twosided || false;

    // In the future, disconnect will return a connection so indexOf can be used
    let i, j, k;
    if (target instanceof Group) {
      for (i = 0; i < this.nodes.length; i++) {
        for (j = 0; j < target.nodes.length; j++) {
          this.nodes[i].disconnect(target.nodes[j], twosided);

          for (k = this.connections.out.length - 1; k >= 0; k--) {
            let conn = this.connections.out[k];

            if (conn.from === this.nodes[i] && conn.to === target.nodes[j]) {
              this.connections.out.splice(k, 1);
              break;
            }
          }

          if (twosided) {
            for (k = this.connections.in.length - 1; k >= 0; k--) {
              let conn = this.connections.in[k];

              if (conn.from === target.nodes[j] && conn.to === this.nodes[i]) {
                this.connections.in.splice(k, 1);
                break;
              }
            }
          }
        }
      }
    } else if (target instanceof Node) {
      for (i = 0; i < this.nodes.length; i++) {
        this.nodes[i].disconnect(target, twosided);

        for (j = this.connections.out.length - 1; j >= 0; j--) {
          let conn = this.connections.out[j];

          if (conn.from === this.nodes[i] && conn.to === target) {
            this.connections.out.splice(j, 1);
            break;
          }
        }

        if (twosided) {
          for (j = this.connections.in.length - 1; j >= 0; j--) {
            let conn = this.connections.in[j];

            if (conn.from === target && conn.to === this.nodes[i]) {
              this.connections.in.splice(j, 1);
              break;
            }
          }
        }
      }
    }
  }
  /**
   * Clear the context of this group
   */
  clear() {
    for (let i = 0; i < this.nodes.length; i++) {
      this.nodes[i].clear();
    }
  }
}

/* Export */
export default Group;
