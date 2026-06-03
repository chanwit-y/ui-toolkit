import type { AutocompleteElement, Bin, Container, TextFieldElement } from "../@types";
import { z } from "zod";

export class Schema {
	constructor(private containers: Container[]) { }

	public generate() {
		const schemaFields: Record<string, z.ZodTypeAny> = {};

		const processContainers = (containers: Container[]): Record<string, z.ZodTypeAny> => {
			const fields: Record<string, z.ZodTypeAny> = {};

			containers.forEach(container => {
				const containerFields = this.processBoxes(container.bins);

				if (container.isArray) {
					// If container is an array, wrap the schema in z.array()
					fields[container.name] = z.array(z.object(containerFields));
				} else {
					// If container is not an array, merge fields directly
					Object.assign(fields, containerFields);
				}
			});

			return fields;
		};

		Object.assign(schemaFields, processContainers(this.containers));

		return z.object(schemaFields);
	}

	private processBoxes(boxes: Bin[]): Record<string, z.ZodTypeAny> {
		const fields: Record<string, z.ZodTypeAny> = {};

		boxes.forEach(box => {
			if (box.element) {
				const elementSchema = this.createElementSchema(box.element as any);
				if (elementSchema && 'name' in box.element) {
					fields[box.element.name] = elementSchema;
				}
			} else if (box.container) {
				const containerFields = this.processBoxes(box.container.bins);

				if (box.container.isArray) {
					fields[box.container.name] = z.array(z.object(containerFields));
				} else {
					Object.assign(fields, containerFields);
				}
			}
		});

		return fields;
	}

	private createElementSchema(element: AutocompleteElement | TextFieldElement): z.ZodTypeAny | null {
		// Check if element is AutocompleteElement (has dataType property)
		if ('dataType' in element) {
			const requiredMessage = element?.errorMessage ?? 'Required';
			const normalizedDataType = element.dataType.toLowerCase();
			let schema = this.getZodTypeFromDataType(normalizedDataType, requiredMessage);
			const isRequired = element.isRequired ?? element.isRequired ?? false;

			// Apply required validation
			if (!isRequired) {
				if (normalizedDataType === 'string') {
					schema = z.string({
						invalid_type_error: requiredMessage,
					})
						.trim()
						.optional();
				} else {
					schema = schema.optional();
				}
			}

			return schema;
		}

		// Handle TextFieldElement - for now assume string type
		// This can be extended when TextFieldElement has more properties
		return z.string();
	}

	private getZodTypeFromDataType(dataType: string, requiredMessage?: string): z.ZodTypeAny {
		switch (dataType) {
			case 'string':
				return z
					.string({
						required_error: requiredMessage,
						invalid_type_error: requiredMessage,
					})
					.trim()
					.min(1, requiredMessage);
			case 'number':
				return z.number();
			case 'boolean':
				return z.boolean();
			case 'date':
				return z.date();
			case 'email':
				return z.string().email();
			case 'url':
				return z.string().url();
			case 'uuid':
				return z.string().uuid();
			case 'array':
				return z.array(z.unknown());
			case 'object':
				return z.object({});
			default:
				// Default to string for unknown types
				return z.string();
		}
	}
}
