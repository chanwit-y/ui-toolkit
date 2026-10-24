import { Type, type TSchema, type TObject, type TArray } from '@sinclair/typebox';

// Define the TModel interface
interface TModel {
  [key: string]: string | boolean | number | TModelObject | TModelArray;
}

interface TModelObject {
  type: 'object';
  collection: TModel;
}

interface TModelArray {
  type: 'array';
  collection: TModel | string;
}

type TModelValue = string | boolean | number | TModelObject | TModelArray;

/**
 * Converted schemas by model object. A project's models are plain JSON that
 * nothing mutates after load, and the same model is referenced by many
 * endpoints (response / query / body) and by every page's engine — so each
 * object converts once. Keyed by identity: a new model object (a re-import,
 * a studio edit) converts afresh, and an unused one is collected.
 */
const converted = new WeakMap<TModel, TObject>();
let conversions = 0;

/** How many models were actually converted (cache misses) since the last reset — for tests and benchmarks. */
export function converterStats(): { conversions: number } {
  return { conversions };
}

export function resetConverterStats(): void {
  conversions = 0;
}

// Dynamic converter function
function convertTModelToTypeBox(model: TModel): TObject {
  const hit = converted.get(model);
  if (hit) return hit;
  const properties: Record<string, TSchema> = {};

  for (const [key, value] of Object.entries(model)) {
    properties[key] = convertValue(value);
  }

  const schema = Type.Object(properties);
  conversions += 1;
  converted.set(model, schema);
  return schema;
}

// Convert TModel to TArray - creates an array of objects with the TModel structure
function convertTModelToTArray(model: TModel): TArray {
  const objectSchema = convertTModelToTypeBox(model);
  return Type.Array(objectSchema);
}

function convertValue(value: TModelValue): TSchema {
  // Handle simple string types
  if (typeof value === 'string') {
    switch (value.toLowerCase()) {
      case 'string':
        return Type.String();
      case 'number':
        return Type.Number();
      case 'boolean':
        return Type.Boolean();
      case 'integer':
        return Type.Integer();
      case 'any':
        return Type.Any();
      default:
        throw new Error(`Unknown primitive type: ${value}`);
    }
  }

  // Handle object type
  if (typeof value === 'object' && value.type === 'object') {
    return convertTModelToTypeBox(value.collection);
  }

  // Handle array type
  if (typeof value === 'object' && value.type === 'array') {
    const itemSchema =
      typeof value.collection === 'string'
        ? convertValue(value.collection)
        : convertTModelToTypeBox(value.collection);
    return Type.Array(itemSchema);
  }

  throw new Error(`Unknown value type: ${JSON.stringify(value)}`);
}

export { convertTModelToTypeBox, convertTModelToTArray, type TModel, type TModelObject, type TModelArray };