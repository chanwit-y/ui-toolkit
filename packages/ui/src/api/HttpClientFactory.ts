// import { HttpClientBase, unwrap } from './HttpClientBase';
import { HttpClientBase } from './HttpClientBase';
import {
  type IgnoreService,
  type LogFunction,
  type ErrorFunction,
  HttpMethod,
  type Request,
} from './@types';
import { type IHttpClientFactory } from './@types/HttpClientType';
import { type AxiosRequestConfig, type AxiosResponse } from 'axios';

export class HttpClientFactory
  extends HttpClientBase
  implements IHttpClientFactory
{
  constructor(
    private _baseUrl: string,
    private _getAccessToken: () => Promise<string>,
    version: string = '1.0.0',
    timeout: number = 30 * 1000,
    ignoreLoadingRequest: IgnoreService[] = [],
    ignoreErrorRequest: IgnoreService[] = [],
    private _unwrap?: Function,
    onError?: ErrorFunction,
    onLog?: LogFunction
  ) {
    super(
      _getAccessToken,
      version,
      timeout,
      ignoreLoadingRequest,
      ignoreErrorRequest,
      onError,
      onLog
    );


  
  }

  public get accessToken() {
    return this._getAccessToken();
  }

  // public async handler<R, Q, P, B>(
  //   group: unknown,
  //   key: unknown,
  //   request: Request<Q, P, B>
  // ): Promise<AxiosResponse<R, any>> {
  //   const factory = this._factory.find((f) => f.group === group);
  //   const api = factory?.apis.find((a) => a.key === key);

  //   if (api) {
  //     let url = `${this._baseUrl}${api.url}`;
  //     if (request.parameter) {
  //       // url data is '/user/:userId'
  //       // replace :parameter to value
  //       url = this.getUrlParameter(request.parameter, url);
  //     }

  //     switch (api.method) {
  //       case HttpMethod.GET:
  //         return this.processGet<R, Q, P, B>(api, request, url);
  //       case HttpMethod.POST: {
  //         return await this.post(url, request.body, api.axiosRequestConfig);
  //       }
  //       case HttpMethod.PUT: {
  //         return await this.put(url, request.body, api.axiosRequestConfig);
  //       }
  //       case HttpMethod.PATCH: {
  //         return await this.patch(url, request.body, api.axiosRequestConfig);
  //       }
  //       case HttpMethod.DELETE: {
  //         return await this.delete(url, api.axiosRequestConfig);
  //       }
  //       default:
  //         throw 'error in http client factory!';
  //     }
  //   }
  //   throw 'group or key not found!';
  // }

  public async handler<R, Q, P, B>(
    apiURL: string,
    method: HttpMethod,
    request?: Request<Q, P, B>,
    config?: AxiosRequestConfig,
    isNotUnwrap?: boolean 
  ): Promise<R> {
    let url = `${this._baseUrl}${apiURL}`;

    if (request?.query) {
      const stringQuery = this.getUrlQueryString(request.query);
      if (stringQuery) url = `${url}?${stringQuery}`;
    }
    if (request?.parameter) {
      url = this.getUrlParameter(request.parameter, url);
    }

    let res: AxiosResponse<R, any>;


    switch (method) {
      case HttpMethod.GET:
        res = await this.get(url, config);
        break;
      case HttpMethod.POST: {
        res = await this.post(url, request?.body, config);
        break;
      }
      case HttpMethod.PUT: {
        res = await this.put(url, request?.body, config);
        break;
      }
      case HttpMethod.PATCH: {
        res = await this.patch(url, request?.body, config);
        break;
      }
      case HttpMethod.DELETE: {
        res = await this.delete(url, config);
        break;
      }
      default:
        throw 'error in http client factory!';
    }

    return this._unwrap && !isNotUnwrap ? this._unwrap(res.data) : res.data;
  }

  public async processGet<R, Q, P, B>(
    url: string,
    _request?: Request<Q, P, B>,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<R, any>> {
    return await this.get(url, config);
  }
}
