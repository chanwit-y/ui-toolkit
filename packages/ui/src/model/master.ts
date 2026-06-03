import type { TObject } from "@sinclair/typebox";
import { convertTModelToTypeBox, type TModel } from "./converter";

export type TModelMaster = { [K: string]: TModel };
export class ModelFactory<
  T extends TModelMaster,
  R extends { [K in keyof T]: T[K] },
> {
  private _models: R = {} as R;

  constructor(model: T) {
    this._models = model as unknown as R;
  }

  public static base<B extends TModel>(b: B): {[K in keyof B]: B[K]} {
	return b
  }

  add<M extends TModelMaster>(
    model: M
  ): ModelFactory<T & { [K in keyof M]: M[K] }, R & { [K in keyof M]: M[K] }> {
    return new ModelFactory<
      T & { [K in keyof M]: M[K] },
      R & { [K in keyof M]: M[K] }
    >({
      ...this._models,
      ...model,
    });
  }

  get model(): { [K in keyof R]: TObject } {
    return Object.entries(this._models).reduce(
      (acc, [key, value]) => {
        (acc as any)[key] = convertTModelToTypeBox(value);
        return acc;
      },
      {} as { [K in keyof R]: TObject }
    );
  }

}
