import type { AutocompleteElement, Bin, CardElement, Container, TabElement, TextFieldElement } from "../@types";
import { z } from "zod";

/** No value at all: nothing, a blank string or an empty list. */
function isEmptyValue(v: unknown): boolean {
	return v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);
}

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
			// A form list's rows are independent forms (see FormListElement): its
			// `name` is a binding key, not a field of the enclosing form.
			// A repeater's template is read-only display, rendered once per item.
			// A custom component is display-only: not a field of the form.
			// The profile elements own their state (a global slice), not a form field.
			if (box.type === "formlist" || box.type === "repeater" || box.type === "custom" || box.type === "switchprofile" || box.type === "replaceprofile") return;
			if (box.element) {
				if (this.isTabElement(box.element)) {
					box.element.tabs.forEach((tab) => {
						const containerFields = this.processBoxes(tab.container.bins);

						if (tab.container.isArray) {
							fields[tab.container.name] = z.array(z.object(containerFields));
						} else {
							Object.assign(fields, containerFields);
						}
					});
					return;
				}

				// A card's content / collapse bins draw on the enclosing form, like
				// a tab's panels: their fields belong to it.
				if (box.type === "card") {
					const card = box.element as CardElement;
					[card.content, card.collapse].forEach((container) => {
						if (!container) return;
						const containerFields = this.processBoxes(container.bins);
						if (container.isArray) fields[container.name] = z.array(z.object(containerFields));
						else Object.assign(fields, containerFields);
					});
					return;
				}

				const elementSchema = this.createElementSchema(box.element as any);
				if (elementSchema && 'name' in box.element && box.element.name) {
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

	private isTabElement(element: Bin["element"]): element is TabElement {
		return !!element && "tabs" in element && Array.isArray(element.tabs);
	}

	private createElementSchema(element: AutocompleteElement | TextFieldElement): z.ZodTypeAny | null {
		// Check if element is AutocompleteElement (has dataType property)
		if ('dataType' in element && element.dataType) {
			const requiredMessage = element?.errorMessage ?? 'Required';
			const normalizedDataType = element.dataType.toLowerCase();
			let schema = this.getZodTypeFromDataType(normalizedDataType, requiredMessage);
			const isRequired = element.isRequired ?? false;

			// Apply required validation
			if (isRequired && normalizedDataType === 'boolean') {
				// A required switch / checkbox must be on ("Accept the terms").
				schema = z.literal(true, { errorMap: () => ({ message: requiredMessage }) });
			}
			if (isRequired && normalizedDataType === 'array') {
				// Required arrays (e.g. upload byte data / file lists) must not be empty
				schema = z.array(z.unknown(), {
					required_error: requiredMessage,
					invalid_type_error: requiredMessage,
				}).min(1, requiredMessage);
			}
			if (isRequired && normalizedDataType === 'any') {
				// Anything goes (a checkbox group's array, a date range's object), but not nothing.
				schema = z.any().refine((v) => !isEmptyValue(v), requiredMessage);
			}
			// An optional field may be empty: `undefined`, or `null` as an API sends it.
			if (!isRequired) {
				if (normalizedDataType === 'string') {
					schema = z.string({
						invalid_type_error: requiredMessage,
					})
						.trim()
						.nullish();
				} else {
					schema = schema.nullish();
				}
			}

			return schema;
		}

		// A `name` without a `dataType` (an `html` item, ...) is no form field:
		// whatever it holds passes through unvalidated.
		return z.any().optional();
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
				// A cleared number field holds `null` (see `withForm`): "Required", not a type error.
				return z.number({
					errorMap: (issue, ctx) => ({
						message: issue.code === 'invalid_type' && (issue.received === 'null' || issue.received === 'undefined')
							? requiredMessage ?? ctx.defaultError
							: ctx.defaultError,
					}),
				});
			case 'boolean':
				return z.boolean();
			case 'date':
				return z.date();
			case 'daterange':
				return z.object({
					start: z.string(),
					end: z.string(),
				});
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
			case 'any':
				return z.any();
			default:
				// Default to string for unknown types
				return z.string();
		}
	}
}
