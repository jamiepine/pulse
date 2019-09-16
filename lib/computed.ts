import { Global } from './interfaces';

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
    this.global.runningComputed = this;

    let output = this.computedFunction(this.global.getContext(this.collection));

    if (output === undefined || output === null) output = false;

    this.global.runningComputed = false;

    return output;
  }
}
