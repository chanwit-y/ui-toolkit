// import { describe, it, expect } from 'bun:test';
// import { Value } from '@sinclair/typebox/value';
// import { ModelFactory } from './master';
// import type { TModel } from './converter';

// describe('ModelFactory', () => {
//   describe('constructor', () => {
//     it('should create ModelFactory instance with empty model', () => {
//       const factory = new ModelFactory({});
//       expect(factory).toBeInstanceOf(ModelFactory);
//       expect(factory.model).toEqual({});
//     });

//     it('should create ModelFactory instance with initial model', () => {
//       const initialModel = {
//         user: {
//           name: 'string',
//           age: 'number',
//         } as TModel,
//       };

//       const factory = new ModelFactory(initialModel);
//       expect(factory).toBeInstanceOf(ModelFactory);
      
//       const schemas = factory.model;
//       expect(schemas.user).toBeDefined();
      
//       // Verify the generated schema works correctly
//       const testData = { name: 'John', age: 30 };
//       expect(Value.Check(schemas.user, testData)).toBe(true);
//     });

//     it('should handle multiple models in constructor', () => {
//       const initialModels = {
//         user: {
//           name: 'string',
//           age: 'number',
//         } as TModel,
//         product: {
//           title: 'string',
//           price: 'number',
//           inStock: 'boolean',
//         } as TModel,
//       };

//       const factory = new ModelFactory(initialModels);
//       const schemas = factory.model;
      
//       expect(schemas.user).toBeDefined();
//       expect(schemas.product).toBeDefined();
      
//       // Test user schema
//       const userData = { name: 'Alice', age: 25 };
//       expect(Value.Check(schemas.user, userData)).toBe(true);
      
//       // Test product schema
//       const productData = { title: 'Laptop', price: 999.99, inStock: true };
//       expect(Value.Check(schemas.product, productData)).toBe(true);
//     });
//   });

//   describe('add method', () => {
//     it('should add new model to existing factory', () => {
//       const initialModel = {
//         user: {
//           name: 'string',
//           age: 'number',
//         } as TModel,
//       };

//       const factory = new ModelFactory(initialModel);
//       const newFactory = factory.add({
//         product: {
//           title: 'string',
//           price: 'number',
//         } as TModel,
//       });

//       expect(newFactory).toBeInstanceOf(ModelFactory);
//       expect(newFactory).not.toBe(factory); // Should return new instance
      
//       const schemas = newFactory.model;
//       expect(schemas.user).toBeDefined();
//       expect(schemas.product).toBeDefined();
      
//       // Verify both schemas work
//       const userData = { name: 'John', age: 30 };
//       const productData = { title: 'Phone', price: 599 };
      
//       expect(Value.Check(schemas.user, userData)).toBe(true);
//       expect(Value.Check(schemas.product, productData)).toBe(true);
//     });

//     it('should preserve original factory when adding models', () => {
//       const initialModel = {
//         user: {
//           name: 'string',
//           age: 'number',
//         } as TModel,
//       };

//       const factory = new ModelFactory(initialModel);
//       const newFactory = factory.add({
//         product: {
//           title: 'string',
//         } as TModel,
//       });

//       // Original factory should remain unchanged
//       const originalSchemas = factory.model;
//       expect(originalSchemas.user).toBeDefined();
//       expect('product' in originalSchemas).toBe(false);
      
//       // New factory should have both models
//       const newSchemas = newFactory.model;
//       expect(newSchemas.user).toBeDefined();
//       expect(newSchemas.product).toBeDefined();
//     });

//     it('should handle adding multiple models at once', () => {
//       const factory = new ModelFactory({});
//       const newFactory = factory.add({
//         user: {
//           name: 'string',
//           age: 'number',
//         } as TModel,
//         product: {
//           title: 'string',
//           price: 'number',
//         } as TModel,
//         order: {
//           id: 'integer',
//           status: 'string',
//         } as TModel,
//       });

//       const schemas = newFactory.model;
//       expect(schemas.user).toBeDefined();
//       expect(schemas.product).toBeDefined();
//       expect(schemas.order).toBeDefined();
      
//       // Test all schemas
//       expect(Value.Check(schemas.user, { name: 'Alice', age: 30 })).toBe(true);
//       expect(Value.Check(schemas.product, { title: 'Book', price: 19.99 })).toBe(true);
//       expect(Value.Check(schemas.order, { id: 12345, status: 'pending' })).toBe(true);
//     });

//     it('should override existing models when adding with same key', () => {
//       const initialFactory = new ModelFactory({
//         user: {
//           name: 'string',
//         } as TModel,
//       });

//       const newFactory = initialFactory.add({
//         user: {
//           name: 'string',
//           age: 'number',
//           email: 'string',
//         } as TModel,
//       });

//       const schema = newFactory.model.user;
      
//       // Original schema would only accept { name: string }
//       // New schema should accept { name: string, age: number, email: string }
//       const fullUserData = { name: 'John', age: 30, email: 'john@example.com' };
//       const partialUserData = { name: 'John' };
      
//       expect(Value.Check(schema, fullUserData)).toBe(true);
//       expect(Value.Check(schema, partialUserData)).toBe(false); // Should fail due to missing required fields
//     });

//     it('should support method chaining', () => {
//       const factory = new ModelFactory({})
//         .add({
//           user: {
//             name: 'string',
//           } as TModel,
//         })
//         .add({
//           product: {
//             title: 'string',
//           } as TModel,
//         })
//         .add({
//           order: {
//             id: 'integer',
//           } as TModel,
//         });

//       const schemas = factory.model;
//       expect(schemas.user).toBeDefined();
//       expect(schemas.product).toBeDefined();
//       expect(schemas.order).toBeDefined();
      
//       expect(Value.Check(schemas.user, { name: 'Alice' })).toBe(true);
//       expect(Value.Check(schemas.product, { title: 'Laptop' })).toBe(true);
//       expect(Value.Check(schemas.order, { id: 123 })).toBe(true);
//     });
//   });

//   describe('model getter', () => {
//     it('should return empty object for empty factory', () => {
//       const factory = new ModelFactory({});
//       expect(factory.model).toEqual({});
//     });

//     it('should convert TModel to TypeBox schemas', () => {
//       const factory = new ModelFactory({
//         simple: {
//           name: 'string',
//           age: 'number',
//           active: 'boolean',
//           count: 'integer',
//         } as TModel,
//       });

//       const schema = factory.model.simple;
//       expect(schema).toBeDefined();
      
//       // Test valid data
//       const validData = { name: 'John', age: 25.5, active: true, count: 42 };
//       expect(Value.Check(schema, validData)).toBe(true);
      
//       // Test invalid data types
//       expect(Value.Check(schema, { name: 123, age: 25.5, active: true, count: 42 })).toBe(false);
//       expect(Value.Check(schema, { name: 'John', age: '25', active: true, count: 42 })).toBe(false);
//       expect(Value.Check(schema, { name: 'John', age: 25.5, active: 'true', count: 42 })).toBe(false);
//       expect(Value.Check(schema, { name: 'John', age: 25.5, active: true, count: 42.5 })).toBe(false);
//     });

//     it('should handle nested objects in models', () => {
//       const factory = new ModelFactory({
//         user: {
//           name: 'string',
//           profile: {
//             type: 'object',
//             collection: {
//               bio: 'string',
//               age: 'number',
//             },
//           },
//         } as TModel,
//       });

//       const schema = factory.model.user;
//       const validData = {
//         name: 'Alice',
//         profile: {
//           bio: 'Software developer',
//           age: 30,
//         },
//       };
      
//       expect(Value.Check(schema, validData)).toBe(true);
      
//       // Test invalid nested data
//       const invalidData = {
//         name: 'Alice',
//         profile: {
//           bio: 'Software developer',
//           age: '30', // Should be number
//         },
//       };
      
//       expect(Value.Check(schema, invalidData)).toBe(false);
//     });

//     it('should handle arrays in models', () => {
//       const factory = new ModelFactory({
//         blog: {
//           title: 'string',
//           tags: {
//             type: 'array',
//             collection: {
//               name: 'string',
//               color: 'string',
//             },
//           },
//         } as TModel,
//       });

//       const schema = factory.model.blog;
//       const validData = {
//         title: 'My Blog Post',
//         tags: [
//           { name: 'tech', color: 'blue' },
//           { name: 'programming', color: 'green' },
//         ],
//       };
      
//       expect(Value.Check(schema, validData)).toBe(true);
      
//       // Test with empty array
//       const validEmptyArray = {
//         title: 'My Blog Post',
//         tags: [],
//       };
//       expect(Value.Check(schema, validEmptyArray)).toBe(true);
      
//       // Test invalid array item
//       const invalidData = {
//         title: 'My Blog Post',
//         tags: [
//           { name: 'tech', color: 'blue' },
//           { name: 123, color: 'green' }, // name should be string
//         ],
//       };
      
//       expect(Value.Check(schema, invalidData)).toBe(false);
//     });

//     it('should handle complex nested structures', () => {
//       const factory = new ModelFactory({
//         company: {
//           name: 'string',
//           departments: {
//             type: 'array',
//             collection: {
//               name: 'string',
//               employees: {
//                 type: 'array',
//                 collection: {
//                   name: 'string',
//                   position: 'string',
//                   salary: 'number',
//                   active: 'boolean',
//                 },
//               },
//             },
//           },
//         } as TModel,
//       });

//       const schema = factory.model.company;
//       const validData = {
//         name: 'Tech Corp',
//         departments: [
//           {
//             name: 'Engineering',
//             employees: [
//               {
//                 name: 'John Doe',
//                 position: 'Senior Developer',
//                 salary: 95000,
//                 active: true,
//               },
//               {
//                 name: 'Jane Smith',
//                 position: 'Tech Lead',
//                 salary: 120000,
//                 active: true,
//               },
//             ],
//           },
//           {
//             name: 'Marketing',
//             employees: [
//               {
//                 name: 'Bob Wilson',
//                 position: 'Marketing Manager',
//                 salary: 75000,
//                 active: false,
//               },
//             ],
//           },
//         ],
//       };
      
//       expect(Value.Check(schema, validData)).toBe(true);
//     });

//     it('should create new schema objects on each access', () => {
//       const factory = new ModelFactory({
//         user: {
//           name: 'string',
//         } as TModel,
//       });

//       const schema1 = factory.model;
//       const schema2 = factory.model;
      
//       // Should create new objects each time (not cached)
//       expect(schema1).not.toBe(schema2);
//       expect(schema1.user).not.toBe(schema2.user);
      
//       // But should be functionally equivalent
//       const testData = { name: 'John' };
//       expect(Value.Check(schema1.user, testData)).toBe(true);
//       expect(Value.Check(schema2.user, testData)).toBe(true);
//     });
//   });

//   describe('integration tests', () => {
//     it('should work with real-world user management schema', () => {
//       const userFactory = new ModelFactory({
//         user: {
//           id: 'integer',
//           username: 'string',
//           email: 'string',
//           profile: {
//             type: 'object',
//             collection: {
//               firstName: 'string',
//               lastName: 'string',
//               age: 'number',
//               address: {
//                 type: 'object',
//                 collection: {
//                   street: 'string',
//                   city: 'string',
//                   zipCode: 'string',
//                   country: 'string',
//                 },
//               },
//             },
//           },
//           roles: {
//             type: 'array',
//             collection: {
//               id: 'integer',
//               name: 'string',
//               permissions: {
//                 type: 'array',
//                 collection: {
//                   resource: 'string',
//                   action: 'string',
//                 },
//               },
//             },
//           },
//         } as TModel,
//       });

//       const adminFactory = userFactory.add({
//         admin: {
//           userId: 'integer',
//           level: 'string',
//           canManageUsers: 'boolean',
//           departments: {
//             type: 'array',
//             collection: {
//               name: 'string',
//               budget: 'number',
//             },
//           },
//         } as TModel,
//       });

//       const schemas = adminFactory.model;
      
//       // Test user schema
//       const userData = {
//         id: 1,
//         username: 'johndoe',
//         email: 'john@example.com',
//         profile: {
//           firstName: 'John',
//           lastName: 'Doe',
//           age: 30,
//           address: {
//             street: '123 Main St',
//             city: 'New York',
//             zipCode: '10001',
//             country: 'USA',
//           },
//         },
//         roles: [
//           {
//             id: 1,
//             name: 'user',
//             permissions: [
//               { resource: 'profile', action: 'read' },
//               { resource: 'profile', action: 'update' },
//             ],
//           },
//         ],
//       };
      
//       expect(Value.Check(schemas.user, userData)).toBe(true);
      
//       // Test admin schema
//       const adminData = {
//         userId: 1,
//         level: 'super',
//         canManageUsers: true,
//         departments: [
//           { name: 'Engineering', budget: 500000 },
//           { name: 'Marketing', budget: 200000 },
//         ],
//       };
      
//       expect(Value.Check(schemas.admin, adminData)).toBe(true);
//     });

//     it('should handle e-commerce product catalog schema', () => {
//       const catalogFactory = new ModelFactory({})
//         .add({
//           category: {
//             id: 'integer',
//             name: 'string',
//             description: 'string',
//             parentId: 'integer',
//           } as TModel,
//         })
//         .add({
//           product: {
//             id: 'integer',
//             name: 'string',
//             description: 'string',
//             price: 'number',
//             categoryId: 'integer',
//             inStock: 'boolean',
//             specifications: {
//               type: 'object',
//               collection: {
//                 weight: 'number',
//                 dimensions: {
//                   type: 'object',
//                   collection: {
//                     width: 'number',
//                     height: 'number',
//                     depth: 'number',
//                   },
//                 },
//                 features: {
//                   type: 'array',
//                   collection: {
//                     name: 'string',
//                     value: 'string',
//                   },
//                 },
//               },
//             },
//             reviews: {
//               type: 'array',
//               collection: {
//                 userId: 'integer',
//                 rating: 'number',
//                 comment: 'string',
//                 helpful: 'integer',
//               },
//             },
//           } as TModel,
//         });

//       const schemas = catalogFactory.model;
      
//       const productData = {
//         id: 1,
//         name: 'Wireless Headphones',
//         description: 'High-quality wireless headphones',
//         price: 199.99,
//         categoryId: 5,
//         inStock: true,
//         specifications: {
//           weight: 0.25,
//           dimensions: {
//             width: 15.2,
//             height: 18.5,
//             depth: 7.8,
//           },
//           features: [
//             { name: 'Battery Life', value: '30 hours' },
//             { name: 'Noise Cancellation', value: 'Active' },
//           ],
//         },
//         reviews: [
//           {
//             userId: 123,
//             rating: 5,
//             comment: 'Excellent sound quality!',
//             helpful: 12,
//           },
//           {
//             userId: 456,
//             rating: 4,
//             comment: 'Good value for money',
//             helpful: 8,
//           },
//         ],
//       };
      
//       expect(Value.Check(schemas.product, productData)).toBe(true);
      
//       const categoryData = {
//         id: 5,
//         name: 'Audio Equipment',
//         description: 'Speakers, headphones, and audio accessories',
//         parentId: 1,
//       };
      
//       expect(Value.Check(schemas.category, categoryData)).toBe(true);
//     });
//   });

//   describe('error scenarios', () => {
//     it('should handle conversion errors gracefully', () => {
//       const factory = new ModelFactory({
//         invalid: {
//           field: 'invalid_type', // This will cause convertTModelToTypeBox to throw
//         } as any,
//       });

//       expect(() => factory.model).toThrow('Unknown primitive type: invalid_type');
//     });

//     it('should handle invalid object structures', () => {
//       const factory = new ModelFactory({
//         invalid: {
//           field: {
//             type: 'invalid_object_type',
//             collection: {},
//           },
//         } as any,
//       });

//       expect(() => factory.model).toThrow();
//     });
//   });

//   describe('type safety', () => {
//     it('should maintain type safety through method chaining', () => {
//       const factory = new ModelFactory({
//         user: {
//           name: 'string',
//         } as TModel,
//       })
//         .add({
//           product: {
//             title: 'string',
//           } as TModel,
//         });

//       const schemas = factory.model;
      
//       // TypeScript should know these properties exist
//       expect(schemas.user).toBeDefined();
//       expect(schemas.product).toBeDefined();
      
//       // These should work correctly
//       expect(Value.Check(schemas.user, { name: 'Test' })).toBe(true);
//       expect(Value.Check(schemas.product, { title: 'Test Product' })).toBe(true);
//     });
//   });
// });