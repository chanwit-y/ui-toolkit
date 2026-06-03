// import { describe, it, expect } from 'bun:test';
// import { Type } from '@sinclair/typebox';
// import { Value } from '@sinclair/typebox/value';
// import { 
//   convertTModelToTypeBox, 
//   type TModel, 
// } from './converter'; // Adjust import path as needed

// describe('TModel to TypeBox Converter', () => {
//   describe('convertTModelToTypeBox', () => {
//     it('should convert simple string types', () => {
//       const model: TModel = {
//         name: 'string',
//         email: 'string',
//       };

//       const schema = convertTModelToTypeBox(model);
//       const expected = Type.Object({
//         name: Type.String(),
//         email: Type.String(),
//       });

//       // Validate structure by testing with sample data
//       const testData = { name: 'John', email: 'john@example.com' };
//       expect(Value.Check(schema, testData)).toBe(true);
//       expect(Value.Check(expected, testData)).toBe(true);
//     });

//     it('should convert simple number types', () => {
//       const model: TModel = {
//         age: 'number',
//         score: 'number',
//       };

//       const schema = convertTModelToTypeBox(model);
//       const testData = { age: 25, score: 95.5 };
      
//       expect(Value.Check(schema, testData)).toBe(true);
//       expect(Value.Check(schema, { age: '25', score: 95.5 })).toBe(false);
//     });

//     it('should convert boolean types', () => {
//       const model: TModel = {
//         isActive: 'boolean',
//         verified: 'boolean',
//       };

//       const schema = convertTModelToTypeBox(model);
//       const testData = { isActive: true, verified: false };
      
//       expect(Value.Check(schema, testData)).toBe(true);
//       expect(Value.Check(schema, { isActive: 'true', verified: false })).toBe(false);
//     });

//     it('should convert integer types', () => {
//       const model: TModel = {
//         count: 'integer',
//         id: 'integer',
//       };

//       const schema = convertTModelToTypeBox(model);
//       const testData = { count: 42, id: 123 };
      
//       expect(Value.Check(schema, testData)).toBe(true);
//       expect(Value.Check(schema, { count: 42.5, id: 123 })).toBe(false);
//     });

//     it('should convert nested objects', () => {
//       const model: TModel = {
//         user: {
//           type: 'object',
//           collection: {
//             name: 'string',
//             age: 'number',
//           },
//         },
//       };

//       const schema = convertTModelToTypeBox(model);
//       const validData = {
//         user: {
//           name: 'Alice',
//           age: 30,
//         },
//       };
//       const invalidData = {
//         user: {
//           name: 'Alice',
//           age: '30', // Should be number
//         },
//       };

//       expect(Value.Check(schema, validData)).toBe(true);
//       expect(Value.Check(schema, invalidData)).toBe(false);
//     });

//     it('should convert arrays with object items', () => {
//       const model: TModel = {
//         users: {
//           type: 'array',
//           collection: {
//             name: 'string',
//             age: 'number',
//           },
//         },
//       };

//       const schema = convertTModelToTypeBox(model);
//       const validData = {
//         users: [
//           { name: 'Alice', age: 30 },
//           { name: 'Bob', age: 25 },
//         ],
//       };
//       const invalidData = {
//         users: [
//           { name: 'Alice', age: '30' }, // Should be number
//         ],
//       };

//       expect(Value.Check(schema, validData)).toBe(true);
//       expect(Value.Check(schema, invalidData)).toBe(false);
//     });

//     it('should handle complex nested structure', () => {
//       const model: TModel = {
//         name: 'string',
//         age: 'number',
//         address: {
//           type: 'object',
//           collection: {
//             address1: 'string',
//             building: {
//               type: 'array',
//               collection: {
//                 name: 'string',
//                 age: 'number',
//               },
//             },
//           },
//         },
//       };

//       const schema = convertTModelToTypeBox(model);
//       const validData = {
//         name: 'John Doe',
//         age: 30,
//         address: {
//           address1: '123 Main St',
//           building: [
//             { name: 'Building A', age: 10 },
//             { name: 'Building B', age: 5 },
//           ],
//         },
//       };

//       expect(Value.Check(schema, validData)).toBe(true);
//     });

//     it('should handle empty objects and arrays', () => {
//       const model: TModel = {
//         emptyObject: {
//           type: 'object',
//           collection: {},
//         },
//         emptyArray: {
//           type: 'array',
//           collection: {},
//         },
//       };

//       const schema = convertTModelToTypeBox(model);
//       const validData = {
//         emptyObject: {},
//         emptyArray: [{}],
//       };

//       expect(Value.Check(schema, validData)).toBe(true);
//     });

//     it('should handle deeply nested structures', () => {
//       const model: TModel = {
//         level1: {
//           type: 'object',
//           collection: {
//             level2: {
//               type: 'object',
//               collection: {
//                 level3: {
//                   type: 'array',
//                   collection: {
//                     items: {
//                       type: 'array',
//                       collection: {
//                         value: 'string',
//                       },
//                     },
//                   },
//                 },
//               },
//             },
//           },
//         },
//       };

//       const schema = convertTModelToTypeBox(model);
//       const validData = {
//         level1: {
//           level2: {
//             level3: [
//               {
//                 items: [
//                   { value: 'test1' },
//                   { value: 'test2' },
//                 ],
//               },
//             ],
//           },
//         },
//       };

//       expect(Value.Check(schema, validData)).toBe(true);
//     });

//     it('should throw error for unknown primitive type', () => {
//       const model: TModel = {
//         invalidField: 'unknown_type',
//       };

//       expect(() => convertTModelToTypeBox(model)).toThrow('Unknown primitive type: unknown_type');
//     });

//     it('should throw error for invalid object structure', () => {
//       const invalidModel = {
//         invalidField: {
//           type: 'invalid_type',
//           collection: {},
//         },
//       } as any;

//       expect(() => convertTModelToTypeBox(invalidModel)).toThrow();
//     });

//     it('should validate required fields', () => {
//       const model: TModel = {
//         requiredField: 'string',
//         optionalField: 'number',
//       };

//       const schema = convertTModelToTypeBox(model);
      
//       // Missing required field should fail
//       const incompleteData = {
//         optionalField: 42,
//       };

//       expect(Value.Check(schema, incompleteData)).toBe(false);
//     });

//     it('should handle mixed data types in same object', () => {
//       const model: TModel = {
//         id: 'integer',
//         name: 'string',
//         score: 'number',
//         active: 'boolean',
//         metadata: {
//           type: 'object',
//           collection: {
//             tags: {
//               type: 'array',
//               collection: {
//                 label: 'string',
//               },
//             },
//           },
//         },
//       };

//       const schema = convertTModelToTypeBox(model);
//       const validData = {
//         id: 123,
//         name: 'Test User',
//         score: 85.5,
//         active: true,
//         metadata: {
//           tags: [
//             { label: 'important' },
//             { label: 'verified' },
//           ],
//         },
//       };

//       expect(Value.Check(schema, validData)).toBe(true);
//     });
//   });

//   describe('Error handling and edge cases', () => {
//     it('should provide detailed validation errors', () => {
//       const model: TModel = {
//         name: 'string',
//         age: 'number',
//       };

//       const schema = convertTModelToTypeBox(model);
//       const invalidData = {
//         name: 123, // Should be string
//         age: 'invalid', // Should be number
//       };

//       const errors = [...Value.Errors(schema, invalidData)];
//       expect(errors.length).toBeGreaterThan(0);
//     });

//     it('should handle case insensitive type names', () => {
//       const model: TModel = {
//         field1: 'STRING',
//         field2: 'NUMBER',
//         field3: 'BOOLEAN',
//       };

//       const schema = convertTModelToTypeBox(model);
//       const testData = {
//         field1: 'test',
//         field2: 42,
//         field3: true,
//       };

//       expect(Value.Check(schema, testData)).toBe(true);
//     });
//   });

//   describe('Performance and large datasets', () => {
//     it('should handle models with many fields efficiently', () => {
//       const largeModel: TModel = {};
      
//       // Create a model with 100 string fields
//       for (let i = 0; i < 100; i++) {
//         largeModel[`field${i}`] = 'string';
//       }

//       const startTime = performance.now();
//       const schema = convertTModelToTypeBox(largeModel);
//       const endTime = performance.now();

//       expect(endTime - startTime).toBeLessThan(100); // Should complete in less than 100ms
//       expect(schema).toBeDefined();
//     });
//   });
// });