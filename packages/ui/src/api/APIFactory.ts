import {
  type Static,
  type TArray,
  type TLiteral,
  type TObject,
  type TUndefined,
  Type,
} from "@sinclair/typebox";
import type { AxiosRequestConfig } from "axios";
import {
  useMutation,
  type UseMutationResult,
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import { HttpMethod, type IHttpClientFactory } from "./@types";

export { Type as t };

export enum Method {
  GET,
  POST,
  PUT,
  PATCH,
  DELETE,
}

type Context = {
  url: string;
  method: TLiteral;
  response: TObject | TArray | TUndefined;
  query: TObject | TUndefined;
  parameter: TObject | TUndefined;
  body: TObject | TUndefined;
  withOptions: TLiteral<true | false>; // 0=false, 1=true
  config?: AxiosRequestConfig;
  isNotUnwrap?: boolean;
  cacheTime?: number;
};

type Request<Q, P, B, R> = Q extends Map
  ? Request<undefined, P, B, { query: Q }>
  : P extends Map
  ? Request<undefined, undefined, B, R & { parameter: P }>
  : B extends Map
  ? Request<undefined, undefined, undefined, R & { body: B }>
  : R;

type Req<Q, P, B> = {
  query?: Q;
  parameter?: P;
  body?: B;
};

export type Config = {
  [K: string]: Context;
};

export type Map = { [key: string]: any };

type FuncIsGet<M, F1 extends Function, F2 extends Function> = M extends 0
  ? F1
  : F2;
type FuncReturn<R> = () => R;

export type Func<R, Q, P, B, M> = Q extends Map
  ? P extends Map
  ? B extends Map
  ? FuncIsGet<M, (query: Q, param: P, body: B) => R, FuncReturn<R>> // E
  : FuncIsGet<M, (query: Q, param: P) => R, FuncReturn<R>> // B
  : B extends Map
  ? FuncIsGet<M, (query: Q, body: B) => R, FuncReturn<R>> // C
  : FuncIsGet<M, (query: Q) => R, FuncReturn<R>> // A
  : P extends Map
  ? B extends Map
  ? FuncIsGet<M, (param: P, body: B) => R, FuncReturn<R>> // D
  : FuncIsGet<M, (param: P) => R, FuncReturn<R>> // F
  : B extends Map
  ? FuncIsGet<M, (body: B) => R, FuncReturn<R>> // G
  : FuncReturn<R>; // 0

export class ApiFactory<_A extends Config, MapFunc extends Map> {
  constructor(
    private _http: IHttpClientFactory,
    private _fn: MapFunc
  ) {
  }

  private async _call<R, Q, P, B>(ctx: Context, req: Req<Q, P, B>): Promise<R> {
    const res = await this._http.handler<R, Q, P, B>(
      ctx.url,
      ctx.method.const as HttpMethod,
      req,
      ctx.config,
      ctx.isNotUnwrap
    );
    return res;
  }

  private _action<R, Q, P, B>(ctx: Context, req: Req<Q, P, B>) {
    if (ctx.method.const === 0) {
      if (ctx.withOptions.const) {
        return {
          use: (options?: UseQueryOptions<R, unknown, R, [string, Req<Q, P, B>]>) =>
            useQuery<R, unknown, R, [string, Req<Q, P, B>]>({
              queryKey: [ctx.url, { ...req }],
              queryFn: () => this._call<R, Q, P, B>(ctx, req),
              refetchOnWindowFocus: false,
              gcTime: ctx.cacheTime,
              ...options,
            }),
        };
      } else {
        return useQuery<R, unknown, [string, Req<Q, P, B>]>({
          queryKey: [ctx.url, { ...req }],
          queryFn: () => this._call<R, Q, P, B>(ctx, req),
          refetchOnWindowFocus: false,
          gcTime: ctx.cacheTime,
        });
      }
    } else {
      return useMutation<R, unknown, Req<Q, P, B>, unknown>({
        mutationFn: (req) => this._call<R, Q, P, B>(ctx, req),
      });
    }

    return () => { };
  }

  public createService<C extends Config>(
    c: C
  ): ApiFactory<
    C
    , MapFunc & {
      [K in keyof C]: Func<
        Static<C[K]["response"]>,
        Static<C[K]["query"]>,
        Static<C[K]["parameter"]>,
        Static<C[K]["body"]>,
        Static<C[K]["method"]>
      >;
    }
  > {
    Object.entries(c).forEach(([key, ctx]) => {
      type Query = Static<typeof ctx.query>;
      type Parameter = Static<typeof ctx.parameter>;
      type Body = Static<typeof ctx.body>;

      this._fn = {
        ...this._fn,
        [key]:
          ctx.query.type !== "undefined"
            ? ctx.parameter.type !== "undefined"
              ? ctx.body.type !== "undefined"
                ? (query: Query, param: Parameter, body: Body) =>
                  this._call(ctx, { query, parameter: param, body })
                : (query: Query, param: Parameter) =>
                  this._call(ctx, { query, parameter: param })
              : ctx.body.type !== "undefined"
                ? (query: Query, body: Body) => this._call(ctx, { query, body })
                : (query: Query) => this._call(ctx, { query })
            : ctx.parameter.type !== "undefined"
              ? ctx.body.type !== "undefined"
                ? (param: Parameter, body: Body) =>
                  this._call(ctx, { parameter: param, body })
                : (param: Parameter) => this._call(ctx, { parameter: param })
              : ctx.body.type !== "undefined"
                ? (body: Body) => this._call(ctx, { body })
                : () => this._call(ctx, {}),
      };
    });

    return new ApiFactory<
      C,
      MapFunc & { [K in keyof C]: Func<object, object, object, object, 0> }
    >(
      this._http,
      this._fn as MapFunc & {
        [K in keyof C]: Func<object, object, object, object, 0>;
      }
    );
  }

  public createHook<C extends Config>(
    c: C
  ): ApiFactory<
    C,
    MapFunc & {
      [K in keyof C]: Func<
        Static<C[K]["method"]> extends 0
        ? Static<C[K]["withOptions"]> extends false
        ? UseQueryResult<Static<C[K]["response"]>>
        : {
          use: (
            options: UseQueryOptions
          ) => UseQueryResult<Static<C[K]["response"]>>;
        }
        : UseMutationResult<
          Static<C[K]["response"]>,
          unknown,
          Request<
            Static<C[K]["query"]>,
            Static<C[K]["parameter"]>,
            Static<C[K]["body"]>,
            Map
          >
        >,
        Static<C[K]["query"]>,
        Static<C[K]["parameter"]>,
        Static<C[K]["body"]>,
        Static<C[K]["method"]>
      >;
    }
  > {
    Object.entries(c).forEach(([key, ctx]) => {
      type Response = Static<typeof ctx.response>;
      type Query = Static<typeof ctx.query>;
      type Parameter = Static<typeof ctx.parameter>;
      type Body = Static<typeof ctx.body>;

      const action = <R, Q, P, B>(req: Req<Q, P, B>) => {
        return this._action<R, Q, P, B>(ctx, req);
      };

      this._fn = {
        ...this._fn,
        [key]:
          ctx.query.type !== "undefined"
            ? ctx.parameter.type !== "undefined"
              ? ctx.body.type !== "undefined"
                ? (query: Query, param: Parameter, body: Body) =>
                  action<Response, Query, Parameter, Body>({
                    query,
                    parameter: param,
                    body,
                  })
                : (query: Query, param: Parameter) =>
                  action<Response, Query, Parameter, Body>({
                    query,
                    parameter: param,
                  })
              : ctx.body.type !== "undefined"
                ? (query: Query, body: Body) =>
                  action<Response, Query, Parameter, Body>({ query, body })
                : (query: Query) =>
                  action<Response, Query, Parameter, Body>({ query })
            : ctx.parameter.type !== "undefined"
              ? ctx.body.type !== "undefined"
                ? (param: Parameter, body: Body) =>
                  action<Response, Query, Parameter, Body>({
                    parameter: param,
                    body,
                  })
                : (param: Parameter) =>
                  action<Response, Query, Parameter, Body>({
                    parameter: param,
                  })
              : ctx.body.type !== "undefined"
                ? (body: Body) =>
                  action<Response, Query, Parameter, Body>({ body })
                : () => action<Response, Query, Parameter, Body>({}),
      };
    });

    return new ApiFactory<
      C,
      MapFunc & { [K in keyof C]: Func<object, object, object, object, 0> }
    >(
      this._http,
      this._fn as MapFunc & {
        [K in keyof C]: Func<object, object, object, object, 0>;
      }
    );
  }


  public get api() {
    return this._fn;
  }
}
