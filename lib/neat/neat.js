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
