import { Log, assert, warn } from './Utils';
import Collections from './Collection';
import Base from './Base';
import Request from './Request';
import ReactWithPulse from './wrappers/ReactWithPulse';
// const window = {};
class Pulse {
  constructor({
    storage,
    collections = {},
    utils = {},
    services = {},
    staticData = {},
    request = {},
    data = {},
    actions = {},
    filters = {},
    watch = {},
    routes = {},
    local = {},
    groups = [],
    indexes = [],
    persist = [],
    jobs = {},
    config = {}
  }) {
    if (!config.ssr) {
      window._pulse = this;
    }

    config = this.prepareConfig(config);

    // internal state
    this._collections = {};
    this._subscribers = [];
    this._mappedProperties = {};
    this._eventBus = this.activateEventBus();
    // collections.root = { data, indexes, actions, filters, routes };
    // filter dependency tracker
    this._global = {
      componentStore: {},
      regenQueue: [],
      errors: [],
      history: [],
      allFilters: [],
      collectionNamespace: [],
      updateSubscribers: this.updateSubscribers,
      eventBus: this._eventBus,
      dependenciesFound: [],
      dependencyGraph: {},
      generatedFilters: [],
      record: false,
      initComplete: false,
      request: {},
      dataRef: {},
      internalDataRef: {},
      storage: {},
      relations: {},
      config
    };

    this.initStorage(storage);

    // init collections
    this.initCollections(
      collections,
      {
        data,
        indexes,
        actions,
        filters,
        routes,
        groups,
        watch,
        persist,
        local
      },
      request
    );

    this.utils = utils;
    this.services = services;
    this.staticData = staticData;

    // build a tree of data after collection constructor is finished
    this.buildGlobalDataRefrenceTree();

    // build a dependency graph for smart caching
    this.prepareDependencyGraph();

    // run and analyse the filters to populate the dependecy graph
    this.executeAllFilters();

    // loop through the regen queue to regenerate filters that couldn't execute first time around
    this.processRegenQueue();

    // declare Pulse has finished initialzing
    this._global.initComplete = true;
    Log('INIT_COMPLETE');

    this.runOnReadyHandlers();

    this.initJobs(jobs);
  }

  wrapped(ReactComponent, mapData) {
    const config = this._global.config;
    if (config.framework === 'react' && config.frameworkConstructor)
      return ReactWithPulse(
        this,
        config.frameworkConstructor,
        ReactComponent,
        mapData
      );
    else return false;
  }

  prepareConfig(config) {
    // defaults
    const configStruct = {
      framework: null,
      waitForMount: false,
      autoUnmount: false
    };
    // detect if framework passed in is a React constructor
    if (
      config.framework &&
      config.framework.hasOwnProperty(
        '__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED'
      )
    ) {
      config.frameworkConstructor = config.framework;
      config.framework = 'react';
    }

    if (config.framework === 'react') {
      if (config.waitForMount != false) config.waitForMount = true;
      if (config.autoUnmount != false) config.autoUnmount = true;
    }

    // merge config with struct to apply defaults
    return Object.assign(configStruct, config);
  }

  unmount(component) {
    const uuid = component.__pulseUniqueIdentifier;
    if (!uuid) return assert('Failed to unmount component. No UUID found');
    const componentContainer = this._global.componentStore[
      component.__pulseUniqueIdentifier
    ];
    if (!componentContainer.mappedData) return assert('Failed to unmount');

    let keys = Object.keys(componentContainer.mappedData);

    // Clean up collection refrences to this component
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      let val = componentContainer.mappedData[key];
      let collection = val.split('/')[0];
      let property = val.split('/')[1];
      let _collection = this._collections[collection];
      if (_collection)
        _collection._subscribedToData[property] = _collection._subscribedToData[
          property
        ].filter(sub => sub.componentUUID !== uuid);
    }

    // delete refrence to this component from store
    delete this._global.componentStore[component.__pulseUniqueIdentifier];
  }

  mount(instance) {
    let component = this._global.componentStore[
      instance.__pulseUniqueIdentifier
    ];
    if (component) {
      component.instance = instance;
      component.ready = true;
    }
  }

  install(Vue) {
    const pulse = this;
    const config = pulse._global.config.waitForMount;
    Vue.mixin({
      beforeCreate() {
        Object.keys(pulse._global.dataRef).forEach(collection => {
          this['$' + collection] = pulse._global.dataRef[collection];
        });
        this.$utils = pulse.utils;
        this.$services = pulse.services;
        this.$staticData = pulse.staticData;

        this.mapData = properties =>
          pulse.mapData(properties, this, {
            waitForMount: config.waitForMount
          });
      },
      mounted() {
        if (this.__pulseUniqueIdentifier && config.waitForMount)
          pulse.mount(this);
      },
      beforeDestroy() {
        if (this.__pulseUniqueIdentifier && config.autoUnmount)
          pulse.unmount(this);
      }
    });
  }
  mapData(properties, instanceToBind, config) {
    instanceToBind = instanceToBind ? instanceToBind : this;
    let returnData = {},
      pulse = null;
    if (!window) {
      return assert(
        'Failed to map data, unable to access initialized instance of Pulse'
      );
    } else {
      pulse = window._pulse;
    }

    let uuid = instanceToBind.__pulseUniqueIdentifier;

    if (!uuid) {
      // generate UUID
      uuid =
        Math.random()
          .toString()
          .split('.')[1] + Date.now();
      // inject uuid into component instance
      const componentContainer = {
        instance: instanceToBind,
        uuid,
        ready: config && config.waitForMount ? false : true,
        mappedData: properties,
        config
      };
      instanceToBind.__pulseUniqueIdentifier = uuid;

      // register component globally
      pulse._global.componentStore[uuid] = componentContainer;
    } else {
      pulse.mount(instanceToBind);
    }

    if (properties)
      pulse.normalizeMap(properties).forEach(({ key, val }) => {
        // parse address
        let collection = val.split('/')[0];
        let property = val.split('/')[1];

        // if collection not found return
        if (!pulse.hasOwnProperty(collection)) return;

        let subscribed = pulse._collections[collection]._subscribedToData;

        let ref = {
          componentUUID: uuid,
          key
        };

        // register component locally on collection
        if (!subscribed.hasOwnProperty(property)) {
          subscribed[property] = [ref];
        } else subscribed[property].push(ref);

        // return data values to component
        returnData[key] = pulse[collection][property];
      });
    return returnData;
  }

  mapCollections() {
    const returnData = {};
    Object.keys(this._global.dataRef).forEach(collection => {
      returnData[collection] = this._global.dataRef[collection];
    });
    return returnData;
  }

  normalizeMap(map) {
    return Array.isArray(map)
      ? map.map(key => ({ key, val: key }))
      : Object.keys(map).map(key => ({ key, val: map[key] }));
  }

  // use a proxy to pass messages around pulse that couldn't otherwise be done due to scoping
  activateEventBus() {
    return new Proxy(
      { message: null },
      {
        set: (target, key, value) => {
          if (value.type === 'processRegenQueue') {
            this.processRegenQueue();
          }
          if (value.type === 'createForeignGroupRelation') {
            this._collections[
              value.data.foreignCollection
            ]._foreignGroupRelations[value.data.foreignData] = {
              collection: value.data.dependentCollection,
              groupToRegen: value.data.dependentGroup
            };
          }
          if (value.type === 'rebuildGroupsWithRelations') {
            this._collections[value.data.collection].buildGroupFromIndex(
              value.data.groupToRegen
            );
          }
          if (value.type === 'undo') {
            this.processUndo(value.data);
          }
          target[key] = 'waiting';
          return true;
        }
      }
    );
  }

  initStorage(storage = {}) {
    let type = 'custom';
    if (!storage.async) storage.async = false;
    // the user wants to use session storage
    if (storage === 'sessionStorage') {
      type = 'sessionStorage';
      this.assignStorage(sessionStorage, type, storage.async);
      // they have defined their own storage API
    } else if (storage && storage.set && storage.get) {
      type = 'custom';
      this.assignStorage(storage, type, storage.async);
      // default to local storage
    } else if (!this._global.config.ssr && window.localStorage) {
      type = 'localStorage';
      this.assignStorage(localStorage, type, storage.async);
      // no storage API found
    } else {
      return assert(`No storage API present, data will not persist`);
    }
  }
  assignStorage(storage, type, async) {
    const storageAPI = {
      type,
      async
    };
    //set
    if (storage.set) storageAPI.set = storage.set.bind(storage);
    if (storage.setItem) storageAPI.set = storage.setItem.bind(storage);
    //get
    if (storage.get) storageAPI.get = storage.get.bind(storage);
    if (storage.getItem) storageAPI.get = storage.getItem.bind(storage);
    //remove
    if (storage.remove) storageAPI.remove = storage.remove.bind(storage);
    if (storage.removeItem)
      storageAPI.remove = storage.removeItem.bind(storage);
    //clear
    if (storage.clear) storageAPI.clear = storage.clear.bind(storage);

    this._global.storage = storageAPI;
  }

  // prepare the dependecy graph
  prepareDependencyGraph() {
    let graph = this._global.dependencyGraph;
    let collections = this._global.collectionNamespace;

    for (let i = 0; i < collections.length; i++) {
      const collection = collections[i];
      graph[collection] = {};
      let _public = this._collections[collection]._public;
      let loop = [];

      const propertiesToRegister = ['filters', 'groups', 'data'];

      for (let i = 0; i < propertiesToRegister.length; i++) {
        const key = propertiesToRegister[i];
        Object.keys(_public[key]).forEach(name => loop.push(name));
      }

      for (let i = 0; i < loop.length; i++) {
        const item = loop[i];
        graph[collection][item] = {
          dependencies: [],
          dependents: []
        };
      }
    }
  }

  // build the collection classes
  initCollections(collections, base, request) {
    // the base collection class contains prefined data
    this._collections.base = new Base(this._global, base, request);
    this._collections.request = new Request(this._global, request);
    this._global.collectionNamespace = ['base', 'request'];

    Object.keys(collections).forEach(collection => {
      this._global.collectionNamespace.push(collection);
      this._collections[collection] = new Collections(
        {
          name: collection,
          global: this._global
        },
        collections[collection]
      );
    });

    Object.keys(this._collections).forEach(collection => {
      // check if the instance has a naming conflict
      if (this[collection]) {
        assert(
          `Collection name conflict, instance already has "${collection}" thus it will not be accessable on the root state tree.`
        );
      } else {
        // bind the collection public data to the root state tree
        this[collection] = this._collections[collection]._public;
      }
    });
  }

  // this is passed into filters, actions and routes so they can access all data within Pulse
  buildGlobalDataRefrenceTree() {
    if (this._collections) {
      const loop = Object.keys(this._collections);
      for (let i = 0; i < loop.length; i++) {
        const collection = loop[i];
        this._global.dataRef[collection] = this._collections[
          collection
        ]._public;
      }
    }
  }

  executeAllFilters() {
    const loop = Object.keys(this._collections);
    for (let i = 0; i < loop.length; i++) {
      const collection = loop[i];
      this._collections[collection].analyseFilters();
    }
  }

  processRegenQueue() {
    // debugger;
    // if we called this function from the collection class
    if (this._global.regenQueue.length === 0) return;

    Log(
      `Regen queue processing. There are ${
        this._global.regenQueue.length
      } in the queue.`
    );
    // for dev purposes, prevent infinate loop
    while (this._global.regenQueue.length) {
      // this removes the first item of the array and saves it to `entry`
      const entry = this._global.regenQueue.shift();
      const concatEntryName = `${entry.collection}/${entry.property}`;

      if (concatEntryName === this.lastRegenerated) {
        warn(`Prevented infinate loop for ${concatEntryName}`);
        this.lastRegenerated = '';
        return;
      }

      this._collections[entry.collection].executeAndAnalyseFilter(
        entry.property
      );

      this.lastRegenerated = concatEntryName;

      Log(
        `There are ${
          this._global.regenQueue.length
        } properties left to regenerate.`
      );
    }
    // loop!
    if (this._global.regenQueue.length > 0) this.processRegenQueue();
    else {
      // if we don't clear the generated filters, the filter analysis will fail next time around, causing an infinate loop! das bad
      // this._global.generatedFilters = new Array();
      this.lastRegenerated = '';
    }
  }

  runOnReadyHandlers() {
    const collections = Object.keys(this._collections);
    for (let i = 0; i < collections.length; i++) {
      const collection = this._collections[collections[i]];
      collection._onReady();
    }
  }

  // react native
  // processCallbacks(data) {
  //   if (!self._subscribers.length) return false;
  //   this._subscribers.forEach(callback => callback(data));
  //   return true;
  // }

  processUndo(thingsToRevert) {
    for (let i = 0; i < thingsToRevert.length; i++) {
      const thing = thingsToRevert[i];
      const collection = this._collections[thing.collection];
      const data = thing.data;
      switch (thing.type) {
        case 'mutation':
          break;
        case 'collect':
          break;
        case 'update':
          collection.update(data.dataId, data.previousValues);
          break;
        case 'put':
          collection.replaceIndex(data.group, data.previousDestIndex);
          break;
        case 'remove':
          collection.replaceIndex(data.group, data.previousValue);
          break;
        case 'move':
          collection.replaceIndex(data.fromIndex, data.previousFromIndexValue);
          if (data.toIndex)
            collection.replaceIndex(data.toIndex, data.previousToIndexValue);
          break;
        case 'delete':
          collection._public[data.primaryKey] = data.deleted;
          collection.internalDataModified(data.primaryKey);
          collection.recordHistory('restore', {
            primaryKey: data.primaryKey,
            deleted: data.deleted
          });
          break;
        case 'restore':
          collection.delete(data.primaryKey);
          break;
        case 'newGroup':
          collection.deleteGroup(data.createdGroup);
          break;
        case 'deleteGroup':
          collection.newGroup(data.group, data.previousValue);
          break;
        case 'indexMutation':
          collection.replaceIndex(data.index, data.previousIndex);
          break;
        case 'decrement':
          collection.increment(
            thing.data.primaryKey,
            thing.data.property,
            thing.data.amount
          );
          break;
        case 'increment':
          collection.decrement(
            thing.data.primaryKey,
            thing.data.property,
            thing.data.amount
          );
          break;
      }
    }
  }
  initJobs(jobs) {
    const context = this._global.dataRef;
    this._jobs = {};
    let keys = Object.keys(jobs);
    for (let i = 0; i < keys.length; i++) {
      let _job = jobs[keys[i]];
      let jobName = keys[i];
      let interval = _job.interval;
      // let condition = _job.condition;
      let execute = _job.execute;

      let job = {};
      // parse interval
      if (typeof interval == 'number') {
        job.interval = interval;
      } else if (typeof interval == 'string') {
        if (interval.includes('s')) {
          job.interval = parseInt(interval.split('s')[0], 10) * 1000;
        } else if (interval.includes('m')) {
          job.interval = parseInt(interval.split('m')[0], 10) * 60000;
        } else if (interval.includes('hr')) {
          job.interval = parseInt(interval.split('hr')[0], 10) * 3600000;
        } else if (interval.includes('d')) {
          job.interval = parseInt(interval.split('d')[0], 10) * 86400000;
        }
      }

      job.execute = () =>
        execute(
          Object.assign(context, {
            endJob: this.endJob.bind(this, jobName)
          })
        );

      // if startImmediate run once
      if (_job.startImmediate) job.execute();

      job.intervalId = setInterval(job.execute, job.interval);
      job.active = true;

      // begin jobs
      if (!this._jobs[jobName]) {
        this._jobs[jobName] = job;
      }
    }
  }
  endJob(jobName) {
    clearInterval(this._jobs[jobName].intervalId);
    this._jobs[jobName].active = false;
  }
}

export default Pulse;
