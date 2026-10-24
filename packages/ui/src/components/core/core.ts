import type { TModelMaster } from "../../model/master";
import type { HttpClientFactory } from "../../api";
import type { ApiMaster, TApiMaster } from "../../api/APIMaster";
import { ContainerBuilder } from "./containerBuilder";
import { sharedApiMaster } from "./sharedApiMaster";

import type { Container, PageLoad } from "../@types";

let constructed = 0;

/** How many `Core`s were constructed since the last reset — for tests and benchmarks. */
export function coreStats(): { constructed: number } {
  return { constructed };
}

export function resetCoreStats(): void {
  constructed = 0;
}

export class Core {
  private _apis: ApiMaster<TModelMaster, TApiMaster<TModelMaster>>;

  constructor(
    http: HttpClientFactory,
    model: TModelMaster,
    api: Record<string, any>,
    private _containers: Container[],
    /** Page-level data loads (`PageElement.loads`), mounted once above the containers. */
    private _loads: PageLoad[] = []
  ) {
    // Shared per (http, model, api): every page of an app reuses one set of schemas and request functions.
    this._apis = sharedApiMaster(http, model, api);
    constructed += 1;
  }

  public run() {
    return new ContainerBuilder(this._containers, this._apis, this._loads).draw(true, false);
  }
}
