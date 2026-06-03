import { AutocompleteBase } from "../Autocomplete"
import { AutocompleteBase2 } from "../Autocomplete2"
import { withForm } from "../hoc/withForm"
import { MultiAutocompleteBase } from "../MultiAutocomplete"
export const Autocomplete = withForm(AutocompleteBase as any)
export const AutocompleteF2 = withForm(AutocompleteBase2)
export const MultiAutocomplete = withForm(MultiAutocompleteBase)