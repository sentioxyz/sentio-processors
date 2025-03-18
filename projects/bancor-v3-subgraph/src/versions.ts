export class VersionsClass {
  getSchemaVersion(): string {
    return "1.3.0";;
  }

  getSubgraphVersion(): string {
    return "1.0.3";;
  }

  getMethodologyVersion(): string {
    return "1.0.0";;
  }
}


export const Versions = new VersionsClass();
