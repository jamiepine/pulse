import { Global, JobType } from './interfaces';

export default class Computed {
  public relatedToGroup: Array<any> = [];
  public relatedToInternalData: Array<any> = [];

  constructor(
    private global: Global,
    public collection: string,
    public name: string,
    private computedFunction: (context: object) => any
  ) {}

  public run() {
    // cleanup before running

    if (this.global.relations) this.global.relations.computedCleanup(this);

    this.global.runningComputed = this;

    let output = this.computedFunction(this.global.getContext(this.collection));

    if (output === undefined || output === null) output = false;

    this.global.runningComputed = false;

    return output;
  }

  addRelationToGroup(collectionName: string, groupName: string): void {}
  addRelationToInternalData(collectionName: string, primaryKey: string): void {
    // const stringified = JSON.stringify({
    //   collection: collectionName,
    //   primaryKey
    // });
    // if (!this.relatedToInternalData.includes(stringified))
    //   this.relatedToInternalData.push(stringified);
  }
}
