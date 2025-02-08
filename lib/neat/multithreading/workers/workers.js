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
