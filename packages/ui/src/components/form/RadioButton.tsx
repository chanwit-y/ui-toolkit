import { RadioButtonBase } from "../RadioButton"
import { RadioButtonBase2 } from "../RadioButton2"
import { withForm } from "../hoc/withForm"

export const RadioButton = withForm(RadioButtonBase)
/** Engine-aware radio (API options + observe/enabledWhen), form-connected. */
export const RadioButtonF2 = withForm(RadioButtonBase2)
