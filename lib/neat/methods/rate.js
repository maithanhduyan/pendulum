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
