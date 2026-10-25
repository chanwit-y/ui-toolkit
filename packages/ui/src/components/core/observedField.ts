import type { FieldValues, UseFormReturn } from "react-hook-form";
import { get } from "lodash";

type WatchableForm = Pick<UseFormReturn<FieldValues>, "getValues" | "watch">;

/**
 * Follows the form field an `observeTo` select depends on: `onValue` gets its
 * value now and again on every change, a `reset` included (an edit modal
 * opening on a row). The observe subject only carries what the user picks, so
 * a parent the form prefilled never reached its dependents without this.
 * Only real changes are reported. Returns the unsubscribe; a no-op without a
 * form or a name.
 */
export function followFormField(
	form: WatchableForm | null | undefined,
	name: string | undefined,
	onValue: (value: unknown) => void,
): () => void {
	if (!form || !name) return () => {};
	let last = form.getValues(name);
	onValue(last);
	const subscription = form.watch((values, info) => {
		// `info.name` is unset for a `reset`, which may change every field.
		if (info.name !== undefined && info.name !== name) return;
		const value = get(values, name);
		if (Object.is(value, last)) return;
		last = value;
		onValue(value);
	});
	return () => subscription.unsubscribe();
}
