# Cấu trúc Dự án như sau:

```
├── architecture
│   ├── architect.js
│   ├── connection.js
│   ├── group.js
│   ├── layer.js
│   ├── network.js
│   └── node.js
├── config.js
├── counter.js
├── methods
│   ├── activation.js
│   ├── connection.js
│   ├── cost.js
│   ├── crossover.js
│   ├── gating.js
│   ├── methods.js
│   ├── mutation.js
│   ├── rate.js
│   └── selection.js
├── multithreading
│   ├── multi.js
│   └── workers
│       ├── browser
│       │   └── testworker.js
│       └── workers.js
├── neat.js
└── neatjs.js
```

# Danh sách chi tiết các file:

## File ../lib/neat\config.js:
```javascript
// Code: Neat Config
let config = {
  warnings: false,
};

export default config;

```

## File ../lib/neat\counter.js:
```javascript
export function setupCounter(element) {
    let counter = 0
    const setCounter = (count) => {
      counter = count
      element.innerHTML = `count is ${counter}`
    }
    element.addEventListener('click', () => setCounter(counter + 1))
    setCounter(0)
  }
  
```

## File ../lib/neat\neat.js:
```javascript
/* Import */
import Network from './architecture/network.js';
import methods from './methods/methods.js';
import config from './config.js';

/* Easier variable naming */
let selection = methods.selection;

class Neat {
  constructor(input, output, fitness, options) {
    this.input = input; // The input size of the networks
    this.output = output; // The output size of the networks
    this.fitness = fitness; // The fitness function to evaluate the networks

    // Configure options
    options = options || {};
    this.equal = options.equal || false;
    this.clear = options.clear || false;
    this.popsize = options.popsize || 50;
    this.elitism = options.elitism || 0;
    this.provenance = options.provenance || 0;
    this.mutationRate = options.mutationRate || 0.3;
    this.mutationAmount = options.mutationAmount || 1;

    this.fitnessPopulation = options.fitnessPopulation || false;

    this.selection = options.selection || methods.selection.POWER;
    this.crossover = options.crossover || [
      methods.crossover.SINGLE_POINT,
      methods.crossover.TWO_POINT,
      methods.crossover.UNIFORM,
      methods.crossover.AVERAGE,
    ];
    this.mutation = options.mutation || methods.mutation.FFW;

    this.template = options.network || false;

    this.maxNodes = options.maxNodes || Infinity;
    this.maxConns = options.maxConns || Infinity;
    this.maxGates = options.maxGates || Infinity;

    // Custom mutation selection function if given
    this.selectMutationMethod =
      typeof options.mutationSelection === 'function'
        ? options.mutationSelection.bind(this)
        : this.selectMutationMethod;

    // Generation counter
    this.generation = 0;

    // Initialise the genomes
    this.createPool(this.template);
  }
  /**
   * Create the initial pool of genomes
   */
  createPool(network) {
    this.population = [];

    for (let i = 0; i < this.popsize; i++) {
      let copy;
      if (this.template) {
        copy = Network.fromJSON(network.toJSON());
      } else {
        copy = new Network(this.input, this.output);
      }
      copy.score = undefined;
      this.population.push(copy);
    }
  }

  /**
   * Evaluates, selects, breeds and mutates population
   */
  async evolve() {
    // Check if evaluated, sort the population
    if (
      typeof this.population[this.population.length - 1].score === 'undefined'
    ) {
      await this.evaluate();
    }
    this.sort();

    let fittest = Network.fromJSON(this.population[0].toJSON());
    fittest.score = this.population[0].score;

    let newPopulation = [];

    // Elitism
    let elitists = [];
    for (let i = 0; i < this.elitism; i++) {
      elitists.push(this.population[i]);
    }

    // Provenance
    for (let i = 0; i < this.provenance; i++) {
      newPopulation.push(Network.fromJSON(this.template.toJSON()));
    }

    // Breed the next individuals
    for (let i = 0; i < this.popsize - this.elitism - this.provenance; i++) {
      newPopulation.push(this.getOffspring());
    }

    // Replace the old population with the new population
    this.population = newPopulation;
    this.mutate();

    this.population.push(...elitists);

    // Reset the scores
    for (let i = 0; i < this.population.length; i++) {
      this.population[i].score = undefined;
    }

    this.generation++;

    return fittest;
  }
  /**
   * Breeds two parents into an offspring, population MUST be surted
   */
  getOffspring() {
    let parent1 = this.getParent();
    let parent2 = this.getParent();

    return Network.crossOver(parent1, parent2, this.equal);
  }
  /**
   * Selects a random mutation method for a genome according to the parameters
   */
  selectMutationMethod(genome) {
    let mutationMethod =
      this.mutation[Math.floor(Math.random() * this.mutation.length)];

    if (
      mutationMethod === methods.mutation.ADD_NODE &&
      genome.nodes.length >= this.maxNodes
    ) {
      if (config.warnings) console.warn('maxNodes exceeded!');
      return;
    }

    if (
      mutationMethod === methods.mutation.ADD_CONN &&
      genome.connections.length >= this.maxConns
    ) {
      if (config.warnings) console.warn('maxConns exceeded!');
      return;
    }

    if (
      mutationMethod === methods.mutation.ADD_GATE &&
      genome.gates.length >= this.maxGates
    ) {
      if (config.warnings) console.warn('maxGates exceeded!');
      return;
    }

    return mutationMethod;
  }
  /**
   * Mutates the given (or current) population
   */
  mutate() {
    // Elitist genomes should not be included
    for (let i = 0; i < this.population.length; i++) {
      if (Math.random() <= this.mutationRate) {
        for (let j = 0; j < this.mutationAmount; j++) {
          let mutationMethod = this.selectMutationMethod(this.population[i]);
          this.population[i].mutate(mutationMethod);
        }
      }
    }
  }

  /**
   * Evaluates the current population
   */
  async evaluate() {
    let i;
    if (this.fitnessPopulation) {
      if (this.clear) {
        for (i = 0; i < this.population.length; i++) {
          this.population[i].clear();
        }
      }
      await this.fitness(this.population);
    } else {
      for (i = 0; i < this.population.length; i++) {
        let genome = this.population[i];
        if (this.clear) genome.clear();
        genome.score = await this.fitness(genome);
      }
    }
  }
  /**
   * Sorts the population by score
   */
  sort() {
    this.population.sort(function (a, b) {
      return b.score - a.score;
    });
  }
  /**
   * Returns the fittest genome of the current population
   */
  getFittest() {
    // Check if evaluated
    if (
      typeof this.population[this.population.length - 1].score === 'undefined'
    ) {
      this.evaluate();
    }
    if (this.population[0].score < this.population[1].score) {
      this.sort();
    }

    return this.population[0];
  }
  /**
   * Returns the average fitness of the current population
   */
  getAverage() {
    if (
      typeof this.population[this.population.length - 1].score === 'undefined'
    ) {
      this.evaluate();
    }

    let score = 0;
    for (let i = 0; i < this.population.length; i++) {
      score += this.population[i].score;
    }

    return score / this.population.length;
  }
  /**
   * Gets a genome based on the selection function
   * @return {Network} genome
   */
  getParent() {
    let i;
    switch (this.selection) {
      case selection.POWER: {
        if (this.population[0].score < this.population[1].score) this.sort();

        let index = Math.floor(
          Math.pow(Math.random(), this.selection.power) *
            this.population.length,
        );
        return this.population[index];
      }
      case selection.FITNESS_PROPORTIONATE: // this is unnecessarily run for every individual, should be changed // https://stackoverflow.com/questions/16186686/genetic-algorithm-handling-negative-fitness-values // As negative fitnesses are possible
      {
        let totalFitness = 0;
        let minimalFitness = 0;
        for (i = 0; i < this.population.length; i++) {
          let score = this.population[i].score;
          minimalFitness = score < minimalFitness ? score : minimalFitness;
          totalFitness += score;
        }

        minimalFitness = Math.abs(minimalFitness);
        totalFitness += minimalFitness * this.population.length;

        let random = Math.random() * totalFitness;
        let value = 0;

        for (i = 0; i < this.population.length; i++) {
          let genome = this.population[i];
          value += genome.score + minimalFitness;
          if (random < value) return genome;
        }

        // if all scores equal, return random genome
        return this.population[
          Math.floor(Math.random() * this.population.length)
        ];
      }
      case selection.TOURNAMENT: {
        if (this.selection.size > this.popsize) {
          throw new Error(
            'Your tournament size should be lower than the population size, please change methods.selection.TOURNAMENT.size',
          );
        }

        // Create a tournament
        let individuals = [];
        for (i = 0; i < this.selection.size; i++) {
          let random =
            this.population[Math.floor(Math.random() * this.population.length)];
          individuals.push(random);
        }

        // Sort the tournament individuals by score
        individuals.sort(function (a, b) {
          return b.score - a.score;
        });

        // Select an individual
        for (i = 0; i < this.selection.size; i++) {
          if (
            Math.random() < this.selection.probability ||
            i === this.selection.size - 1
          ) {
            return individuals[i];
          }
        }
      }
    }
  }
  /**
   * Export the current population to a json object
   */
  export() {
    let json = [];
    for (let i = 0; i < this.population.length; i++) {
      let genome = this.population[i];
      json.push(genome.toJSON());
    }

    return json;
  }
  /**
   * Import population from a json object
   */
  import(json) {
    let population = [];
    for (let i = 0; i < json.length; i++) {
      let genome = json[i];
      population.push(Network.fromJSON(genome));
    }
    this.population = population;
    this.popsize = population.length;
  }
}

/* Export */
export default Neat;

```

## File ../lib/neat\neatjs.js:
```javascript
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

```

## File ../lib/neat\architecture\architect.js:
```javascript
/* Import */
import methods from '../methods/methods.js';
import Network from './network.js';
import Group from './group.js';
import Layer from './layer.js';
import Node from './node.js';

let architect = {
  /**
   * Constructs a network from a given array of connected nodes
   */
  Construct: function (list) {
    // Create a network
    let network = new Network(0, 0);

    // Transform all groups into nodes
    let nodes = [];

    let i;
    for (i = 0; i < list.length; i++) {
      let j;
      if (list[i] instanceof Group) {
        for (j = 0; j < list[i].nodes.length; j++) {
          nodes.push(list[i].nodes[j]);
        }
      } else if (list[i] instanceof Layer) {
        for (j = 0; j < list[i].nodes.length; j++) {
          for (let k = 0; k < list[i].nodes[j].nodes.length; k++) {
            nodes.push(list[i].nodes[j].nodes[k]);
          }
        }
      } else if (list[i] instanceof Node) {
        nodes.push(list[i]);
      }
    }

    // Determine input and output nodes
    let inputs = [];
    let outputs = [];
    for (i = nodes.length - 1; i >= 0; i--) {
      if (
        nodes[i].type === 'output' ||
        nodes[i].connections.out.length + nodes[i].connections.gated.length ===
          0
      ) {
        nodes[i].type = 'output';
        network.output++;
        outputs.push(nodes[i]);
        nodes.splice(i, 1);
      } else if (nodes[i].type === 'input' || !nodes[i].connections.in.length) {
        nodes[i].type = 'input';
        network.input++;
        inputs.push(nodes[i]);
        nodes.splice(i, 1);
      }
    }

    // Input nodes are always first, output nodes are always last
    nodes = inputs.concat(nodes).concat(outputs);

    if (network.input === 0 || network.output === 0) {
      throw new Error('Given nodes have no clear input/output node!');
    }

    for (i = 0; i < nodes.length; i++) {
      let j;
      for (j = 0; j < nodes[i].connections.out.length; j++) {
        network.connections.push(nodes[i].connections.out[j]);
      }
      for (j = 0; j < nodes[i].connections.gated.length; j++) {
        network.gates.push(nodes[i].connections.gated[j]);
      }
      if (nodes[i].connections.self.weight !== 0) {
        network.selfconns.push(nodes[i].connections.self);
      }
    }

    network.nodes = nodes;

    return network;
  },

  /**
   * Creates a multilayer perceptron (MLP)
   */
  Perceptron: function () {
    // Convert arguments to Array
    let layers = Array.prototype.slice.call(arguments);
    if (layers.length < 3) {
      throw new Error('You have to specify at least 3 layers');
    }

    // Create a list of nodes/groups
    let nodes = [];
    nodes.push(new Group(layers[0]));

    for (let i = 1; i < layers.length; i++) {
      let layer = layers[i];
      layer = new Group(layer);
      nodes.push(layer);
      nodes[i - 1].connect(nodes[i], methods.connection.ALL_TO_ALL);
    }

    // Construct the network
    return architect.Construct(nodes);
  },

  /**
   * Creates a randomly connected network
   */
  Random: function (input, hidden, output, options) {
    options = options || {};

    let connections = options.connections || hidden * 2;
    let backconnections = options.backconnections || 0;
    let selfconnections = options.selfconnections || 0;
    let gates = options.gates || 0;

    let network = new Network(input, output);

    let i;
    for (i = 0; i < hidden; i++) {
      network.mutate(methods.mutation.ADD_NODE);
    }

    for (i = 0; i < connections - hidden; i++) {
      network.mutate(methods.mutation.ADD_CONN);
    }

    for (i = 0; i < backconnections; i++) {
      network.mutate(methods.mutation.ADD_BACK_CONN);
    }

    for (i = 0; i < selfconnections; i++) {
      network.mutate(methods.mutation.ADD_SELF_CONN);
    }

    for (i = 0; i < gates; i++) {
      network.mutate(methods.mutation.ADD_GATE);
    }

    return network;
  },

  /**
   * Creates a long short-term memory network
   */
  LSTM: function () {
    let args = Array.prototype.slice.call(arguments);
    if (args.length < 3) {
      throw new Error('You have to specify at least 3 layers');
    }

    let last = args.pop();

    let outputLayer;
    if (typeof last === 'number') {
      outputLayer = new Group(last);
      last = {};
    } else {
      outputLayer = new Group(args.pop()); // last argument
    }

    outputLayer.set({
      type: 'output',
    });

    let options = {};
    options.memoryToMemory = last.memoryToMemory || false;
    options.outputToMemory = last.outputToMemory || false;
    options.outputToGates = last.outputToGates || false;
    options.inputToOutput =
      last.inputToOutput === undefined ? true : last.inputToOutput;
    options.inputToDeep =
      last.inputToDeep === undefined ? true : last.inputToDeep;

    let inputLayer = new Group(args.shift()); // first argument
    inputLayer.set({
      type: 'input',
    });

    let blocks = args; // all the arguments in the middle

    let nodes = [];
    nodes.push(inputLayer);

    let previous = inputLayer;
    for (let i = 0; i < blocks.length; i++) {
      let block = blocks[i];

      // Init required nodes (in activation order)
      let inputGate = new Group(block);
      let forgetGate = new Group(block);
      let memoryCell = new Group(block);
      let outputGate = new Group(block);
      let outputBlock =
        i === blocks.length - 1 ? outputLayer : new Group(block);

      inputGate.set({
        bias: 1,
      });
      forgetGate.set({
        bias: 1,
      });
      outputGate.set({
        bias: 1,
      });

      // Connect the input with all the nodes
      let input = previous.connect(memoryCell, methods.connection.ALL_TO_ALL);
      previous.connect(inputGate, methods.connection.ALL_TO_ALL);
      previous.connect(outputGate, methods.connection.ALL_TO_ALL);
      previous.connect(forgetGate, methods.connection.ALL_TO_ALL);

      // Set up internal connections
      memoryCell.connect(inputGate, methods.connection.ALL_TO_ALL);
      memoryCell.connect(forgetGate, methods.connection.ALL_TO_ALL);
      memoryCell.connect(outputGate, methods.connection.ALL_TO_ALL);
      let forget = memoryCell.connect(
        memoryCell,
        methods.connection.ONE_TO_ONE,
      );
      let output = memoryCell.connect(
        outputBlock,
        methods.connection.ALL_TO_ALL,
      );

      // Set up gates
      inputGate.gate(input, methods.gating.INPUT);
      forgetGate.gate(forget, methods.gating.SELF);
      outputGate.gate(output, methods.gating.OUTPUT);

      // Input to all memory cells
      if (options.inputToDeep && i > 0) {
        let input = inputLayer.connect(
          memoryCell,
          methods.connection.ALL_TO_ALL,
        );
        inputGate.gate(input, methods.gating.INPUT);
      }

      // Optional connections
      if (options.memoryToMemory) {
        let input = memoryCell.connect(
          memoryCell,
          methods.connection.ALL_TO_ELSE,
        );
        inputGate.gate(input, methods.gating.INPUT);
      }

      if (options.outputToMemory) {
        let input = outputLayer.connect(
          memoryCell,
          methods.connection.ALL_TO_ALL,
        );
        inputGate.gate(input, methods.gating.INPUT);
      }

      if (options.outputToGates) {
        outputLayer.connect(inputGate, methods.connection.ALL_TO_ALL);
        outputLayer.connect(forgetGate, methods.connection.ALL_TO_ALL);
        outputLayer.connect(outputGate, methods.connection.ALL_TO_ALL);
      }

      // Add to array
      nodes.push(inputGate);
      nodes.push(forgetGate);
      nodes.push(memoryCell);
      nodes.push(outputGate);
      if (i !== blocks.length - 1) nodes.push(outputBlock);

      previous = outputBlock;
    }

    // input to output direct connection
    if (options.inputToOutput) {
      inputLayer.connect(outputLayer, methods.connection.ALL_TO_ALL);
    }

    nodes.push(outputLayer);
    return architect.Construct(nodes);
  },

  /**
   * Creates a gated recurrent unit network
   */
  GRU: function () {
    let args = Array.prototype.slice.call(arguments);
    if (args.length < 3) {
      throw new Error('not enough layers (minimum 3) !!');
    }

    let inputLayer = new Group(args.shift()); // first argument
    let outputLayer = new Group(args.pop()); // last argument
    let blocks = args; // all the arguments in the middle

    let nodes = [];
    nodes.push(inputLayer);

    let previous = inputLayer;
    for (let i = 0; i < blocks.length; i++) {
      let layer = new Layer.GRU(blocks[i]);
      previous.connect(layer);
      previous = layer;

      nodes.push(layer);
    }

    previous.connect(outputLayer);
    nodes.push(outputLayer);

    return architect.Construct(nodes);
  },

  /**
   * Creates a hopfield network of the given size
   */
  Hopfield: function (size) {
    let input = new Group(size);
    let output = new Group(size);

    input.connect(output, methods.connection.ALL_TO_ALL);

    input.set({
      type: 'input',
    });
    output.set({
      squash: methods.activation.STEP,
      type: 'output',
    });

    let network = new architect.Construct([input, output]);

    return network;
  },

  /**
   * Creates a NARX network (remember previous inputs/outputs)
   */
  NARX: function (
    inputSize,
    hiddenLayers,
    outputSize,
    previousInput,
    previousOutput,
  ) {
    if (!Array.isArray(hiddenLayers)) {
      hiddenLayers = [hiddenLayers];
    }

    let nodes = [];

    let input = new Layer.Dense(inputSize);
    let inputMemory = new Layer.Memory(inputSize, previousInput);
    let hidden = [];
    let output = new Layer.Dense(outputSize);
    let outputMemory = new Layer.Memory(outputSize, previousOutput);

    nodes.push(input);
    nodes.push(outputMemory);

    for (let i = 0; i < hiddenLayers.length; i++) {
      let hiddenLayer = new Layer.Dense(hiddenLayers[i]);
      hidden.push(hiddenLayer);
      nodes.push(hiddenLayer);
      if (typeof hidden[i - 1] !== 'undefined') {
        hidden[i - 1].connect(hiddenLayer, methods.connection.ALL_TO_ALL);
      }
    }

    nodes.push(inputMemory);
    nodes.push(output);

    input.connect(hidden[0], methods.connection.ALL_TO_ALL);
    input.connect(inputMemory, methods.connection.ONE_TO_ONE, 1);
    inputMemory.connect(hidden[0], methods.connection.ALL_TO_ALL);
    hidden[hidden.length - 1].connect(output, methods.connection.ALL_TO_ALL);
    output.connect(outputMemory, methods.connection.ONE_TO_ONE, 1);
    outputMemory.connect(hidden[0], methods.connection.ALL_TO_ALL);

    input.set({
      type: 'input',
    });
    output.set({
      type: 'output',
    });

    return architect.Construct(nodes);
  },
};

export default architect;

```

## File ../lib/neat\architecture\connection.js:
```javascript
class Connection {
  constructor(from, to, weight) {
    this.from = from;
    this.to = to;
    this.gain = 1;

    this.weight =
      typeof weight === 'undefined' ? Math.random() * 0.2 - 0.1 : weight;

    this.gater = null;
    this.elegibility = 0;

    // For tracking momentum
    this.previousDeltaWeight = 0;

    // Batch training
    this.totalDeltaWeight = 0;

    this.xtrace = {
      nodes: [],
      values: [],
    };
  }
  /**
   * Converts the connection to a json object
   */
  toJSON() {
    let json = {
      weight: this.weight,
    };

    return json;
  }
  /**
   * Returns an innovation ID
   * https://en.wikipedia.org/wiki/Pairing_function (Cantor pairing function)
   */
  static innovationID(a, b) {
    return (1 / 2) * (a + b) * (a + b + 1) + b;
  }
}

/* Export */
export default Connection;

```

## File ../lib/neat\architecture\group.js:
```javascript
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

```

## File ../lib/neat\architecture\layer.js:
```javascript
/* Import */
import methods from '../methods/methods.js';
import Group from './group.js';
import Node from './node.js';

class Layer {
  constructor() {
    this.output = null;

    this.nodes = [];
    this.connections = {
      in: [],
      out: [],
      self: [],
    };
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
    let connections;
    if (target instanceof Group || target instanceof Node) {
      connections = this.output.connect(target, method, weight);
    } else if (target instanceof Layer) {
      connections = target.input(this, method, weight);
    }

    return connections;
  }
  /**
   * Make nodes from this group gate the given connection(s)
   */
  gate(connections, method) {
    this.output.gate(connections, method);
  }
  /**
   * Sets the value of a property for every node
   */
  set(values) {
    for (let i = 0; i < this.nodes.length; i++) {
      let node = this.nodes[i];

      if (node instanceof Node) {
        if (typeof values.bias !== 'undefined') {
          node.bias = values.bias;
        }

        node.squash = values.squash || node.squash;
        node.type = values.type || node.type;
      } else if (node instanceof Group) {
        node.set(values);
      }
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
          for (k = this.connections.in.length - 1; k >= 0; k--) {
            let conn = this.connections.in[k];

            if (conn.from === target && conn.to === this.nodes[i]) {
              this.connections.in.splice(k, 1);
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
  static Dense(size) {
    // Create the layer
    let layer = new Layer();

    // Init required nodes (in activation order)
    let block = new Group(size);

    layer.nodes.push(block);
    layer.output = block;

    layer.input = function (from, method, weight) {
      if (from instanceof Layer) from = from.output;
      method = method || methods.connection.ALL_TO_ALL;
      return from.connect(block, method, weight);
    };

    return layer;
  }
  static LSTM(size) {
    // Create the layer
    let layer = new Layer();

    // Init required nodes (in activation order)
    let inputGate = new Group(size);
    let forgetGate = new Group(size);
    let memoryCell = new Group(size);
    let outputGate = new Group(size);
    let outputBlock = new Group(size);

    inputGate.set({
      bias: 1,
    });
    forgetGate.set({
      bias: 1,
    });
    outputGate.set({
      bias: 1,
    });

    // Set up internal connections
    memoryCell.connect(inputGate, methods.connection.ALL_TO_ALL);
    memoryCell.connect(forgetGate, methods.connection.ALL_TO_ALL);
    memoryCell.connect(outputGate, methods.connection.ALL_TO_ALL);
    let forget = memoryCell.connect(memoryCell, methods.connection.ONE_TO_ONE);
    let output = memoryCell.connect(outputBlock, methods.connection.ALL_TO_ALL);

    // Set up gates
    forgetGate.gate(forget, methods.gating.SELF);
    outputGate.gate(output, methods.gating.OUTPUT);

    // Add to nodes array
    layer.nodes = [inputGate, forgetGate, memoryCell, outputGate, outputBlock];

    // Define output
    layer.output = outputBlock;

    layer.input = function (from, method, weight) {
      if (from instanceof Layer) from = from.output;
      method = method || methods.connection.ALL_TO_ALL;
      let connections = [];

      let input = from.connect(memoryCell, method, weight);
      connections = connections.concat(input);

      connections = connections.concat(from.connect(inputGate, method, weight));
      connections = connections.concat(
        from.connect(outputGate, method, weight),
      );
      connections = connections.concat(
        from.connect(forgetGate, method, weight),
      );

      inputGate.gate(input, methods.gating.INPUT);

      return connections;
    };

    return layer;
  }
  static GRU(size) {
    // Create the layer
    let layer = new Layer();

    let updateGate = new Group(size);
    let inverseUpdateGate = new Group(size);
    let resetGate = new Group(size);
    let memoryCell = new Group(size);
    let output = new Group(size);
    let previousOutput = new Group(size);

    previousOutput.set({
      bias: 0,
      squash: methods.activation.IDENTITY,
      type: 'constant',
    });
    memoryCell.set({
      squash: methods.activation.TANH,
    });
    inverseUpdateGate.set({
      bias: 0,
      squash: methods.activation.INVERSE,
      type: 'constant',
    });
    updateGate.set({
      bias: 1,
    });
    resetGate.set({
      bias: 0,
    });

    // Update gate calculation
    previousOutput.connect(updateGate, methods.connection.ALL_TO_ALL);

    // Inverse update gate calculation
    updateGate.connect(inverseUpdateGate, methods.connection.ONE_TO_ONE, 1);

    // Reset gate calculation
    previousOutput.connect(resetGate, methods.connection.ALL_TO_ALL);

    // Memory calculation
    let reset = previousOutput.connect(
      memoryCell,
      methods.connection.ALL_TO_ALL,
    );

    resetGate.gate(reset, methods.gating.OUTPUT); // gate

    // Output calculation
    let update1 = previousOutput.connect(output, methods.connection.ALL_TO_ALL);
    let update2 = memoryCell.connect(output, methods.connection.ALL_TO_ALL);

    updateGate.gate(update1, methods.gating.OUTPUT);
    inverseUpdateGate.gate(update2, methods.gating.OUTPUT);

    // Previous output calculation
    output.connect(previousOutput, methods.connection.ONE_TO_ONE, 1);

    // Add to nodes array
    layer.nodes = [
      updateGate,
      inverseUpdateGate,
      resetGate,
      memoryCell,
      output,
      previousOutput,
    ];

    layer.output = output;

    layer.input = function (from, method, weight) {
      if (from instanceof Layer) from = from.output;
      method = method || methods.connection.ALL_TO_ALL;
      let connections = [];

      connections = connections.concat(
        from.connect(updateGate, method, weight),
      );
      connections = connections.concat(from.connect(resetGate, method, weight));
      connections = connections.concat(
        from.connect(memoryCell, method, weight),
      );

      return connections;
    };

    return layer;
  }
  static Memory(size, memory) {
    // Create the layer
    let layer = new Layer();
    // Because the output can only be one group, we have to put the nodes all in óne group
    let previous = null;
    let i;
    for (i = 0; i < memory; i++) {
      let block = new Group(size);

      block.set({
        squash: methods.activation.IDENTITY,
        bias: 0,
        type: 'constant',
      });

      if (previous != null) {
        previous.connect(block, methods.connection.ONE_TO_ONE, 1);
      }

      layer.nodes.push(block);
      previous = block;
    }

    layer.nodes.reverse();

    for (i = 0; i < layer.nodes.length; i++) {
      layer.nodes[i].nodes.reverse();
    }

    // Because output can only be óne group, fit all memory nodes in óne group
    let outputGroup = new Group(0);
    for (let group in layer.nodes) {
      outputGroup.nodes = outputGroup.nodes.concat(layer.nodes[group].nodes);
    }
    layer.output = outputGroup;

    layer.input = function (from) {
      if (from instanceof Layer) from = from.output;
      // method = method || methods.connection.ALL_TO_ALL;
      if (
        from.nodes.length !== layer.nodes[layer.nodes.length - 1].nodes.length
      ) {
        throw new Error('Previous layer size must be same as memory size');
      }

      return from.connect(
        layer.nodes[layer.nodes.length - 1],
        methods.connection.ONE_TO_ONE,
        1,
      );
    };

    return layer;
  }
}

/* Export */
export default Layer;

```

## File ../lib/neat\architecture\network.js:
```javascript
/* Import */
import multi from '../multithreading/multi.js';
import methods from '../methods/methods.js';
import Connection from './connection.js';
import config from '../config.js';
import Neat from '../neat.js';
import Node from './node.js';

/* Easier variable naming */
let mutation = methods.mutation;

class Network {
  constructor(input, output) {
    if (typeof input === 'undefined' || typeof output === 'undefined') {
      throw new Error('No input or output size given');
    }

    this.input = input;
    this.output = output;

    // Store all the node and connection genes
    this.nodes = []; // Stored in activation order
    this.connections = [];
    this.gates = [];
    this.selfconns = [];

    // Regularization
    this.dropout = 0;

    // Create input and output nodes
    let i;
    for (i = 0; i < this.input + this.output; i++) {
      let type = i < this.input ? 'input' : 'output';
      this.nodes.push(new Node(type));
    }

    // Connect input nodes with output nodes directly
    for (let i = 0; i < this.input; i++) {
      for (let j = this.input; j < this.output + this.input; j++) {
        // https://stats.stackexchange.com/a/248040/147931
        let weight = Math.random() * this.input * Math.sqrt(2 / this.input);
        this.connect(this.nodes[i], this.nodes[j], weight);
      }
    }
  }
  /**
   * Activates the network
   */
  activate(input, training) {
    let output = [];

    // Activate nodes chronologically
    for (let i = 0; i < this.nodes.length; i++) {
      if (this.nodes[i].type === 'input') {
        this.nodes[i].activate(input[i]);
      } else if (this.nodes[i].type === 'output') {
        let activation = this.nodes[i].activate();
        output.push(activation);
      } else {
        if (training) this.nodes[i].mask = Math.random() < this.dropout ? 0 : 1;
        this.nodes[i].activate();
      }
    }

    return output;
  }
  /**
   * Activates the network without calculating elegibility traces and such
   */
  noTraceActivate(input) {
    let output = [];

    // Activate nodes chronologically
    for (let i = 0; i < this.nodes.length; i++) {
      if (this.nodes[i].type === 'input') {
        this.nodes[i].noTraceActivate(input[i]);
      } else if (this.nodes[i].type === 'output') {
        let activation = this.nodes[i].noTraceActivate();
        output.push(activation);
      } else {
        this.nodes[i].noTraceActivate();
      }
    }

    return output;
  }
  /**
   * Backpropagate the network
   */
  propagate(rate, momentum, update, target) {
    if (typeof target === 'undefined' || target.length !== this.output) {
      throw new Error(
        'Output target length should match network output length',
      );
    }

    let targetIndex = target.length;

    // Propagate output nodes
    let i;
    for (i = this.nodes.length - 1; i >= this.nodes.length - this.output; i--) {
      this.nodes[i].propagate(rate, momentum, update, target[--targetIndex]);
    }

    // Propagate hidden and input nodes
    for (let i = this.nodes.length - this.output - 1; i >= this.input; i--) {
      this.nodes[i].propagate(rate, momentum, update);
    }
  }
  /**
   * Clear the context of the network
   */
  clear() {
    for (let i = 0; i < this.nodes.length; i++) {
      this.nodes[i].clear();
    }
  }
  /**
   * Connects the from node to the to node
   */
  connect(from, to, weight) {
    let connections = from.connect(to, weight);

    for (let i = 0; i < connections.length; i++) {
      let connection = connections[i];
      if (from !== to) {
        this.connections.push(connection);
      } else {
        this.selfconns.push(connection);
      }
    }

    return connections;
  }
  /**
   * Disconnects the from node from the to node
   */
  disconnect(from, to) {
    // Delete the connection in the network's connection array
    let connections = from === to ? this.selfconns : this.connections;

    for (let i = 0; i < connections.length; i++) {
      let connection = connections[i];
      if (connection.from === from && connection.to === to) {
        if (connection.gater !== null) this.ungate(connection);
        connections.splice(i, 1);
        break;
      }
    }

    // Delete the connection at the sending and receiving neuron
    from.disconnect(to);
  }
  /**
   * Gate a connection with a node
   */
  gate(node, connection) {
    if (this.nodes.indexOf(node) === -1) {
      throw new Error('This node is not part of the network!');
    } else if (connection.gater != null) {
      if (config.warnings) console.warn('This connection is already gated!');
      return;
    }
    node.gate(connection);
    this.gates.push(connection);
  }
  /**
   *  Remove the gate of a connection
   */
  ungate(connection) {
    let index = this.gates.indexOf(connection);
    if (index === -1) {
      throw new Error('This connection is not gated!');
    }

    this.gates.splice(index, 1);
    connection.gater.ungate(connection);
  }
  /**
   *  Removes a node from the network
   */
  remove(node) {
    let index = this.nodes.indexOf(node);

    if (index === -1) {
      throw new Error('This node does not exist in the network!');
    }

    // Keep track of gaters
    let gaters = [];

    // Remove selfconnections from this.selfconns
    this.disconnect(node, node);

    // Get all its inputting nodes
    let inputs = [];
    for (let i = node.connections.in.length - 1; i >= 0; i--) {
      let connection = node.connections.in[i];
      if (
        mutation.SUB_NODE.keep_gates &&
        connection.gater !== null &&
        connection.gater !== node
      ) {
        gaters.push(connection.gater);
      }
      inputs.push(connection.from);
      this.disconnect(connection.from, node);
    }

    // Get all its outputing nodes
    let outputs = [];
    for (let i = node.connections.out.length - 1; i >= 0; i--) {
      let connection = node.connections.out[i];
      if (
        mutation.SUB_NODE.keep_gates &&
        connection.gater !== null &&
        connection.gater !== node
      ) {
        gaters.push(connection.gater);
      }
      outputs.push(connection.to);
      this.disconnect(node, connection.to);
    }

    // Connect the input nodes to the output nodes (if not already connected)
    let connections = [];
    for (let i = 0; i < inputs.length; i++) {
      let input = inputs[i];
      for (let j = 0; j < outputs.length; j++) {
        let output = outputs[j];
        if (!input.isProjectingTo(output)) {
          let conn = this.connect(input, output);
          connections.push(conn[0]);
        }
      }
    }

    // Gate random connections with gaters
    for (let i = 0; i < gaters.length; i++) {
      if (connections.length === 0) break;

      let gater = gaters[i];
      let connIndex = Math.floor(Math.random() * connections.length);

      this.gate(gater, connections[connIndex]);
      connections.splice(connIndex, 1);
    }

    // Remove gated connections gated by this node
    for (let i = node.connections.gated.length - 1; i >= 0; i--) {
      let conn = node.connections.gated[i];
      this.ungate(conn);
    }

    // Remove selfconnection
    this.disconnect(node, node);

    // Remove the node from this.nodes
    this.nodes.splice(index, 1);
  }
  /**
   * Mutates the network with the given method
   */
  mutate(method) {
    if (typeof method === 'undefined') {
      throw new Error('No (correct) mutate method given!');
    }

    let i, j;
    switch (method) {
      case mutation.ADD_NODE: // Look for an existing connection and place a node in between
      {
        const connection =
          this.connections[Math.floor(Math.random() * this.connections.length)];
        const gater = connection.gater;
        this.disconnect(connection.from, connection.to);

        // Insert the new node right before the old connection.to
        const toIndex = this.nodes.indexOf(connection.to);
        const node = new Node('hidden');

        // Random squash function
        node.mutate(mutation.MOD_ACTIVATION);

        // Place it in this.nodes
        const minBound = Math.min(toIndex, this.nodes.length - this.output);
        this.nodes.splice(minBound, 0, node);

        // Now create two new connections
        const newConn1 = this.connect(connection.from, node)[0];
        const newConn2 = this.connect(node, connection.to)[0];

        // Check if the original connection was gated
        if (gater != null) {
          this.gate(gater, Math.random() >= 0.5 ? newConn1 : newConn2);
        }
        break;
      }

      case mutation.SUB_NODE: // Check if there are nodes left to remove
      {
        if (this.nodes.length === this.input + this.output) {
          if (config.warnings) console.warn('No more nodes left to remove!');
          break;
        }

        // Select a node which isn't an input or output node
        const index = Math.floor(
          Math.random() * (this.nodes.length - this.output - this.input) +
            this.input,
        );
        this.remove(this.nodes[index]);
        break;
      }

      case mutation.ADD_CONN: // Create an array of all uncreated (feedforward) connections
      {
        const available = [];
        for (i = 0; i < this.nodes.length - this.output; i++) {
          let node1 = this.nodes[i];
          for (j = Math.max(i + 1, this.input); j < this.nodes.length; j++) {
            let node2 = this.nodes[j];
            if (!node1.isProjectingTo(node2)) available.push([node1, node2]);
          }
        }

        if (available.length === 0) {
          if (config.warnings) console.warn('No more connections to be made!');
          break;
        }

        const pair = available[Math.floor(Math.random() * available.length)];
        this.connect(pair[0], pair[1]);
        break;
      }

      case mutation.SUB_CONN: // List of possible connections that can be removed
      {
        const possible = [];

        for (i = 0; i < this.connections.length; i++) {
          let conn = this.connections[i];
          // Check if it is not disabling a node
          if (
            conn.from.connections.out.length > 1 &&
            conn.to.connections.in.length > 1 &&
            this.nodes.indexOf(conn.to) > this.nodes.indexOf(conn.from)
          ) {
            possible.push(conn);
          }
        }

        if (possible.length === 0) {
          if (config.warnings) console.warn('No connections to remove!');
          break;
        }

        const randomConn =
          possible[Math.floor(Math.random() * possible.length)];
        this.disconnect(randomConn.from, randomConn.to);
        break;
      }

      case mutation.MOD_WEIGHT: {
        const allConnections = this.connections.concat(this.selfconns);
        const selectedConnection =
          allConnections[Math.floor(Math.random() * allConnections.length)];
        const modification =
          Math.random() * (method.max - method.min) + method.min;
        selectedConnection.weight += modification;
        break;
      }

      case mutation.MOD_BIAS: // Has no effect on input node, so they are excluded
      {
        const biasIndex = Math.floor(
          Math.random() * (this.nodes.length - this.input) + this.input,
        );
        const biasNode = this.nodes[biasIndex];
        biasNode.mutate(method);
        break;
      }

      case mutation.MOD_ACTIVATION: // Has no effect on input node, so they are excluded
      {
        if (
          !method.mutateOutput &&
          this.input + this.output === this.nodes.length
        ) {
          if (config.warnings)
            console.warn('No nodes that allow mutation of activation function');
          break;
        }

        const activationIndex = Math.floor(
          Math.random() *
            (this.nodes.length -
              (method.mutateOutput ? 0 : this.output) -
              this.input) +
            this.input,
        );
        const activationNode = this.nodes[activationIndex];
        activationNode.mutate(method);
        break;
      }

      case mutation.ADD_SELF_CONN: // Check which nodes aren't selfconnected yet
      {
        const selfPossible = [];
        for (i = this.input; i < this.nodes.length; i++) {
          let node = this.nodes[i];
          if (node.connections.self.weight === 0) {
            selfPossible.push(node);
          }
        }

        if (selfPossible.length === 0) {
          if (config.warnings) console.warn('No more self-connections to add!');
          break;
        }

        // Select a random node
        const selfNode =
          selfPossible[Math.floor(Math.random() * selfPossible.length)];

        // Connect it to itself
        this.connect(selfNode, selfNode);
        break;
      }

      case mutation.SUB_SELF_CONN: {
        if (this.selfconns.length === 0) {
          if (config.warnings)
            console.warn('No more self-connections to remove!');
          break;
        }
        const selfConn =
          this.selfconns[Math.floor(Math.random() * this.selfconns.length)];
        this.disconnect(selfConn.from, selfConn.to);
        break;
      }

      case mutation.ADD_GATE: {
        const allConns = this.connections.concat(this.selfconns);

        // Create a list of all non-gated connections
        const gatePossible = [];
        for (i = 0; i < allConns.length; i++) {
          let conn = allConns[i];
          if (conn.gater === null) {
            gatePossible.push(conn);
          }
        }

        if (gatePossible.length === 0) {
          if (config.warnings) console.warn('No more connections to gate!');
          break;
        }

        // Select a random gater node and connection, can't be gated by input
        const gateIndex = Math.floor(
          Math.random() * (this.nodes.length - this.input) + this.input,
        );
        const gateNode = this.nodes[gateIndex];
        const gateConn =
          gatePossible[Math.floor(Math.random() * gatePossible.length)];

        // Gate the connection with the node
        this.gate(gateNode, gateConn);
        break;
      }

      case mutation.SUB_GATE: // Select a random gated connection
      {
        if (this.gates.length === 0) {
          if (config.warnings) console.warn('No more connections to ungate!');
          break;
        }

        const ungateIndex = Math.floor(Math.random() * this.gates.length);
        const gatedConn = this.gates[ungateIndex];

        this.ungate(gatedConn);
        break;
      }

      case mutation.ADD_BACK_CONN: // Create an array of all uncreated (backfed) connections
      {
        const backAvailable = [];
        for (i = this.input; i < this.nodes.length; i++) {
          let node1 = this.nodes[i];
          for (j = this.input; j < i; j++) {
            let node2 = this.nodes[j];
            if (!node1.isProjectingTo(node2))
              backAvailable.push([node1, node2]);
          }
        }

        if (backAvailable.length === 0) {
          if (config.warnings) console.warn('No more connections to be made!');
          break;
        }

        const backPair =
          backAvailable[Math.floor(Math.random() * backAvailable.length)];
        this.connect(backPair[0], backPair[1]);
        break;
      }

      case mutation.SUB_BACK_CONN: // List of possible connections that can be removed
      {
        const backPossible = [];

        for (i = 0; i < this.connections.length; i++) {
          let conn = this.connections[i];
          // Check if it is not disabling a node
          if (
            conn.from.connections.out.length > 1 &&
            conn.to.connections.in.length > 1 &&
            this.nodes.indexOf(conn.from) > this.nodes.indexOf(conn.to)
          ) {
            backPossible.push(conn);
          }
        }

        if (backPossible.length === 0) {
          if (config.warnings) console.warn('No connections to remove!');
          break;
        }

        const randomBackConn =
          backPossible[Math.floor(Math.random() * backPossible.length)];
        this.disconnect(randomBackConn.from, randomBackConn.to);
        break;
      }

      case mutation.SWAP_NODES: // Has no effect on input node, so they are excluded
      {
        if (
          (method.mutateOutput && this.nodes.length - this.input < 2) ||
          (!method.mutateOutput &&
            this.nodes.length - this.input - this.output < 2)
        ) {
          if (config.warnings)
            console.warn(
              'No nodes that allow swapping of bias and activation function',
            );
          break;
        }

        const swapIndex1 = Math.floor(
          Math.random() *
            (this.nodes.length -
              (method.mutateOutput ? 0 : this.output) -
              this.input) +
            this.input,
        );
        const node1 = this.nodes[swapIndex1];
        const swapIndex2 = Math.floor(
          Math.random() *
            (this.nodes.length -
              (method.mutateOutput ? 0 : this.output) -
              this.input) +
            this.input,
        );
        const node2 = this.nodes[swapIndex2];

        // Swap biases and squash functions
        [node1.bias, node2.bias] = [node2.bias, node1.bias];
        [node1.squash, node2.squash] = [node2.squash, node1.squash];
        break;
      }
    }
  }

  /**
   * Train the given set to this network
   */
  train(set, options = {}) {
    if (
      set[0].input.length !== this.input ||
      set[0].output.length !== this.output
    ) {
      throw new Error(
        'Dataset input/output size should be same as network input/output size!',
      );
    }

    // Cảnh báo nếu thiếu các tùy chọn quan trọng
    if (typeof options.rate === 'undefined' && config.warnings) {
      console.warn('Using default learning rate, please define a rate!');
    }
    if (typeof options.iterations === 'undefined' && config.warnings) {
      console.warn(
        'No target iterations given, running until error is reached!',
      );
    }

    // Đọc các tùy chọn từ `options`
    const targetError = options.error || 0.05;
    const cost = options.cost || methods.cost.MSE;
    const baseRate = options.rate || 0.3;
    const dropout = options.dropout || 0;
    const momentum = options.momentum || 0;
    const batchSize = options.batchSize || 1; // online learning
    const ratePolicy = options.ratePolicy || methods.rate.FIXED();
    const start = Date.now();

    if (batchSize > set.length) {
      throw new Error('Batch size must be smaller or equal to dataset length!');
    } else if (
      typeof options.iterations === 'undefined' &&
      typeof options.error === 'undefined'
    ) {
      throw new Error(
        'At least one of the following options must be specified: error, iterations',
      );
    } else if (typeof options.error === 'undefined') {
      options.error = -1; // run until iterations
    } else if (typeof options.iterations === 'undefined') {
      options.iterations = 0; // run until target error
    }

    // Lưu dropout vào network
    this.dropout = dropout;

    let trainSet, testSet;
    if (options.crossValidate) {
      const numTrain = Math.ceil(
        (1 - options.crossValidate.testSize) * set.length,
      );
      trainSet = set.slice(0, numTrain);
      testSet = set.slice(numTrain);
    }

    // Khởi tạo các biến cho quá trình huấn luyện
    let currentRate = baseRate;
    let iteration = 0;
    let error = 1;

    // Vòng lặp huấn luyện
    while (
      error > targetError &&
      (options.iterations === 0 || iteration < options.iterations)
    ) {
      if (options.crossValidate && error <= options.crossValidate.testError)
        break;

      iteration++;

      // Cập nhật tỷ lệ học
      currentRate = ratePolicy(baseRate, iteration);

      // Kiểm tra cross-validation
      if (options.crossValidate) {
        this._trainSet(trainSet, batchSize, currentRate, momentum, cost);
        if (options.clear) this.clear();
        error = this.test(testSet, cost).error;
        if (options.clear) this.clear();
      } else {
        error = this._trainSet(set, batchSize, currentRate, momentum, cost);
        if (options.clear) this.clear();
      }

      // Kiểm tra các tùy chọn như log và shuffle
      if (options.shuffle) {
        for (let i = set.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [set[i], set[j]] = [set[j], set[i]];
        }
      }

      if (options.log && iteration % options.log === 0) {
        console.log(
          'iteration',
          iteration,
          'error',
          error,
          'rate',
          currentRate,
        );
      }

      if (options.schedule && iteration % options.schedule.iterations === 0) {
        options.schedule.function({ error, iteration });
      }
    }

    if (options.clear) this.clear();

    if (dropout) {
      for (let i = 0; i < this.nodes.length; i++) {
        if (
          this.nodes[i].type === 'hidden' ||
          this.nodes[i].type === 'constant'
        ) {
          this.nodes[i].mask = 1 - this.dropout;
        }
      }
    }

    return {
      error,
      iterations: iteration,
      time: Date.now() - start,
    };
  }

  /**
   * Performs one training epoch and returns the error
   * private function used in this.train
   */
  _trainSet(set, batchSize, currentRate, momentum, costFunction) {
    let errorSum = 0;
    for (let i = 0; i < set.length; i++) {
      let input = set[i].input;
      let target = set[i].output;

      let update = !!((i + 1) % batchSize === 0 || i + 1 === set.length);

      let output = this.activate(input, true);
      this.propagate(currentRate, momentum, update, target);

      errorSum += costFunction(target, output);
    }
    return errorSum / set.length;
  }
  /**
   * Tests a set and returns the error and elapsed time
   */
  test(set, cost = methods.cost.MSE) {
    // Check if dropout is enabled, set correct mask
    let i;
    if (this.dropout) {
      for (i = 0; i < this.nodes.length; i++) {
        if (
          this.nodes[i].type === 'hidden' ||
          this.nodes[i].type === 'constant'
        ) {
          this.nodes[i].mask = 1 - this.dropout;
        }
      }
    }

    let error = 0;
    let start = Date.now();

    for (let i = 0; i < set.length; i++) {
      let input = set[i].input;
      let target = set[i].output;
      let output = this.noTraceActivate(input);
      error += cost(target, output);
    }

    error /= set.length;

    let results = {
      error: error,
      time: Date.now() - start,
    };

    return results;
  }
  /**
   * Creates a json that can be used to create a graph with d3 and webcola
   */
  graph(width, height) {
    let input = 0;
    let output = 0;

    let json = {
      nodes: [],
      links: [],
      constraints: [
        {
          type: 'alignment',
          axis: 'x',
          offsets: [],
        },
        {
          type: 'alignment',
          axis: 'y',
          offsets: [],
        },
      ],
    };

    let i;
    for (i = 0; i < this.nodes.length; i++) {
      let node = this.nodes[i];

      if (node.type === 'input') {
        if (this.input === 1) {
          json.constraints[0].offsets.push({
            node: i,
            offset: 0,
          });
        } else {
          json.constraints[0].offsets.push({
            node: i,
            offset: ((0.8 * width) / (this.input - 1)) * input++,
          });
        }
        json.constraints[1].offsets.push({
          node: i,
          offset: 0,
        });
      } else if (node.type === 'output') {
        if (this.output === 1) {
          json.constraints[0].offsets.push({
            node: i,
            offset: 0,
          });
        } else {
          json.constraints[0].offsets.push({
            node: i,
            offset: ((0.8 * width) / (this.output - 1)) * output++,
          });
        }
        json.constraints[1].offsets.push({
          node: i,
          offset: -0.8 * height,
        });
      }

      json.nodes.push({
        id: i,
        name:
          node.type === 'hidden' ? node.squash.name : node.type.toUpperCase(),
        activation: node.activation,
        bias: node.bias,
      });
    }

    let connections = this.connections.concat(this.selfconns);
    for (let i = 0; i < connections.length; i++) {
      let connection = connections[i];
      if (connection.gater == null) {
        json.links.push({
          source: this.nodes.indexOf(connection.from),
          target: this.nodes.indexOf(connection.to),
          weight: connection.weight,
        });
      } else {
        // Add a gater 'node'
        let index = json.nodes.length;
        json.nodes.push({
          id: index,
          activation: connection.gater.activation,
          name: 'GATE',
        });
        json.links.push({
          source: this.nodes.indexOf(connection.from),
          target: index,
          weight: (1 / 2) * connection.weight,
        });
        json.links.push({
          source: index,
          target: this.nodes.indexOf(connection.to),
          weight: (1 / 2) * connection.weight,
        });
        json.links.push({
          source: this.nodes.indexOf(connection.gater),
          target: index,
          weight: connection.gater.activation,
          gate: true,
        });
      }
    }

    return json;
  }
  /**
   * Convert the network to a json object
   */
  toJSON() {
    let json = {
      nodes: [],
      connections: [],
      input: this.input,
      output: this.output,
      dropout: this.dropout,
    };

    // So we don't have to use expensive .indexOf()
    let i;
    for (i = 0; i < this.nodes.length; i++) {
      this.nodes[i].index = i;
    }

    for (let i = 0; i < this.nodes.length; i++) {
      let node = this.nodes[i];
      let tojson = node.toJSON();
      tojson.index = i;
      json.nodes.push(tojson);

      if (node.connections.self.weight !== 0) {
        let tojson = node.connections.self.toJSON();
        tojson.from = i;
        tojson.to = i;

        tojson.gater =
          node.connections.self.gater != null
            ? node.connections.self.gater.index
            : null;
        json.connections.push(tojson);
      }
    }

    for (let i = 0; i < this.connections.length; i++) {
      let conn = this.connections[i];
      let tojson = conn.toJSON();
      tojson.from = conn.from.index;
      tojson.to = conn.to.index;

      tojson.gater = conn.gater != null ? conn.gater.index : null;

      json.connections.push(tojson);
    }

    return json;
  }
  /**
   * Sets the value of a property for every node in this network
   */
  set(values) {
    for (let i = 0; i < this.nodes.length; i++) {
      this.nodes[i].bias = values.bias || this.nodes[i].bias;
      this.nodes[i].squash = values.squash || this.nodes[i].squash;
    }
  }

  /**
   * Evolves the network to reach a lower error on a dataset
   */
  async evolve(set, options = {}) {
    if (
      set[0].input.length !== this.input ||
      set[0].output.length !== this.output
    ) {
      throw new Error(
        'Dataset input/output size should be same as network input/output size!',
      );
    }

    // Đọc các tùy chọn từ `options`
    let targetError = options.error ?? 0.05;
    const growth = options.growth ?? 0.0001;
    const cost = options.cost || methods.cost.MSE;
    const amount = options.amount || 1;

    let threads = options.threads;
    if (typeof threads === 'undefined') {
      if (typeof window === 'undefined') {
        // Node.js
        // threads = require('os').cpus().length;
      } else {
        // Browser
        threads = navigator.hardwareConcurrency;
      }
    }

    const start = Date.now();
    let workers = [];
    if (options.iterations === undefined && options.error === undefined) {
      throw new Error(
        'At least one of the following options must be specified: error, iterations',
      );
    } else if (options.error === undefined) {
      targetError = -1; // run until iterations
    } else if (options.iterations === undefined) {
      options.iterations = 0; // run until target error
    }

    let fitnessFunction;

    if (threads === 1) {
      // Tạo hàm tính fitness
      fitnessFunction = (genome) => {
        let score = 0;
        for (let i = 0; i < amount; i++) {
          score -= genome.test(set, cost).error;
        }

        score -=
          (genome.nodes.length -
            genome.input -
            genome.output +
            genome.connections.length +
            genome.gates.length) *
          growth;
        return isNaN(score) ? -Infinity : score / amount;
      };
    } else {
      // Chuẩn bị cho nhiều luồng (multithreading)
      const converted = multi.serializeDataSet(set);

      // Create workers, send datasets
      // let workers = [];
      if (typeof window === 'undefined') {
        for (let i = 0; i < threads; i++) {
          workers.push(new multi.workers.node.TestWorker(converted, cost));
        }
      } else {
        for (let i = 0; i < threads; i++) {
          workers.push(new multi.workers.browser.TestWorker(converted, cost));
        }
      }

      fitnessFunction = (population) =>
        new Promise((resolve) => {
          const queue = population.slice();
          let done = 0;

          const startWorker = (worker) => {
            if (!queue.length) {
              if (++done === threads) resolve();
              return;
            }

            const genome = queue.shift();
            worker.evaluate(genome).then((result) => {
              genome.score = -result;
              genome.score -=
                (genome.nodes.length -
                  genome.input -
                  genome.output +
                  genome.connections.length +
                  genome.gates.length) *
                growth;
              genome.score = isNaN(result) ? -Infinity : genome.score;
              startWorker(worker);
            });
          };

          workers.forEach((worker) => startWorker(worker));
        });

      options.fitnessPopulation = true;
    }

    // Khởi tạo một instance của NEAT
    options.network = this;
    const neat = new Neat(this.input, this.output, fitnessFunction, options);

    let error = -Infinity;
    let bestFitness = -Infinity;
    let bestGenome;

    while (
      error < -targetError &&
      (options.iterations === 0 || neat.generation < options.iterations)
    ) {
      const fittest = await neat.evolve();
      const fitness = fittest.score;
      error =
        fitness +
        (fittest.nodes.length -
          fittest.input -
          fittest.output +
          fittest.connections.length +
          fittest.gates.length) *
          growth;

      if (fitness > bestFitness) {
        bestFitness = fitness;
        bestGenome = fittest;
      }

      if (options.log && neat.generation % options.log === 0) {
        console.log(
          'iteration',
          neat.generation,
          'fitness',
          fitness,
          'error',
          -error,
        );
      }

      if (
        options.schedule &&
        neat.generation % options.schedule.iterations === 0
      ) {
        options.schedule.function({
          fitness,
          error: -error,
          iteration: neat.generation,
        });
      }
    }

    if (threads > 1) {
      workers.forEach((worker) => worker.terminate());
    }

    if (bestGenome) {
      this.nodes = bestGenome.nodes;
      this.connections = bestGenome.connections;
      this.selfconns = bestGenome.selfconns;
      this.gates = bestGenome.gates;

      if (options.clear) this.clear();
    }

    return {
      error: -error,
      iterations: neat.generation,
      time: Date.now() - start,
    };
  }

  /**
   * Creates a standalone function of the network which can be run without the
   * need of a library
   */
  standalone() {
    let present = [];
    let activations = [];
    let states = [];
    let lines = [];
    let functions = [];

    let i;
    for (i = 0; i < this.input; i++) {
      let node = this.nodes[i];
      activations.push(node.activation);
      states.push(node.state);
    }

    lines.push('for(var i = 0; i < input.length; i++) A[i] = input[i];');

    // So we don't have to use expensive .indexOf()
    for (let i = 0; i < this.nodes.length; i++) {
      this.nodes[i].index = i;
    }

    for (let i = this.input; i < this.nodes.length; i++) {
      let node = this.nodes[i];
      activations.push(node.activation);
      states.push(node.state);

      let functionIndex = present.indexOf(node.squash.name);

      if (functionIndex === -1) {
        functionIndex = present.length;
        present.push(node.squash.name);
        functions.push(node.squash.toString());
      }

      let incoming = [];
      for (let j = 0; j < node.connections.in.length; j++) {
        let conn = node.connections.in[j];
        let computation = `A[${conn.from.index}] * ${conn.weight}`;

        if (conn.gater != null) {
          computation += ` * A[${conn.gater.index}]`;
        }

        incoming.push(computation);
      }

      if (node.connections.self.weight) {
        let conn = node.connections.self;
        let computation = `S[${i}] * ${conn.weight}`;

        if (conn.gater != null) {
          computation += ` * A[${conn.gater.index}]`;
        }

        incoming.push(computation);
      }

      let line1 = `S[${i}] = ${incoming.join(' + ')} + ${node.bias};`;
      let line2 = `A[${i}] = F[${functionIndex}](S[${i}])${
        !node.mask ? ' * ' + node.mask : ''
      };`;
      lines.push(line1);
      lines.push(line2);
    }

    let output = [];
    for (let i = this.nodes.length - this.output; i < this.nodes.length; i++) {
      output.push(`A[${i}]`);
    }

    output = `return [${output.join(',')}];`;
    lines.push(output);

    let total = '';
    total += `var F = [${functions.toString()}];\r\n`;
    total += `var A = [${activations.toString()}];\r\n`;
    total += `var S = [${states.toString()}];\r\n`;
    total += `function activate(input){\r\n${lines.join('\r\n')}\r\n}`;

    return total;
  }
  /**
   * Serialize to send to workers efficiently
   */
  serialize() {
    let activations = [];
    let states = [];
    let conns = [];
    let squashes = [
      'LOGISTIC',
      'TANH',
      'IDENTITY',
      'STEP',
      'RELU',
      'SOFTSIGN',
      'SINUSOID',
      'GAUSSIAN',
      'BENT_IDENTITY',
      'BIPOLAR',
      'BIPOLAR_SIGMOID',
      'HARD_TANH',
      'ABSOLUTE',
      'INVERSE',
      'SELU',
    ];

    conns.push(this.input);
    conns.push(this.output);

    let i;
    for (i = 0; i < this.nodes.length; i++) {
      let node = this.nodes[i];
      node.index = i;
      activations.push(node.activation);
      states.push(node.state);
    }

    for (let i = this.input; i < this.nodes.length; i++) {
      let node = this.nodes[i];
      conns.push(node.index);
      conns.push(node.bias);
      conns.push(squashes.indexOf(node.squash.name));

      conns.push(node.connections.self.weight);
      conns.push(
        node.connections.self.gater == null
          ? -1
          : node.connections.self.gater.index,
      );

      for (let j = 0; j < node.connections.in.length; j++) {
        let conn = node.connections.in[j];

        conns.push(conn.from.index);
        conns.push(conn.weight);
        conns.push(conn.gater == null ? -1 : conn.gater.index);
      }

      conns.push(-2); // stop token -> next node
    }

    return [activations, states, conns];
  }
  /**
   * Convert a json object to a network
   */
  static fromJSON(json) {
    let network = new Network(json.input, json.output);
    network.dropout = json.dropout;
    network.nodes = [];
    network.connections = [];

    let i;
    for (i = 0; i < json.nodes.length; i++) {
      network.nodes.push(Node.fromJSON(json.nodes[i]));
    }

    for (let i = 0; i < json.connections.length; i++) {
      let conn = json.connections[i];

      let connection = network.connect(
        network.nodes[conn.from],
        network.nodes[conn.to],
      )[0];
      connection.weight = conn.weight;

      if (conn.gater != null) {
        network.gate(network.nodes[conn.gater], connection);
      }
    }

    return network;
  }
  /**
   * Merge two networks into one
   */
  static merge(network1, network2) {
    // Create a copy of the networks
    network1 = Network.fromJSON(network1.toJSON());
    network2 = Network.fromJSON(network2.toJSON());

    // Check if output and input size are the same
    if (network1.output !== network2.input) {
      throw new Error(
        'Output size of network1 should be the same as the input size of network2!',
      );
    }

    // Redirect all connections from network2 input from network1 output
    let i;
    for (i = 0; i < network2.connections.length; i++) {
      let conn = network2.connections[i];
      if (conn.from.type === 'input') {
        let index = network2.nodes.indexOf(conn.from);

        // redirect
        conn.from = network1.nodes[network1.nodes.length - 1 - index];
      }
    }

    // Delete input nodes of network2
    for (let i = network2.input - 1; i >= 0; i--) {
      network2.nodes.splice(i, 1);
    }

    // Change the node type of network1's output nodes (now hidden)
    for (
      let i = network1.nodes.length - network1.output;
      i < network1.nodes.length;
      i++
    ) {
      network1.nodes[i].type = 'hidden';
    }

    // Create one network from both networks
    network1.connections = network1.connections.concat(network2.connections);
    network1.nodes = network1.nodes.concat(network2.nodes);

    return network1;
  }
  /**
   * Create an offspring from two parent networks
   */
  static crossOver(network1, network2, equal) {
    if (
      network1.input !== network2.input ||
      network1.output !== network2.output
    ) {
      throw new Error("Networks don't have the same input/output size!");
    }

    // Initialise offspring
    let offspring = new Network(network1.input, network1.output);
    offspring.connections = [];
    offspring.nodes = [];

    // Save scores and create a copy
    let score1 = network1.score || 0;
    let score2 = network2.score || 0;

    // Determine offspring node size
    let size;
    if (equal || score1 === score2) {
      let max = Math.max(network1.nodes.length, network2.nodes.length);
      let min = Math.min(network1.nodes.length, network2.nodes.length);
      size = Math.floor(Math.random() * (max - min + 1) + min);
    } else if (score1 > score2) {
      size = network1.nodes.length;
    } else {
      size = network2.nodes.length;
    }

    // Rename some variables for easier reading
    let outputSize = network1.output;

    // Set indexes so we don't need indexOf
    let i;
    for (i = 0; i < network1.nodes.length; i++) {
      network1.nodes[i].index = i;
    }

    for (let i = 0; i < network2.nodes.length; i++) {
      network2.nodes[i].index = i;
    }

    // Assign nodes from parents to offspring
    for (let i = 0; i < size; i++) {
      // Determine if an output node is needed
      let node;
      if (i < size - outputSize) {
        let random = Math.random();
        node = random >= 0.5 ? network1.nodes[i] : network2.nodes[i];
        let other = random < 0.5 ? network1.nodes[i] : network2.nodes[i];

        if (typeof node === 'undefined' || node.type === 'output') {
          node = other;
        }
      } else {
        if (Math.random() >= 0.5) {
          node = network1.nodes[network1.nodes.length + i - size];
        } else {
          node = network2.nodes[network2.nodes.length + i - size];
        }
      }

      let newNode = new Node();
      newNode.bias = node.bias;
      newNode.squash = node.squash;
      newNode.type = node.type;

      offspring.nodes.push(newNode);
    }

    // Create arrays of connection genes
    let n1conns = {};
    let n2conns = {};

    // Normal connections
    for (let i = 0; i < network1.connections.length; i++) {
      let conn = network1.connections[i];
      let data = {
        weight: conn.weight,
        from: conn.from.index,
        to: conn.to.index,
        gater: conn.gater != null ? conn.gater.index : -1,
      };
      n1conns[Connection.innovationID(data.from, data.to)] = data;
    }

    // Selfconnections
    for (let i = 0; i < network1.selfconns.length; i++) {
      let conn = network1.selfconns[i];
      let data = {
        weight: conn.weight,
        from: conn.from.index,
        to: conn.to.index,
        gater: conn.gater != null ? conn.gater.index : -1,
      };
      n1conns[Connection.innovationID(data.from, data.to)] = data;
    }

    // Normal connections
    for (let i = 0; i < network2.connections.length; i++) {
      let conn = network2.connections[i];
      let data = {
        weight: conn.weight,
        from: conn.from.index,
        to: conn.to.index,
        gater: conn.gater != null ? conn.gater.index : -1,
      };
      n2conns[Connection.innovationID(data.from, data.to)] = data;
    }

    // Selfconnections
    for (let i = 0; i < network2.selfconns.length; i++) {
      let conn = network2.selfconns[i];
      let data = {
        weight: conn.weight,
        from: conn.from.index,
        to: conn.to.index,
        gater: conn.gater != null ? conn.gater.index : -1,
      };
      n2conns[Connection.innovationID(data.from, data.to)] = data;
    }

    // Split common conn genes from disjoint or excess conn genes
    let connections = [];
    let keys1 = Object.keys(n1conns);
    let keys2 = Object.keys(n2conns);
    for (let i = keys1.length - 1; i >= 0; i--) {
      // Common gene
      if (typeof n2conns[keys1[i]] !== 'undefined') {
        let conn = Math.random() >= 0.5 ? n1conns[keys1[i]] : n2conns[keys1[i]];
        connections.push(conn);

        // Because deleting is expensive, just set it to some value
        n2conns[keys1[i]] = undefined;
      } else if (score1 >= score2 || equal) {
        connections.push(n1conns[keys1[i]]);
      }
    }

    // Excess/disjoint gene
    if (score2 >= score1 || equal) {
      for (let i = 0; i < keys2.length; i++) {
        if (typeof n2conns[keys2[i]] !== 'undefined') {
          connections.push(n2conns[keys2[i]]);
        }
      }
    }

    // Add common conn genes uniformly
    for (let i = 0; i < connections.length; i++) {
      let connData = connections[i];
      if (connData.to < size && connData.from < size) {
        let from = offspring.nodes[connData.from];
        let to = offspring.nodes[connData.to];
        let conn = offspring.connect(from, to)[0];

        conn.weight = connData.weight;

        if (connData.gater !== -1 && connData.gater < size) {
          offspring.gate(offspring.nodes[connData.gater], conn);
        }
      }
    }

    return offspring;
  }
}

/* Export */
export default Network;

```

## File ../lib/neat\architecture\node.js:
```javascript
/* Import */
import methods from '../methods/methods.js';
import Connection from './connection.js';
import config from '../config.js';

class Node {
  constructor(type) {
    this.bias = type === 'input' ? 0 : Math.random() * 0.2 - 0.1;
    this.squash = methods.activation.LOGISTIC;
    this.type = type || 'hidden';

    this.activation = 0;
    this.state = 0;
    this.old = 0;

    // For dropout
    this.mask = 1;

    // For tracking momentum
    this.previousDeltaBias = 0;

    // Batch training
    this.totalDeltaBias = 0;

    this.connections = {
      in: [],
      out: [],
      gated: [],
      self: new Connection(this, this, 0),
    };

    // Data for backpropagation
    this.error = {
      responsibility: 0,
      projected: 0,
      gated: 0,
    };
  }
  /**
   * Activates the node
   */
  activate(input) {
    // Check if an input is given
    if (typeof input !== 'undefined') {
      this.activation = input;
      return this.activation;
    }

    this.old = this.state;

    // All activation sources coming from the node itself
    this.state =
      this.connections.self.gain * this.connections.self.weight * this.state +
      this.bias;

    // Activation sources coming from connections
    let i;
    for (i = 0; i < this.connections.in.length; i++) {
      let connection = this.connections.in[i];
      this.state +=
        connection.from.activation * connection.weight * connection.gain;
    }

    // Squash the values received
    this.activation = this.squash(this.state) * this.mask;
    this.derivative = this.squash(this.state, true);

    // Update traces
    let nodes = [];
    let influences = [];

    for (i = 0; i < this.connections.gated.length; i++) {
      let conn = this.connections.gated[i];
      let node = conn.to;

      let index = nodes.indexOf(node);
      if (index > -1) {
        influences[index] += conn.weight * conn.from.activation;
      } else {
        nodes.push(node);
        influences.push(
          conn.weight * conn.from.activation +
            (node.connections.self.gater === this ? node.old : 0),
        );
      }

      // Adjust the gain to this nodes' activation
      conn.gain = this.activation;
    }

    for (i = 0; i < this.connections.in.length; i++) {
      let connection = this.connections.in[i];

      // Elegibility trace
      connection.elegibility =
        this.connections.self.gain *
          this.connections.self.weight *
          connection.elegibility +
        connection.from.activation * connection.gain;

      // Extended trace
      for (let j = 0; j < nodes.length; j++) {
        let node = nodes[j];
        let influence = influences[j];

        let index = connection.xtrace.nodes.indexOf(node);

        if (index > -1) {
          connection.xtrace.values[index] =
            node.connections.self.gain *
              node.connections.self.weight *
              connection.xtrace.values[index] +
            this.derivative * connection.elegibility * influence;
        } else {
          // Does not exist there yet, might be through mutation
          connection.xtrace.nodes.push(node);
          connection.xtrace.values.push(
            this.derivative * connection.elegibility * influence,
          );
        }
      }
    }

    return this.activation;
  }
  /**
   * Activates the node without calculating elegibility traces and such
   */
  noTraceActivate(input) {
    // Check if an input is given
    if (typeof input !== 'undefined') {
      this.activation = input;
      return this.activation;
    }

    // All activation sources coming from the node itself
    this.state =
      this.connections.self.gain * this.connections.self.weight * this.state +
      this.bias;

    // Activation sources coming from connections
    let i;
    for (i = 0; i < this.connections.in.length; i++) {
      let connection = this.connections.in[i];
      this.state +=
        connection.from.activation * connection.weight * connection.gain;
    }

    // Squash the values received
    this.activation = this.squash(this.state);

    for (i = 0; i < this.connections.gated.length; i++) {
      this.connections.gated[i].gain = this.activation;
    }

    return this.activation;
  }
  /**
   * Back-propagate the error, aka learn
   */
  propagate(rate, momentum, update, target) {
    momentum = momentum || 0;
    rate = rate || 0.3;

    // Error accumulator
    let error = 0;

    // Output nodes get their error from the enviroment
    if (this.type === 'output') {
      this.error.responsibility = this.error.projected =
        target - this.activation;
    } else {
      // the rest of the nodes compute their error responsibilities by backpropagation
      // error responsibilities from all the connections projected from this node
      let i;
      for (i = 0; i < this.connections.out.length; i++) {
        let connection = this.connections.out[i];
        let node = connection.to;
        // Eq. 21
        error +=
          node.error.responsibility * connection.weight * connection.gain;
      }

      // Projected error responsibility
      this.error.projected = this.derivative * error;

      // Error responsibilities from all connections gated by this neuron
      error = 0;

      for (i = 0; i < this.connections.gated.length; i++) {
        let conn = this.connections.gated[i];
        let node = conn.to;
        let influence = node.connections.self.gater === this ? node.old : 0;

        influence += conn.weight * conn.from.activation;
        error += node.error.responsibility * influence;
      }

      // Gated error responsibility
      this.error.gated = this.derivative * error;

      // Error responsibility
      this.error.responsibility = this.error.projected + this.error.gated;
    }

    if (this.type === 'constant') return;

    // Adjust all the node's incoming connections
    for (let i = 0; i < this.connections.in.length; i++) {
      let connection = this.connections.in[i];

      let gradient = this.error.projected * connection.elegibility;

      for (let j = 0; j < connection.xtrace.nodes.length; j++) {
        let node = connection.xtrace.nodes[j];
        let value = connection.xtrace.values[j];
        gradient += node.error.responsibility * value;
      }

      // Adjust weight
      let deltaWeight = rate * gradient * this.mask;
      connection.totalDeltaWeight += deltaWeight;
      if (update) {
        connection.totalDeltaWeight +=
          momentum * connection.previousDeltaWeight;
        connection.weight += connection.totalDeltaWeight;
        connection.previousDeltaWeight = connection.totalDeltaWeight;
        connection.totalDeltaWeight = 0;
      }
    }

    // Adjust bias
    let deltaBias = rate * this.error.responsibility;
    this.totalDeltaBias += deltaBias;
    if (update) {
      this.totalDeltaBias += momentum * this.previousDeltaBias;
      this.bias += this.totalDeltaBias;
      this.previousDeltaBias = this.totalDeltaBias;
      this.totalDeltaBias = 0;
    }
  }
  /**
   * Creates a connection from this node to the given node
   */
  connect(target, weight) {
    let connections = [];
    if (typeof target.bias !== 'undefined') {
      // must be a node!
      if (target === this) {
        // Turn on the self connection by setting the weight
        if (this.connections.self.weight !== 0) {
          if (config.warnings) console.warn('This connection already exists!');
        } else {
          this.connections.self.weight = weight || 1;
        }
        connections.push(this.connections.self);
      } else if (this.isProjectingTo(target)) {
        throw new Error('Already projecting a connection to this node!');
      } else {
        let connection = new Connection(this, target, weight);
        target.connections.in.push(connection);
        this.connections.out.push(connection);

        connections.push(connection);
      }
    } else {
      // should be a group
      for (let i = 0; i < target.nodes.length; i++) {
        let connection = new Connection(this, target.nodes[i], weight);
        target.nodes[i].connections.in.push(connection);
        this.connections.out.push(connection);
        target.connections.in.push(connection);

        connections.push(connection);
      }
    }
    return connections;
  }
  /**
   * Disconnects this node from the other node
   */
  disconnect(node, twosided) {
    if (this === node) {
      this.connections.self.weight = 0;
      return;
    }

    for (let i = 0; i < this.connections.out.length; i++) {
      let conn = this.connections.out[i];
      if (conn.to === node) {
        this.connections.out.splice(i, 1);
        let j = conn.to.connections.in.indexOf(conn);
        conn.to.connections.in.splice(j, 1);
        if (conn.gater !== null) conn.gater.ungate(conn);
        break;
      }
    }

    if (twosided) {
      node.disconnect(this);
    }
  }
  /**
   * Make this node gate a connection
   */
  gate(connections) {
    if (!Array.isArray(connections)) {
      connections = [connections];
    }

    for (let i = 0; i < connections.length; i++) {
      let connection = connections[i];

      this.connections.gated.push(connection);
      connection.gater = this;
    }
  }
  /**
   * Removes the gates from this node from the given connection(s)
   */
  ungate(connections) {
    if (!Array.isArray(connections)) {
      connections = [connections];
    }

    for (let i = connections.length - 1; i >= 0; i--) {
      let connection = connections[i];

      let index = this.connections.gated.indexOf(connection);
      this.connections.gated.splice(index, 1);
      connection.gater = null;
      connection.gain = 1;
    }
  }
  /**
   * Clear the context of the node
   */
  clear() {
    for (let i = 0; i < this.connections.in.length; i++) {
      let connection = this.connections.in[i];

      connection.elegibility = 0;
      connection.xtrace = {
        nodes: [],
        values: [],
      };
    }

    for (let i = 0; i < this.connections.gated.length; i++) {
      let conn = this.connections.gated[i];
      conn.gain = 0;
    }

    this.error.responsibility = this.error.projected = this.error.gated = 0;
    this.old = this.state = this.activation = 0;
  }
  /**
   * Mutates the node with the given method
   */
  mutate(method) {
    if (typeof method === 'undefined') {
      throw new Error('No mutate method given!');
    } else if (!(method.name in methods.mutation)) {
      throw new Error('This method does not exist!');
    }

    switch (method) {
      case methods.mutation.MOD_ACTIVATION: // Can't be the same squash
      {
        let squash =
          method.allowed[
            (method.allowed.indexOf(this.squash) +
              Math.floor(Math.random() * (method.allowed.length - 1)) +
              1) %
              method.allowed.length
          ];
        this.squash = squash;
        break;
      }
      case methods.mutation.MOD_BIAS: {
        let modification =
          Math.random() * (method.max - method.min) + method.min;
        this.bias += modification;
        break;
      }
    }
  }
  /**
   * Checks if this node is projecting to the given node
   */
  isProjectingTo(node) {
    if (node === this && this.connections.self.weight !== 0) return true;

    for (let i = 0; i < this.connections.out.length; i++) {
      let conn = this.connections.out[i];
      if (conn.to === node) {
        return true;
      }
    }
    return false;
  }
  /**
   * Checks if the given node is projecting to this node
   */
  isProjectedBy(node) {
    if (node === this && this.connections.self.weight !== 0) return true;

    for (let i = 0; i < this.connections.in.length; i++) {
      let conn = this.connections.in[i];
      if (conn.from === node) {
        return true;
      }
    }

    return false;
  }
  /**
   * Converts the node to a json object
   */
  toJSON() {
    let json = {
      bias: this.bias,
      type: this.type,
      squash: this.squash.name,
      mask: this.mask,
    };

    return json;
  }
  /**
   * Convert a json object to a node
   */
  static fromJSON(json) {
    let node = new Node();
    node.bias = json.bias;
    node.type = json.type;
    node.mask = json.mask;
    node.squash = methods.activation[json.squash];

    return node;
  }
}

/* Export */
export default Node;

```

## File ../lib/neat\methods\activation.js:
```javascript
// https://en.wikipedia.org/wiki/Activation_function
// https://stats.stackexchange.com/questions/115258/comprehensive-list-of-activation-functions-in-neural-networks-with-pros-cons

const activation = {
  LOGISTIC: function (x, derivate) {
    let fx = 1 / (1 + Math.exp(-x));
    if (!derivate) return fx;
    return fx * (1 - fx);
  },
  TANH: function (x, derivate) {
    if (derivate) return 1 - Math.pow(Math.tanh(x), 2);
    return Math.tanh(x);
  },
  IDENTITY: function (x, derivate) {
    return derivate ? 1 : x;
  },
  STEP: function (x, derivate) {
    return derivate ? 0 : x > 0 ? 1 : 0;
  },
  RELU: function (x, derivate) {
    if (derivate) return x > 0 ? 1 : 0;
    return x > 0 ? x : 0;
  },
  SOFTSIGN: function (x, derivate) {
    let d = 1 + Math.abs(x);
    if (derivate) return x / Math.pow(d, 2);
    return x / d;
  },
  SINUSOID: function (x, derivate) {
    if (derivate) return Math.cos(x);
    return Math.sin(x);
  },
  GAUSSIAN: function (x, derivate) {
    let d = Math.exp(-Math.pow(x, 2));
    if (derivate) return -2 * x * d;
    return d;
  },
  BENT_IDENTITY: function (x, derivate) {
    let d = Math.sqrt(Math.pow(x, 2) + 1);
    if (derivate) return x / (2 * d) + 1;
    return (d - 1) / 2 + x;
  },
  BIPOLAR: function (x, derivate) {
    return derivate ? 0 : x > 0 ? 1 : -1;
  },
  BIPOLAR_SIGMOID: function (x, derivate) {
    let d = 2 / (1 + Math.exp(-x)) - 1;
    if (derivate) return (1 / 2) * (1 + d) * (1 - d);
    return d;
  },
  HARD_TANH: function (x, derivate) {
    if (derivate) return x > -1 && x < 1 ? 1 : 0;
    return Math.max(-1, Math.min(1, x));
  },
  ABSOLUTE: function (x, derivate) {
    if (derivate) return x < 0 ? -1 : 1;
    return Math.abs(x);
  },
  INVERSE: function (x, derivate) {
    if (derivate) return -1;
    return 1 - x;
  },
  // https://arxiv.org/pdf/1706.02515.pdf
  SELU: function (x, derivate) {
    const alpha = 1.6732632423543772;
    const scale = 1.0507009873554805;
    let fx = x > 0 ? x : alpha * Math.exp(x) - alpha;
    if (derivate) {
      return x > 0 ? scale : (fx + alpha) * scale;
    }
    return fx * scale;
  },
};

/* Export */
export default activation;

```

## File ../lib/neat\methods\connection.js:
```javascript
// Specifies in what manner two groups are connected
const connection = {
  ALL_TO_ALL: {
    name: 'OUTPUT',
  },
  ALL_TO_ELSE: {
    name: 'INPUT',
  },
  ONE_TO_ONE: {
    name: 'SELF',
  },
};

/* Export */
export default connection;

```

## File ../lib/neat\methods\cost.js:
```javascript
// https://en.wikipedia.org/wiki/Loss_function
const cost = {
  // Cross entropy error
  CROSS_ENTROPY: function (target, output) {
    let error = 0;
    for (let i = 0; i < output.length; i++) {
      // Avoid negative and zero numbers, use 1e-15 http://bit.ly/2p5W29A
      error -=
        target[i] * Math.log(Math.max(output[i], 1e-15)) +
        (1 - target[i]) * Math.log(1 - Math.max(output[i], 1e-15));
    }
    return error / output.length;
  },
  // Mean Squared Error
  MSE: function (target, output) {
    let error = 0;
    for (let i = 0; i < output.length; i++) {
      error += Math.pow(target[i] - output[i], 2);
    }

    return error / output.length;
  },
  // Binary error
  BINARY: function (target, output) {
    let misses = 0;
    for (let i = 0; i < output.length; i++) {
      misses += Math.round(target[i] * 2) !== Math.round(output[i] * 2);
    }

    return misses;
  },
  // Mean Absolute Error
  MAE: function (target, output) {
    let error = 0;
    for (let i = 0; i < output.length; i++) {
      error += Math.abs(target[i] - output[i]);
    }

    return error / output.length;
  },
  // Mean Absolute Percentage Error
  MAPE: function (target, output) {
    let error = 0;
    for (let i = 0; i < output.length; i++) {
      error += Math.abs((output[i] - target[i]) / Math.max(target[i], 1e-15));
    }

    return error / output.length;
  },
  // Mean Squared Logarithmic Error
  MSLE: function (target, output) {
    let error = 0;
    for (let i = 0; i < output.length; i++) {
      error +=
        Math.log(Math.max(target[i], 1e-15)) -
        Math.log(Math.max(output[i], 1e-15));
    }

    return error;
  },
  // Hinge loss, for classifiers
  HINGE: function (target, output) {
    let error = 0;
    for (let i = 0; i < output.length; i++) {
      error += Math.max(0, 1 - target[i] * output[i]);
    }

    return error;
  },
};

/* Export */
export default cost;

```

## File ../lib/neat\methods\crossover.js:
```javascript
// https://en.wikipedia.org/wiki/Crossover_(genetic_algorithm)
const crossover = {
  SINGLE_POINT: {
    name: 'SINGLE_POINT',
    config: [0.4],
  },
  TWO_POINT: {
    name: 'TWO_POINT',
    config: [0.4, 0.9],
  },
  UNIFORM: {
    name: 'UNIFORM',
  },
  AVERAGE: {
    name: 'AVERAGE',
  },
};

/* Export */
export default crossover;

```

## File ../lib/neat\methods\gating.js:
```javascript
// Specifies how to gate a connection between two groups of multiple neurons
const gating = {
  OUTPUT: {
    name: 'OUTPUT',
  },
  INPUT: {
    name: 'INPUT',
  },
  SELF: {
    name: 'SELF',
  },
};

/* Export */
export default gating;

```

## File ../lib/neat\methods\methods.js:
```javascript
import activation from './activation.js';
import mutation from './mutation.js';
import selection from './selection.js';
import crossover from './crossover.js';
import cost from './cost.js';
import gating from './gating.js';
import connection from './connection.js';
import rate from './rate.js';

const methods = {
  activation,
  mutation,
  selection,
  crossover: crossover,
  cost,
  gating,
  connection,
  rate,
};

/** Export */
export default methods;

```

## File ../lib/neat\methods\mutation.js:
```javascript
/* Import */
import activation from './activation.js';

// https://en.wikipedia.org/wiki/mutation_(genetic_algorithm)
const mutation = {
  ADD_NODE: {
    name: 'ADD_NODE',
  },
  SUB_NODE: {
    name: 'SUB_NODE',
    keep_gates: true,
  },
  ADD_CONN: {
    name: 'ADD_CONN',
  },
  SUB_CONN: {
    name: 'REMOVE_CONN',
  },
  MOD_WEIGHT: {
    name: 'MOD_WEIGHT',
    min: -1,
    max: 1,
  },
  MOD_BIAS: {
    name: 'MOD_BIAS',
    min: -1,
    max: 1,
  },
  MOD_ACTIVATION: {
    name: 'MOD_ACTIVATION',
    mutateOutput: true,
    allowed: [
      activation.LOGISTIC,
      activation.TANH,
      activation.RELU,
      activation.IDENTITY,
      activation.STEP,
      activation.SOFTSIGN,
      activation.SINUSOID,
      activation.GAUSSIAN,
      activation.BENT_IDENTITY,
      activation.BIPOLAR,
      activation.BIPOLAR_SIGMOID,
      activation.HARD_TANH,
      activation.ABSOLUTE,
      activation.INVERSE,
      activation.SELU,
    ],
  },
  ADD_SELF_CONN: {
    name: 'ADD_SELF_CONN',
  },
  SUB_SELF_CONN: {
    name: 'SUB_SELF_CONN',
  },
  ADD_GATE: {
    name: 'ADD_GATE',
  },
  SUB_GATE: {
    name: 'SUB_GATE',
  },
  ADD_BACK_CONN: {
    name: 'ADD_BACK_CONN',
  },
  SUB_BACK_CONN: {
    name: 'SUB_BACK_CONN',
  },
  SWAP_NODES: {
    name: 'SWAP_NODES',
    mutateOutput: true,
  },
};

mutation.ALL = [
  mutation.ADD_NODE,
  mutation.SUB_NODE,
  mutation.ADD_CONN,
  mutation.SUB_CONN,
  mutation.MOD_WEIGHT,
  mutation.MOD_BIAS,
  mutation.MOD_ACTIVATION,
  mutation.ADD_GATE,
  mutation.SUB_GATE,
  mutation.ADD_SELF_CONN,
  mutation.SUB_SELF_CONN,
  mutation.ADD_BACK_CONN,
  mutation.SUB_BACK_CONN,
  mutation.SWAP_NODES,
];

mutation.FFW = [
  mutation.ADD_NODE,
  mutation.SUB_NODE,
  mutation.ADD_CONN,
  mutation.SUB_CONN,
  mutation.MOD_WEIGHT,
  mutation.MOD_BIAS,
  mutation.MOD_ACTIVATION,
  mutation.SWAP_NODES,
];

/* Export */
export default mutation;

```

## File ../lib/neat\methods\rate.js:
```javascript
// https://stackoverflow.com/questions/30033096/what-is-lr-policy-in-caffe/30045244
const rate = {
  FIXED: function () {
    let func = function (baseRate) {
      return baseRate;
    };
    return func;
  },
  STEP: function (gamma, stepSize) {
    gamma = gamma || 0.9;
    stepSize = stepSize || 100;

    let func = function (baseRate, iteration) {
      return baseRate * Math.pow(gamma, Math.floor(iteration / stepSize));
    };

    return func;
  },
  EXP: function (gamma) {
    gamma = gamma || 0.999;

    let func = function (baseRate, iteration) {
      return baseRate * Math.pow(gamma, iteration);
    };

    return func;
  },
  INV: function (gamma, power) {
    gamma = gamma || 0.001;
    power = power || 2;

    let func = function (baseRate, iteration) {
      return baseRate * Math.pow(1 + gamma * iteration, -power);
    };

    return func;
  },
};

/* Export */
export default rate;

```

## File ../lib/neat\methods\selection.js:
```javascript
// https://en.wikipedia.org/wiki/Selection_(genetic_algorithm)

const selection = {
  FITNESS_PROPORTIONATE: {
    name: 'FITNESS_PROPORTIONATE',
  },
  POWER: {
    name: 'POWER',
    power: 4,
  },
  TOURNAMENT: {
    name: 'TOURNAMENT',
    size: 5,
    probability: 0.5,
  },
};

/* Export */
export default selection;

```

## File ../lib/neat\multithreading\multi.js:
```javascript
import workers from './workers/workers.js';

let multi = {
  /** Workers */
  workers: workers,

  /** Serializes a dataset */
  serializeDataSet: function (dataSet) {
    let serialized = [dataSet[0].input.length, dataSet[0].output.length];

    for (let i = 0; i < dataSet.length; i++) {
      let j;
      for (j = 0; j < serialized[0]; j++) {
        serialized.push(dataSet[i].input[j]);
      }
      for (j = 0; j < serialized[1]; j++) {
        serialized.push(dataSet[i].output[j]);
      }
    }

    return serialized;
  },

  /** Activate a serialized network */
  activateSerializedNetwork: function (input, A, S, data, F) {
    for (let i = 0; i < data[0]; i++) A[i] = input[i];
    for (let i = 2; i < data.length; i++) {
      let index = data[i++];
      let bias = data[i++];
      let squash = data[i++];
      let selfweight = data[i++];
      let selfgater = data[i++];

      S[index] =
        (selfgater === -1 ? 1 : A[selfgater]) * selfweight * S[index] + bias;

      while (data[i] !== -2) {
        S[index] +=
          A[data[i++]] * data[i++] * (data[i++] === -1 ? 1 : A[data[i - 1]]);
      }
      A[index] = F[squash](S[index]);
    }

    let output = [];
    for (let i = A.length - data[1]; i < A.length; i++) output.push(A[i]);
    return output;
  },

  /** Deserializes a dataset to an array of arrays */
  deserializeDataSet: function (serializedSet) {
    let set = [];

    let sampleSize = serializedSet[0] + serializedSet[1];
    for (let i = 0; i < (serializedSet.length - 2) / sampleSize; i++) {
      let input = [];
      for (
        let j = 2 + i * sampleSize;
        j < 2 + i * sampleSize + serializedSet[0];
        j++
      ) {
        input.push(serializedSet[j]);
      }
      let output = [];
      for (
        let j = 2 + i * sampleSize + serializedSet[0];
        j < 2 + i * sampleSize + sampleSize;
        j++
      ) {
        output.push(serializedSet[j]);
      }
      set.push(input);
      set.push(output);
    }

    return set;
  },

  /** A list of compiled activation functions in a certain order */
  activations: [
    function (x) {
      return 1 / (1 + Math.exp(-x));
    },
    function (x) {
      return Math.tanh(x);
    },
    function (x) {
      return x;
    },
    function (x) {
      return x > 0 ? 1 : 0;
    },
    function (x) {
      return x > 0 ? x : 0;
    },
    function (x) {
      return x / (1 + Math.abs(x));
    },
    function (x) {
      return Math.sin(x);
    },
    function (x) {
      return Math.exp(-Math.pow(x, 2));
    },
    function (x) {
      return (Math.sqrt(Math.pow(x, 2) + 1) - 1) / 2 + x;
    },
    function (x) {
      return x > 0 ? 1 : -1;
    },
    function (x) {
      return 2 / (1 + Math.exp(-x)) - 1;
    },
    function (x) {
      return Math.max(-1, Math.min(1, x));
    },
    function (x) {
      return Math.abs(x);
    },
    function (x) {
      return 1 - x;
    },
    function (x) {
      let a = 1.6732632423543772;
      return (x > 0 ? x : a * Math.exp(x) - a) * 1.05070098735548;
    },
  ],
};

multi.testSerializedSet = function (set, cost, A, S, data, F) {
  // Calculate how much samples are in the set
  let error = 0;
  for (let i = 0; i < set.length; i += 2) {
    let output = multi.activateSerializedNetwork(set[i], A, S, data, F);
    error += cost(set[i + 1], output);
  }

  return error / (set.length / 2);
};

/* Export */
// for (let i in multi) {
//   module.exports[i] = multi[i];
// }

export default multi;

```

## File ../lib/neat\multithreading\workers\workers.js:
```javascript
import TestWorker from './browser/testworker.js';
let workers = {
  node: {
    // TestWorker: _node
  },
  browser: {
    TestWorker: TestWorker,
  },
};

/** Export */
export default workers;

```

## File ../lib/neat\multithreading\workers\browser\testworker.js:
```javascript
/* Import */
import multi from '../../multi.js';

/*******************************************************************************
                                WEBWORKER
*******************************************************************************/

class TestWorker {
  constructor(dataSet, cost) {
    let blob = new Blob([this._createBlobString(cost)]);
    this.url = window.URL.createObjectURL(blob);
    this.worker = new Worker(this.url);

    let data = { set: new Float64Array(dataSet).buffer };
    this.worker.postMessage(data, [data.set]);
  }
  evaluate(network) {
    // eslint-disable-next-line no-unused-vars
    return new Promise((resolve) => {
      let serialized = network.serialize();

      let data = {
        activations: new Float64Array(serialized[0]).buffer,
        states: new Float64Array(serialized[1]).buffer,
        conns: new Float64Array(serialized[2]).buffer,
      };

      this.worker.onmessage = function (e) {
        let error = new Float64Array(e.data.buffer)[0];
        resolve(error);
      };

      this.worker.postMessage(data, [
        data.activations,
        data.states,
        data.conns,
      ]);
    });
  }
  terminate() {
    this.worker.terminate();
    window.URL.revokeObjectURL(this.url);
  }
  _createBlobString(cost) {
    let source = `
      var F = [${multi.activations.toString()}];
      var cost = ${cost.toString()};
      var multi = {
        deserializeDataSet: ${multi.deserializeDataSet.toString()},
        testSerializedSet: ${multi.testSerializedSet.toString()},
        activateSerializedNetwork: ${multi.activateSerializedNetwork.toString()}
      };

      this.onmessage = function (e) {
        if(typeof e.data.set === 'undefined'){
          var A = new Float64Array(e.data.activations);
          var S = new Float64Array(e.data.states);
          var data = new Float64Array(e.data.conns);

          var error = multi.testSerializedSet(set, cost, A, S, data, F);

          var answer = { buffer: new Float64Array([error ]).buffer };
          postMessage(answer, [answer.buffer]);
        } else {
          set = multi.deserializeDataSet(new Float64Array(e.data.set));
        }
      };`;

    return source;
  }
}

/* Export */
export default TestWorker;

```

