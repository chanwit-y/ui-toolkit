import type { AxiosError, AxiosRequestConfig,  AxiosResponse } from 'axios';

export enum HttpMethod {
  GET,
  POST,
  PUT,
  PATCH,
  DELETE,
}

// export type HttpClientFactoryType<G, K> = {
//   group: G;
//   apis: Api<K>[];
// };

// export type Api<K> = {
//   key: K;
//   method: HttpMethod;
//   url: string;
//   axiosRequestConfig?: AxiosRequestConfig;
// };

export type None = undefined;

export type Request<Q = undefined, P = undefined, B = undefined> = {
  stringQuery?: Q;
  query?: Q;
  parameter?: P;
  body?: B;
};

//AxiosResponse
export type ErrorFunction = (error: AxiosError) => Promise<any>;
export type LogFunction = (response: AxiosResponse) => void;

export interface IHttpClientFactory {
  // handler<R, Q, P, B>(
  //   group: unknown,
  //   key: unknown,
  //   request: Request<Q, P, B>
  // ): Promise<AxiosResponse<R, any>>;
  handler<R, Q, P, B>(
    apiURL: string,
    method: HttpMethod,
    request: Request<Q, P, B>,
    config?: AxiosRequestConfig,
    isNotUnwrap?: boolean
  ): Promise<R>;
}

export const FnNone = <T>() => {
  return {} as T;
};

export type HttpDecoratorReq = {
  http: IHttpClientFactory;
  apiUrl: string;
  httpMethod: HttpMethod;
  config?: AxiosRequestConfig;
  isNotUnwrap?: boolean;
};

// z;

// export type ApiConfig = {
//   [K: string]: {
//     Response: z.ZodType;
//   };
// };

// type Response<T> = z.ZodType<T>;
// type Query<T> = z.ZodType<T>;

// type Api<R, Q> = {
//   Response: Response<R>;
//   Query: Query<Q>;
// };

// // type ApiConfig = {
// //   getProfileByEmail: Api<{ userId: number; email: string }, { email: string }>;
// // };

// // type ApiConfig2 = {
// //   getProfileByEmail: (query: { email: string }) => {
// //     userId: number;
// //     email: string;
// //   };
// // };

// type A<T> = {
//   [K in keyof T]: T[K] extends Api<infer R, infer Q> ? (query: Q) => R : never;
// };

// type ObjOrNone = object | undefined;

// export type ApiResReq<
//   R extends ObjOrNone = undefined,
//   Q extends ObjOrNone = undefined,
//   P extends ObjOrNone = undefined,
//   B extends ObjOrNone = undefined
// > = {
//   response: R;
//   query: Q;
//   param: P;
//   body: B;
// };

// // type ApiBase = {
// //   [key: string]: ApiResReq;
// // };

// type FFactory<R, Q, P, B> = Q extends object
//   ? P extends object
//     ? B extends object
//       ? (query: Q, param: P, body: B) => R
//       : (query: Q, param: P) => R
//     : (query: Q) => R
//   : never;

// type FnFactory<T> = {
//   [K in keyof T]: T[K] extends ApiResReq<infer R, infer Q, infer P, infer B>
//     ? Q extends object
//       ? P extends object
//         ? B extends object
//           ? (query: Q, param: P, body: B) => R
//           : (query: Q, param: P) => R
//         : (query: Q) => R
//       : never
//     : never;
// };
// //  & {
// //   getProfileByEmail: (query: { email: string }) => {
// //     userId: number;
// //     email: string;
// //   };
// //   getUserProfile: (
// //     query: { email: string },
// //     param: { p: string }
// //   ) => { userId: number; email: string };
// //   getB: (query: { email: string }) => void;
// // };

// type Y = {
//   getProfileByEmail: ApiResReq<
//     { userId: number; email: string },
//     { email: string },
//     undefined,
//     undefined
//   >;
//   getUserProfile: ApiResReq<
//     { userId: number; email: string },
//     { email: string },
//     { p: string },
//     undefined
//   >;
// };

// type X = {
//   getProfileByEmail: ApiResReq<
//     { userId: number; email: string },
//     { email: string },
//     undefined,
//     undefined
//   >;
//   getUserProfile: ApiResReq<
//     { userId: number; email: string },
//     { email: string },
//     { p: string },
//     undefined
//   >;
//   getB: ApiResReq<undefined, { email: string }, undefined, undefined>;
// };

// // type FnQ<R, Q> = (query: Q) => R;

// // type F = (query: string) => string

// // type TestFnQ = F  extends FnQ<string, string> ? true : false;

// // type ExtendOf<A, B> = A  extends B ? true : false

// type TestApiFactory = FnFactory<X>;

// // type A =

// // type ExtendOf< this.api['getProfileByEmail'], (query: { email: string }) => { userId: number; email: string }> = true;

// type aaa = {
//   fn1: {
//     response: any;
//     query: any;
//     parameter: any;
//     body: z.ZodType;
//   };
// };

// class AF<T extends FnFactory<X>> {
//   public api: T = {} as T;
//   // public a = {};

//   constructor() {
//     Object.entries(this.api).forEach(([k, e]) => {
//       // this.api[k] = (query: e.query) => {
//       //   return {} as e.response;
//       // };
//     });

//     this.api['getProfileByEmail'] = (query) => {
//       return { userId: 1, email: 'test' };
//     };
//     // this.a[]
//     // this.api.
//   }

//   // public F() {
//   //   return this.res;
//   // }
// }

// // const a = new AF<TestApiFactory>();

// // const xxx = a.api.getProfileByEmail({ email: 'test' });
// // const b = a.api.getUserProfile({ email: 'test' }, { p: 'test' });

// type ApiConfig<
//   R extends ObjOrNone = undefined,
//   Q extends ObjOrNone = undefined,
//   P extends ObjOrNone = undefined,
//   B extends ObjOrNone = undefined
// > = {
//   url: string;
//   method: HttpMethod;
//   fn: FnFactory<ApiResReq<R, Q, P, B>>;
// };

// type ApiConfigs<T extends ApiConfig> = { [K: string]: T };

// type S1 = '/user-profile/email';
// type S2 = string;
// type CheckS1S2 = S1 extends S2 ? true : false;

// type HttpMethodGet = HttpMethod.GET;
// type CheckHttpMethod = HttpMethodGet extends HttpMethod.GET ? true : false;

// type Fn1 = ApiResReq<
//   { userId: number; email: string },
//   { email: string },
//   undefined,
//   undefined
// >;

// type CheckType = { userId: number; email: string } extends object
//   ? true
//   : false;

// type F = {
//   url: '/user-profile/email';
//   method: HttpMethod.GET;
//   fn: FnFactory<
//     ApiResReq<
//       { userId: number; email: string },
//       { email: string },
//       undefined,
//       undefined
//     >
//   >;
// };

// type CheckFn1 = Fn1 extends ApiResReq<infer R, infer Q, infer P, infer B>
//   ? true
//   : false;

// type CheckApiFactory = F extends ApiConfig<infer R, infer Q, infer P, infer B>
//   ? true
//   : false;

// export type FX = {
//   userProfileByEmail: {
//     url: '/user-profile/email';
//     method: HttpMethod.GET;
//     fn: FnFactory<
//       ApiResReq<
//         { userId: number; email: string },
//         { email: string },
//         undefined,
//         undefined
//       >
//     >;
//   };
// };

// // type XXX = {
// //   [K: string]: FnFactory<>
// // }

// type CheckApiConfigs = FX extends {
//   [K: string]: ApiConfig<infer R, infer Q, infer P, infer B>;
// }
//   ? true
//   : false;

// type ApiConfigX<T> = T extends {
//   [K: string]: ApiConfig<infer R, infer Q, infer P, infer B>;
// }
//   ? true
//   : false;

// type ApiConfigsX<
//   R extends ObjOrNone,
//   Q extends ObjOrNone,
//   P extends ObjOrNone,
//   B extends ObjOrNone
// > = {
//   [K: string]: ApiConfig<R, Q, P, B>;
// };

// type Z = {
//   [K: string]: {
//     url: string;
//     method: HttpMethod;
//     fn: Fn;
//   };
// };

// type Z2<T extends Function> = {
//   url: string;
//   method: HttpMethod;
//   fn: T;
// };

// // type zz = {
// // u: ApiResReq<
// //         { userId: number; email: string },
// //         { email: string },
// //         undefined,
// //         undefined
// //       >
// // }

// type Fn = {
//   response: z.ZodType;
//   query: z.ZodType;
//   parameter: z.ZodType;
//   body: z.ZodType;
// };

// const zz: Fn = {
//   response: z.object({
//     userId: z.number(),
//     email: z.string(),
//   }),
//   query: z.object({
//     email: z.string(),
//   }),
//   parameter: z.object({}),
//   body: z.object({}),
// };

// export const x: Z = {
//   getProfileByEmail: {
//     url: '/user-profile/email',
//     method: HttpMethod.GET,
//     fn: zz,
//   },
// };
// // export class AF2<
// //   T extends ApiConfigsX<ObjOrNone, ObjOrNone, ObjOrNone, ObjOrNone>
// // > {

// // class AF<T extends FnFactory<X>> {

// export class AF3 {
//   // public api: Record<string, FnFactory> = {};

//   constructor() {
//     // Object.entries(z).forEach(([k, e]) => {
//     //   if(e.fn.query) {
//     //     type r = z.infer<typeof e.fn.response>;
//     //     type q = z.infer<typeof e.fn.query>;
//     //     // this.api[k] =  {
//     //     //   get: (query: q): r => {
//     //     //     return {} as r;
//     //     //   }
//     //     // }
//     //     }
//     //     // const x = this.api[k]
//     //     // this.api[k] = (query: q) => {
//     //     // }
//     //   }
//     //   // this.api[k] = ()
//     // });
//   }

//   public api<T>(): FnFactory<T> {
//     const a = {} as FnFactory<T>;

//     return a;
//   }
// }

// type ApiConfigs2<T> = { [K: string]: T };
// type A1 = ApiConfigs2<FnFactory<X>>;
// type XXX = { [K: string]: (q: object) => void };

// // type uFn = Record<string, (q: object) => void> &  Record<string, (q: object, p: object) => void>
// // export class AF4<T> {
// //   public api1: Record<string, (q: object) => void> = {}

// //   // public api {
// //   //   getProfileByEmail: (q: { email: string }) => {},
// //   // };

// //   constructor() {

// //     this.api1['getProfileByEmail'] = (q: { email: string }) => {
// //     }

// //     // this.api = {
// //     //   "getProfileByEmail": (query: { email: string }) => {
// //     //     return { userId: 1, email: 'test' };
// //     //   },
// //     //   // getUserProfile: (query: { email: string }, param: { p: string }) => {
// //     //   //   return { userId: 1, email: 'test' };
// //     //   // },
// //     //   // getB: (query: { email: string }) => {
// //     //   // }
// //     // }
// //     // this.api?.getProfileByEmail = (q:{email: string}) => {
// //     //   return undefined
// //     // }
// //   }

// //   // constructor() {
// //   //   this.api['getProfileByEmail'] = (query) => {
// //   //     return { userId: 1, email: 'test' };
// //   //   };
// //   // }
// // }

// export class AF2u<T extends ApiConfigs<ApiConfig>> {
//   // public api: ApiConfigs<ApiConfig> = {};
//   public api: T = {} as T;
//   // public api: T = {} as T;
//   // public a = {};

//   constructor(z1: Z) {
//     console.log('Hi');

//     Object.entries(z1).forEach(([k, e]) => {
//       console.log(k);
//       console.log(e);

//       const q = z.object({
//         userId: z.number(),
//         email: z.string(),
//       });

//       type query = z.infer<typeof q>;

//       // type a = {
//       //   getProfileByEmail: ApiResReq<any, query, undefined, undefined>;
//       // };

//       // type instanceOf<T> = T extends object ? true : false;

//       // type b = instanceOf<query>;

//       type fn = FFactory<void, query, undefined, undefined>;

//       // type instanceOfFn = fn extends Function ? true : false;

//       // this.api[k] = {
//       //   url: e.url,
//       //   method: e.method,
//       //   fn: (query: query) => {
//       //   },
//       // };

//       const r: Record<string, Z2<fn>> = {
//         k: {
//           url: e.url,
//           method: e.method,
//           fn: (query: query) => {},
//         },
//       };

//       // this.api[k] = {
//       //     url: e.url,
//       //     method: e.method,
//       //     fn: () => {
//       //       return { userId: 1, email: 'test' };
//       //     },
//       // }
//       // this.api[k] = {
//       //   url: e.url,
//       //   method: e.method,
//       //   // fn: fn
//       // };
//     });

//     // type ApiKeys = keyof T;
//     // Object.entries(this.api).forEach(([k, e]) => {
//     //   const key = k as ApiKeys;
//     //   const entry = e as T[ApiKeys];
//     //   type EntryType = typeof entry;

//     //   // Convert the type information to a string representation
//     //   const entryTypeString: string = JSON.stringify(entry) as string;
//     //   console.log(`Type of entry for key ${String(key)}: ${entryTypeString}`);

//     //   // this.api[k] = (query: e.query) => {
//     //   //   return {} as e.response;
//     //   // };
//     // });
//     // this.api['getProfileByEmail'].
//     // this.api['getProfileByEmail'] = (query) => {
//     //   return { userId: 1, email: 'test' };
//     // };
//     // this.a[]
//     // this.api.
//   }
// }

// type Config = {
//   [K: string]: {
//     url: string;
//     method: HttpMethod;
//     response: z.ZodType;
//     query: z.ZodType;
//     parameter: z.ZodType;
//     body: z.ZodType;
//   };
// };

// // type GetTypeByKey<T, K extends keyof T> = T[K];

// const createFunc = <T>(config: Config): FnFactory<T> => {
//   // const createFunc = <T>(config: Config): T => {
//   // const createFunc = <T>(config: Config)  => {

//   let api: any = {};
//   Object.entries(config).forEach(([k, e]) => {
//     type r = z.infer<typeof e.response>;
//     type q = z.infer<typeof e.query>;
//     type p = z.infer<typeof e.parameter>;
//     type b = z.infer<typeof e.body>;

//     // q
//     // qp
//     // qb
//     // qpb
//     // p
//     // pb
//     // b

//     if (e.query) {
//       api[k] = (query: q) => {
//         return {} as r;
//       };
//     }
//     if (e.query && e.parameter) {
//       api[k] = (query: q, param: p) => {
//         return {} as r;
//       };
//     }
//     if (e.query && e.body) {
//       api[k] = (query: q, body: b) => {
//         return {} as r;
//       };
//     }
//     if (e.query && e.parameter && e.body) {
//       api[k] = (query: q, param: p, body: b) => {
//         return {} as r;
//       };
//     }
//     if (e.parameter) {
//       api[k] = (param: p) => {
//         return {} as r;
//       };
//     }
//     if (e.parameter && e.body) {
//       api[k] = (param: p, body: b) => {
//         return {} as r;
//       };
//     }
//     if (e.body) {
//       api[k] = (body: b) => {
//         return {} as r;
//       };
//     }

//     // type p= z.infer<typeof e.parameter>;

//     // if (e.query && e.parameter) {
//     //   api[k] = (query: q, param: p) => {
//     //     return {} as r;
//     //   }
//     // }

//     // api[k] = (query: q): r => {
//     //   return {userId: 1, email: 'test'} as r;
//     // }

//     // const key = k as keyof T;
//     // type R = GetTypeByKey<FnFactory<T>,  "">;

//     //how to type of FnFactory<T>

//     // console.log(key);
//     // // api[k] typeof i[k];

//     // api[k] = (query: { email: string }) => {

//     //   // console.log()

//     //   return { userId: 1, email: 'test' };
//     // }
//   });

//   // const api = {
//   //   getProfileByEmail: (query: { email: string }) => {
//   //     return { userId: 1, email: 'test' };
//   //   }
//   // }

//   // Object.entries(config).forEach(([k, e]) => {
//   //   api[k] = (query) => {
//   //     return {} as any;
//   //   }
//   // });

//   // return api as FnFactory<T>;
//   return api;

//   // return {} as FnFactory<T>;
// };

// type TX1 = {
//   getProfileByEmail: ApiResReq<
//     { userId: number; email: string },
//     { email: string },
//     undefined,
//     undefined
//   >;
// };

// const conf: Config = {
//   getProfileByEmail: {
//     url: '/user-profile/email',
//     method: HttpMethod.GET,
//     response: z.object({
//       userId: z.number(),
//       email: z.string(),
//     }),
//     query: z.object({
//       email: z.string(),
//     }),
//     parameter: z.undefined(),
//     body: z.undefined(),
//   },
// };

// const Api = Type.Object({
//   getUserProfileByEmail: Type.Function(
//     [Type.Object({ email: Type.String() })],
//     Type.Object({ userId: Type.Number(), email: Type.String() })
//   ),
// });

// type T = Static<typeof Api>;

// type Config3 = {
//   [K: string]: {
//     url: string;
//     method: HttpMethod;
//     response: TObject;
//     query: TObject;
//     // fn: TFunction;
//   };
// };

// const c3 = {
//   getProfileByEmail: {
//     url: '/user-profile/email',
//     method: HttpMethod.GET,
//     // response: Type.Object({

//     // fn: Type.Function(
//     //   [Type.Object({ email: Type.String() })],
//     //   Type.Object({ userId: Type.Number(), email: Type.String() })
//     // )
//   },
// };

// const fn = Type.Function(
//   [Type.Object({ email: Type.String() })],
//   Type.Object({ userId: Type.Number(), email: Type.String() })
// );

// // type fnt = Static<typeof fn>;

// type Config2 = {
//   [K: string]: {
//     url: string;
//     method: HttpMethod;
//     response: TObject;
//     query: TObject | undefined;
//     // parameter: JavaScriptTypeBuilder;
//     // body: JavaScriptTypeBuilder;
//   };
// };




// const createTypeByConfig = (config: Config2): TObject => {
//   let newType = Type.Object({});

//   Object.entries(config).forEach(([k, e]) => {
//     if (e.query) {
//       newType = Type.Object({
//         ...newType,
//         [k]: Type.Function([e.query], e.response),
//       });
//     }
//     // else {
//     // newType = newType.Object({
//     //   [k]: newType.Function([], newType.Object(e.response)),
//     // });
//     // }
//   });

//   return newType;
// };

// const c: Config2 = {
//   getProfileByEmail: {
//     url: '/user-profile/email',
//     method: HttpMethod.GET,
//     response: Type.Object({
//       userId: Type.Number(),
//       email: Type.String(),
//     }),
//     query: undefined,
//     // response: Type.Object({
//     //   userId: Type.Number(),
//     //   email: Type.String(),
//     // }),
//     // query: Type.Object({
//     //   email: Type.String(),
//     // }),
//     // parameter: Type.Undefined(),
//     // body: Type.Undefined(),
//   },
// };

// const x1 = createTypeByConfig(c);
// type T1 = Static<typeof x1>;

// // type A = CCC<typeof conf>
// export const a = createFunc<TX1>(conf);

// type ApiConfigY<T extends TObject> = {
//   [K in keyof T]: K extends 'type'
//     ? 'found'
//     : K extends 'required'
//     ? T[K] extends [infer A, infer R]
//       ? A
//       : 'not found'
//     : never;
// };

// const xxxx = Type.Object({
//   getProfileByEmail: Type.Number(),
// });

// type T2 = ApiConfigY<typeof xxxx>;

// // const {getProfileByEmail} = useApi()

// // const {} = getProfileByEmail()

// // const x2: AF2<FX> = new AF2<FX>();

// // const a2 = new AF2<TestApiConfig>();

// // type ApiFactory<A extends ApiBase> = {
// //   [K in keyof A]: A[K] extends ApiResReq<infer R, infer Q, infer P, infer B> ? (query: Q) => R : never;
// // }

// // type

// // type ApiConfig3 = {
// //   getProfileByEmail: ApiBase<{ userId: number; email: string }, { email: string }>;
// // };

// // const query = (apiConfig: ApiConfig) => {
// //   // const res: A<ApiConfig> = {
// //   // }

// //   // let res: A<ApiConfig>  ;
// //   // const res: Record<string, () => void > = {};
// //   // let res = {} as A<ApiConfig>;

// //   Object.entries(apiConfig).forEach(([k, e]) => {
// //     // // res[k] = (query: z.infer<typeof e.Query>) => {
// //     // //   return {} as z.infer<typeof e.Response>;
// //     // }
// //     // res[k] = () => {};
// //     // res[k] = (query: ) => {
// //     //   return {} as any;
// //     // }
// //   });

// //   // loop ke

// //   return res;
// // };

// // type Factory<T extends ApiConfig> = {
// //   [K in keyof T]: T[K] extends Api<infer R, infer Q> ? () => R : never;
// // };

// // let x: Factory<ApiConfig>;

// // // const apiConfig: ApiConfig = {
// // //   getProfileByEmail: {
// // //     Response: z.object({
// // //       email: z.string(),
// // //     }),
// // //   },
// // //   getProfile: {
// // //     Response: z.object({
// // //       id: z.number(),
// // //     }),
// // //   },
// // // };

// // // type Func<R extends object> = () => R;

// // type KeyList<S extends string[]> = {
// //   [K in S[number]]: K;
// // };

// // class FuncFactory {
// //   // private funcs: Record<string,  Func<>> = {};
// //   private funcsName: string[] = [];

// //   constructor(apiConfig: ApiConfig) {
// //     Object.entries(apiConfig).forEach(([k, e]) => {
// //       this.funcsName.push(k);
// //       // this.funcs[k] = (): z.infer<typeof e.Response> => {};
// //     });
// //   }

// //   getFuncNames() {
// //     return this.funcsName;
// //   }
// // }

// // type for crate function (query: Q) => R from ApiConfig

// // const funcFactory = new FuncFactory(apiConfig);
// // const funcs: KeyList<typeof funcFactory.getFuncNames()> = {} as any;

// // const x = funcs;

// // export const getValue = <T>() => {
// //   return {} as T;
// // }

// // type exFnApi = {
// //   fn1: {
// //     response: any;
// //     query: any;
// //     parameter: any;
// //     body: any;
// //   };
// //   fn2: {
// //     response: any;
// //     query: any;
// //     parameter: any;
// //     body: any;
// //   };
// // };

// // const exConfig = {
// //   fn1: {
// //     url: '/user-profile/email',
// //     method: HttpMethod.GET,
// //   // fn1: {
// //   //   response: any;
// //   //   query: any;
// //   //   parameter: any;
// //   //   body: any;
// //   // };
// //   },
// // };

// // createApi<exFnApi>(config);
