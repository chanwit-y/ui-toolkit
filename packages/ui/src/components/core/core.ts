import type { TModelMaster } from "../../model/master";
import { ApiFactory, HttpClientFactory } from "../../api";
import { ApiMaster, type TApiMaster } from "../../api/APIMaster";
import { ContainerBuilder } from "./containerBuilder";

import type { Container } from "../@types";
import type { IAuthContext } from "../../auth/@types";

export class Core {
  private _apiFactory: ApiFactory<any, {}>;
  private _modelConfig: TModelMaster;
  private _apiConfig: TApiMaster<any>;
  private _apis: ApiMaster<typeof this._modelConfig, typeof this._apiConfig>;

  constructor(
    private _http: HttpClientFactory,
    private _model: TModelMaster,
    private _api: Record<string, any>,
    private _containers: Container[]
  ) {
    this._apiFactory = new ApiFactory(this._http, {});
    this._modelConfig = this._model;
    this._apiConfig = this._api as TApiMaster<any>;
    this._apis = new ApiMaster(
      this._modelConfig,
      this._apiConfig,
      this._apiFactory
    );
  }

  public useAuthCtx(_hookAuthCtx: () => IAuthContext<any>): Core {
    return this;
  }

  public run() {
    return new ContainerBuilder(this._containers, this._apis).draw(true, false);
  }
}
