import { protectedNames, arrayFunctions, isWatchableObject } from './helpers';
import Dep from './dep';
import { Global } from './interfaces';
import Collection from './collection';

interface Obj {
  [key: string]: any;
}

export default class Reactive {
  public properties: Array<string>;
  public object: Obj;
  private dispatch: any;
  private allowPrivateWrite: boolean = false;
  private touching: boolean = false;
  private touched: null | Dep;
  private sneaky: boolean;
  private tempDeps: { [key: string]: Dep } = {};

  constructor(
    object: Obj = {},
    private global: Global,
    private collection: Collection,
    public mutable: Array<string>,
    public type: 'root' | 'indexes'
  ) {
    this.dispatch = this.global.dispatch;
    this.properties = Object.keys(object);

    this.object = this.reactiveObject(object);
  }

  reactiveObject(object: Obj, rootProperty?: string): object {
    const objectKeys = Object.keys(object);

    // Loop over all properties of the to-be reactive object
    for (let i = 0; i < objectKeys.length; i++) {
      const key = objectKeys[i];
      this.defineProperty(object, key, rootProperty);
    }
    return object;
  }

  private defineProperty(
    object: Obj,
    key: string,
    rootProperty?: string
  ): object {
    const self = this;
    let value = object[key];
    if (object.rootProperty) rootProperty = object.rootProperty;

    // // If property is an array, make it reactive
    // if (Array.isArray(value)) {
    //   // value = this.reactiveArray(value, key);
    // }

    // rootProperty should be the current key if first deep object
    if (isWatchableObject(value) && !protectedNames.includes(key)) {
      value = this.deepReactiveObject(value, rootProperty || key, key);
    }

    // Create an instance of the dependency tracker
    const dep = this.createDep(key, rootProperty);

    Object.defineProperty(object, key, {
      get: function pulseGetter() {
        if (self.sneaky) return value;

        if (self.global.touching) {
          self.global.touched = dep;
          return value;
        }
        dep.register();

        return value;
      },
      set: function pulseSetter(newValue) {
        // DEEP REACTIVE handler: "rootProperty" indicates if the object is "deep".
        if (rootProperty && self.mutable.includes(rootProperty)) {
          // mutate locally
          value = newValue;
          // dispatch mutation for deep property
          self.dispatch('mutation', {
            collection: self.collection.name,
            key: rootProperty,
            value: self.object[rootProperty],
            dep
          });

          // Regular muations
        } else {
          // if a protected name allow direct mutation
          if (protectedNames.includes(key)) {
            return (value = newValue);
          }
          // if backdoor open allow direct mutation
          if (self.allowPrivateWrite) {
            // dynamically convert new values to reactive if objects
            // This is risky as fuck and kinda doesn't even work
            if (isWatchableObject(value) && self.mutable.includes(key)) {
              // debugger;
              newValue = self.deepReactiveObject(
                newValue,
                rootProperty || key,
                key
              );
            }
            return (value = newValue);
          }

          // if property is mutable dispatch update
          if (self.mutable.includes(key)) {
            self.dispatch('mutation', {
              collection: self.collection.name,
              key,
              value: newValue,
              dep
            });
            // we did not apply the mutation since runtime will privatly
            // write the result since we dispatched above
          }
        }
      }
    });
    return object;
  }

  public addProperty(key, value) {
    this.object[key] = value;
    this.defineProperty(this.object, key);
  }

  public tempDep(property) {
    const dep = this.createDep(property);
    this.tempDeps[property] = dep;
    return dep;
  }

  private cloneDep(dep: Dep) {
    dep = Object.assign(Object.create(Object.getPrototypeOf(dep)), dep);
    // debugger;
    // delete this.tempDeps[dep.propertyName];
    return dep;
  }

  private createDep(key: string, rootProperty?: string) {
    let dep: Dep;
    if (this.tempDeps.hasOwnProperty(key) && !rootProperty) {
      dep = this.cloneDep(this.tempDeps[key]);
    } else {
      dep = new Dep(
        this.global,
        this.type === 'indexes' ? 'index' : 'reactive',
        this.collection,
        key,
        rootProperty
      );
    }
    return dep;
  }

  private deepReactiveObject(
    value,
    rootProperty?: string,
    propertyName?: string
  ) {
    let objectWithCustomPrototype = Object.create({
      rootProperty,
      propertyName
    });

    // repopulate custom object with incoming values
    const keys = Object.keys(value);
    for (let i = 0; i < keys.length; i++) {
      const property = keys[i];
      objectWithCustomPrototype[property] = value[property];
    }

    this.allowPrivateWrite = true;
    const obj = this.reactiveObject(objectWithCustomPrototype, rootProperty);
    this.allowPrivateWrite = false;
    return obj;
  }

  reactiveArray(array, key) {
    const self = this;
    const reactiveArray = array.slice();

    for (let i = 0; i < arrayFunctions.length; i++) {
      const func = arrayFunctions[i];
      const original = Array.prototype[func];
      Object.defineProperty(reactiveArray, func, {
        value: function() {
          const result = original.apply(this, arguments);
          if (self.global.initComplete)
            self.dispatch('mutation', {
              collection: self.collection.name,
              key,
              value: result
            });
          return result;
        }
      });
    }
    return reactiveArray;
  }

  public privateWrite(property, value) {
    this.allowPrivateWrite = true;
    this.object[property] = value;
    this.allowPrivateWrite = false;
  }

  // sneaky blocked the getter, sneaky.
  public privateGet(property) {
    this.sneaky = true;
    const data = this.object[property];
    this.sneaky = false;
    return data;
  }

  public exists(property: string): boolean {
    this.sneaky = true;
    const bool = !!this.object.hasOwnProperty(property);
    this.sneaky = false;
    return bool;
  }

  public getKeys(): Array<string> {
    this.sneaky = true;
    const keys = Object.keys(this.object);
    this.sneaky = false;
    return keys;
  }
}

// look for computed output access to determine dependencies
// remove computed categories from public object on default config
