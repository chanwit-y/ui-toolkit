import type { TModelMaster } from "../../model/master";
import { ApiFactory, HttpClientFactory } from "../../api";
import { ApiMaster, type TApiMaster } from "../../api/APIMaster";
import { ContainerBuilder } from "./containerBuilder";

import type { Container } from "../@types";
import type { IAuthContext } from "../../auth/@types";
// import { Env } from "../../auth/azure/Env";
// import { getAccessToken } from "../../auth/azure/MsalInstance";

// import { model } from "./mock/sourceApp/model";
// import { api } from "./mock/sourceApp/api";
// import { containerSourceAppList } from "./mock/sourceApp/container";

// import { model } from "./mock/company/model";
// import { api } from "./mock/company/api";
// import {  containerCompanyList } from "./mock/company/container";

export class Core {
  // Move to config
  //   private _http = new HttpClientFactory(
  //     Env.API_URL || "",
  //     getAccessToken,
  //     "1.0.0",
  //     120000
  //   );

  private _apiFactory: ApiFactory<any, {}>; //= new ApiFactory(this._http, {});
  private _modelConfig: TModelMaster;
  private _apiConfig: TApiMaster<any>;
  private _apis: ApiMaster<typeof this._modelConfig, typeof this._apiConfig>;

  // private _hookAuthCtx?: () => IAuthContext<any>;

  constructor(
    private _http: HttpClientFactory,
    private _model: TModelMaster,
    private _api: Record<string, any>,
    private _constainers: Container[]
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
    // this._hookAuthCtx = hookAuthCtx;
    return this;
  }

  public run() {
    return new ContainerBuilder(this._constainers, this._apis).draw(true, false);
  }
}

// export const core = new Core();
