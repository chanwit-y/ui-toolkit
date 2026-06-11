// import type { TApiMaster } from "../../../api/APIMaster";
// import type { TModelMaster } from "../../../model/master";
// import type { IElement } from "../../@types";
import { Autocomplete, MultiAutocomplete } from "../autocomplete";
import { Avatar } from "../avatar";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { DataTable } from "../dataTable";
import { Hidden } from "../hidden";
import { Modal } from "../modal";
import { Radio } from "../radio";
import { DatePicker } from "../datePicker";
import { DateRangePicker } from "../dateRangePicker";
import { DateTimePicker } from "../dateTimePicker";
import { TextField } from "../textField";
import { Textarea } from "../textarea";
import { Text } from "../text";
import { Typography } from "../typography";
import { Tab } from "../tab";
import { UploadImage } from "../uploadImage";
import { UploadFile } from "../uploadFile";
// import type { IElement } from "../@types";
// import type { TModelMaster } from "../../model/master";
// import type { TApiMaster } from "../../api/APIMaster";

// Type for element data mapping: string keys to class constructors
// export type ElementDataMap = {
// 	[key: string]: new <M extends TModelMaster, A extends TApiMaster<M>>(
// 		context: any
// 	) => IElement;
// } ;

export const ElementData = {
	avatar: Avatar,
	button: Button,
	modal: Modal,
	autocomplete: Autocomplete,
	multiAutocomplete: MultiAutocomplete,
	datatable: DataTable,
	textfield: TextField,
	textarea: Textarea,
	checkbox: Checkbox,
	hidden: Hidden,
	radio: Radio,
	datepicker: DatePicker,
	daterangepicker: DateRangePicker,
	datetimepicker: DateTimePicker,
	text: Text,
	typography: Typography,
	tab: Tab,
	uploadimage: UploadImage,
	uploadfile: UploadFile,
}