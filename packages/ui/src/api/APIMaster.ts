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

const methods = (method: "GET" | "POST" | "PUT" | "DELETE") =>
  Literal(Method[method]);

export type TApiMaster<T extends TModelMaster> = {
  [K: string]: {
    description: string;
    url: string;
    methods: "GET" | "POST" | "PUT" | "DELETE";
    response: keyof T | undefined;
    query?: keyof T;
    parameter?: keyof T;
    body?: keyof T;
    withOptions: boolean;
  };
};

export class ApiMaster<M extends TModelMaster, A extends TApiMaster<M>> {
  private _models: ModelFactory<M, { [K in keyof M]: M[K] }>;

  constructor(
    private _modelConfig: M,
    private _apis: A,
    private _apiFactory: ApiFactory<Config, {}>
  ) {
    this._models = new ModelFactory(this._modelConfig);
  }
  public get apiNames(): { [K in keyof A]: Extract<keyof A, string> } {
    return Object.keys(this._apis).reduce(
      (acc, key) => {
        return { ...acc, [key]: key };
      },
      {} as { [K in keyof A]: Extract<keyof A, string> }
    );
  }

  public get models() {
    return this._models;
  }

  public get apis() {
    return this._apis
  }

  public get api(): {
    [K in keyof A]: Func<
      Record<string, any>,
      A[K]["query"] extends string ? Record<string, any> : undefined,
      A[K]["parameter"] extends string ? Record<string, any> : undefined,
      A[K]["body"] extends string ? Record<string, any> : undefined,
      0
    >;
  } {
    const apis = Object.entries(this._apis).reduce((acc, [key, value]) => {
      // const x = value.parameter
      // ? convertTModelToTypeBox(this._modelConfig[value.parameter as keyof M])
      // : t.Undefined();
      // console.log(value.description, value.parameter, x);

      // console.log('value', value)

      return {
        ...acc,
        [key]: {
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
        },
      };
    }, {} as Config);

    // console.log(apis);
    return this._apiFactory.createService(apis as Config).api as any;
  }

  public modelOf(key: keyof M) {
    return this._modelConfig[key as keyof M]
  }
}

// const base = ModelFactory.base({
//   pagination: {
//     type: "object",
//     collection: {
//       page: "number",
//       limit: "number",
//       total: "number",
//       totalPages: "number",
//     },
//   },
// });

// export const apiMaster = new ApiMaster(
//   {
//     todoRes: {
//       data: {
//         type: "array",
//         collection: {
//           id: "number",
//           name: "string",
//           email: "string",
//           age: "number",
//           role: "string",
//         },
//       },
//       pagination: base.pagination,
//     },
//     todoPram: {
//       id: "number",
//     },
//   },
//   {
//     todos: {
//       url: "/todos",
//       description: "Get all todos",
//       methods: "GET",
//       response: "todoRes",
//       withOptions: false,
//     },
//     todoByID: {
//       url: "/todos/:id",
//       description: "Get todo by id",
//       methods: "GET",
//       response: "todoRes",
//       parameter: "todoPram",
//       withOptions: false,
//     },
//   },
//   apiFactory
// );

// // const key = apiMaster.apiNames.todos
// // const res = await apiMaster.api.todoByID({ id: 1 });
// // console.log(res);
// // console.log(key)
