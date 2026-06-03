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

// Dynamic converter function
function convertTModelToTypeBox(model: TModel): TObject {
  const properties: Record<string, TSchema> = {};

  for (const [key, value] of Object.entries(model)) {
    properties[key] = convertValue(value);
  }

  return Type.Object(properties);
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