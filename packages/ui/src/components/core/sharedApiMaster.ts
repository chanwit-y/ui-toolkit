import { ApiFactory, type HttpClientFactory } from "../../api";
import { ApiMaster, type TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";

type AnyApiMaster = ApiMaster<TModelMaster, TApiMaster<TModelMaster>>;

/**
 * One `ApiMaster` per `(http, model, api)` triple, shared by every page's
 * `Core`, `GlobalLoads` and the sign-in's profile load (see the grilled design
 * `split-pages-lazy-load`). An `ApiMaster` holds only config-derived things —
 * the TypeBox schemas and the bound request functions — so pages can share it;
 * before, each page built its own and converted every model again. Keyed by
 * identity through `WeakMap`s, so a new config object gets a fresh instance
 * and a dropped one is collected.
 */
const cache = new WeakMap<object, WeakMap<object, WeakMap<object, AnyApiMaster>>>();

export function sharedApiMaster(http: HttpClientFactory, model: TModelMaster, api: Record<string, any>): AnyApiMaster {
  let byModel = cache.get(http);
  if (!byModel) cache.set(http, (byModel = new WeakMap()));
  let byApi = byModel.get(model);
  if (!byApi) byModel.set(model, (byApi = new WeakMap()));
  let master = byApi.get(api);
  if (!master) {
    master = new ApiMaster(model, api as TApiMaster<TModelMaster>, new ApiFactory(http, {})) as AnyApiMaster;
    byApi.set(api, master);
  }
  return master;
}
