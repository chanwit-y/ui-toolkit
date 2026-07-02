import { Literal } from "@sinclair/typebox";
import { ApiFactory, Method, t, type Config, type Func } from "./APIFactory";
// import { HttpClientFactory } from "./HttpClientFactory";
import { ModelFactory, type TModelMaster } from "../model/master";
import { convertTModelToTArray, convertTModelToTypeBox } from "../model";

// const http = new HttpClientFactory(
//   `http://localhost:3001`,
//   async () => "",
//   "1.0.0",
//   120000,
//   [],
//   []
// );
// const apiFactory = new ApiFactory(http, {});

const methods = (method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE") =>
  Literal(Method[method]);

export type TApiMaster<T extends TModelMaster> = {
  [K: string]: {
    description: string;
    url: string;
    methods: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    response: keyof T | undefined;
    query?: keyof T;
    parameter?: keyof T;
    body?: keyof T;
    withOptions: boolean;
  };
};

type BuiltApi<M extends TModelMaster, A extends TApiMaster<M>> = {
  [K in keyof A]: Func<
    Record<string, any>,
    A[K]["query"] extends string ? Record<string, any> : undefined,
    A[K]["parameter"] extends string ? Record<string, any> : undefined,
    A[K]["body"] extends string ? Record<string, any> : undefined,
    0
  >;
};

export class ApiMaster<M extends TModelMaster, A extends TApiMaster<M>> {
  private _models: ModelFactory<M, { [K in keyof M]: M[K] }>;
  private _apiNames?: { [K in keyof A]: Extract<keyof A, string> };
  private _builtApi?: BuiltApi<M, A>;

  constructor(
    private _modelConfig: M,
    private _apis: A,
    private _apiFactory: ApiFactory<Config, {}>
  ) {
    this._models = new ModelFactory(this._modelConfig);
  }
  public get apiNames(): { [K in keyof A]: Extract<keyof A, string> } {
    if (!this._apiNames) {
      this._apiNames = Object.keys(this._apis).reduce(
        (acc, key) => {
          acc[key as keyof A] = key as Extract<keyof A, string>;
          return acc;
        },
        {} as { [K in keyof A]: Extract<keyof A, string> }
      );
    }
    return this._apiNames;
  }

  public get models() {
    return this._models;
  }

  public get apis() {
    return this._apis
  }

  public get api(): BuiltApi<M, A> {
    // Schema conversion and service creation are expensive; build once and
    // reuse — this getter is hit on every element render in the core engine.
    if (!this._builtApi) {
      this._builtApi = this._buildApi();
    }
    return this._builtApi;
  }

  private _buildApi(): BuiltApi<M, A> {
    const apis = Object.entries(this._apis).reduce((acc, [key, value]) => {
      acc[key] = {
        url: value.url,
        method: methods(value.methods),
        response:
          this._modelConfig[value.response as keyof M]["type"] === "array"
            ? convertTModelToTArray(
              this._modelConfig[value.response as keyof M]
            )
            : convertTModelToTypeBox(
              this._modelConfig[value.response as keyof M]
            ),
        query: value.query
          ? convertTModelToTypeBox(this._modelConfig[value.query as keyof M])
          : t.Undefined(),
        parameter: value.parameter
          ? convertTModelToTypeBox(
            this._modelConfig[value.parameter as keyof M]
          )
          : t.Undefined(),
        body: value.body
          ? convertTModelToTypeBox(this._modelConfig[value.body as keyof M])
          : t.Undefined(),
        withOptions: t.Literal(value.withOptions),
      };
      return acc;
    }, {} as Config);

    return this._apiFactory.createService(apis as Config).api as any;
  }

  public modelOf(key: keyof M) {
    return this._modelConfig[key as keyof M]
  }
}
