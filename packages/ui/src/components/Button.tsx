import { Button as RadixButton, type ThemeProps } from '@radix-ui/themes';
import { forwardRef, useCallback, useState, type ElementRef } from "react";
import { useFormContext } from "react-hook-form";
import { getErrorMessage } from "../util/error";
import { ButtonAction, ButtonProps, ButtonVariant } from "./@types";
import { ConfirmBox } from "./ConfirmBox";
import { useLoading, useTheme } from "./context";
import { useData } from "./context/DataProvider";
import { useStord } from "./core/stord";
import { useNavigateTo } from "./core/pages";
import Icon from "./Icon";
import type { IconData } from "./core/const/iconData";
import { useSnackbar } from "./Snackbar";

// The Radix look behind each variant. "text" is Radix's ghost, whose negative
// margins (meant for inline optical alignment) are reset so the button keeps
// its own box inside a grid cell.
const RADIX_VARIANTS = {
	contained: "solid",
	outlined: "outline",
	text: "ghost",
} as const satisfies Record<ButtonVariant, "solid" | "outline" | "ghost">;

export type ButtonBaseProps = {
	label: string;
	icon?: keyof typeof IconData;
	variant?: ButtonVariant;
	color?: ThemeProps["accentColor"];
	onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

/**
 * Presentational button: the engine `Button`'s visuals (themed Radix button +
 * optional IconData glyph + label) without its form/action plumbing. The engine
 * `Button` renders through this, so the two can't drift.
 */
const ButtonBase = forwardRef<ElementRef<typeof RadixButton>, ButtonBaseProps>(
	({ label, icon, variant = "contained", color, onClick }, ref) => {
		const theme = useTheme();
		return (
			<RadixButton
				ref={ref}
				variant={RADIX_VARIANTS[variant] ?? "solid"}
				className={variant === "text" ? "cursor-pointer !m-0" : "cursor-pointer"}
				color={
					(theme.components.button?.color as ThemeProps["accentColor"]) ||
					color ||
					"blue"
				}
				onClick={onClick}
			>
				{icon ? <Icon icon={icon} size={14} /> : ""}
				{label}
			</RadixButton>
		);
	},
);

ButtonBase.displayName = "ButtonBase";

const Button = forwardRef<ElementRef<typeof RadixButton>, ButtonProps>(({
	label,
	actions,
	api,
	icon,
	variant,
	onClick,
	snackbarSuccess,
	snackbarError,
	confirmBox,
	reloadDataTable,
	color,
	modalId,
	navigate,
}) => {

	const fnCtxs = useStord((state) => state.fnCtxs)
	const navigateTo = useNavigateTo()
	const { clearCurrentFormSelected } = useData()
	const { showSnackbar } = useSnackbar()
	const { handleSubmit, formState, trigger } = useFormContext()
	const { startLoading, stopLoading } = useLoading()

	const [open, setOpen] = useState(false)

	const shouldValidateBeforeConfirm = useCallback(() => {
		const confirmActions = confirmBox?.True || []
		return confirmActions.includes("SubmitFormToPostAPI") || confirmActions.includes("SubmitFormToPatchAPI")
	}, [confirmBox])

	const showValidationAlert = useCallback(() => {
		const errorMessages = Object.entries(formState.errors)
			.map(([_, error]: any) => `${error?.message || "Invalid value"}`)
			.join('\n')

		showSnackbar({
			variant: "error",
			message: errorMessages || "Please check the form for errors",
		})
	}, [formState.errors, showSnackbar])

	const executeActions = useCallback(async (
		actionsToExecute: ButtonAction[] = [],
		event?: React.MouseEvent<HTMLButtonElement>
	) => {
		let loaderId: string | undefined;

		try {
			for (const action of actionsToExecute) {
				switch (action) {
					case 'SubmitFormToPostAPI':
					case 'SubmitFormToPatchAPI':
						// Trigger validation first
						const isValid = await trigger()

						// Check if there are validation errors
						if (!isValid) {
							// Collect error messages
							const errorMessages = Object.entries(formState.errors)
								.map(([_, error]: any) => `${error?.message || "Invalid value"}`)
								.join('\n')

							// Show alert with error messages
							showSnackbar({
								variant: "error",
								message: errorMessages || "Please check the form for errors",
							})
							break
						}

						await handleSubmit(async (data) => {
							if (data["id"] || data["_id"]) {
								api && await api({ id: data["id"] || data["_id"] }, { ...data })
							} else {
								api && await api({ ...data })
							}

							reloadDataTable && await fnCtxs[reloadDataTable]()

							if (snackbarSuccess) {
								showSnackbar({
									variant: snackbarSuccess.type,
									message: snackbarSuccess.message,
								})
							}
						})()
						break;
					case 'ClearCurrentFormSelected':
						clearCurrentFormSelected();
						break;
					case 'StartLoading':
						loaderId = startLoading();
						break;
					case 'StopLoading':
						loaderId && stopLoading(loaderId);
						break;
					case 'CloseModal':
						fnCtxs?.[modalId ?? "modal"]?.bind(fnCtxs)?.(false)
						fnCtxs?.["modalDatable"]?.bind(fnCtxs)?.(false)
						fnCtxs?.["modalEdit"]?.bind(fnCtxs)?.(false)
						break;
					case 'Navigate':
						navigateTo(navigate)
						break;
					default:
						break;
				}
			}

			if (event && onClick) {
				onClick(event);
			}
		} catch (err) {
			loaderId && stopLoading(loaderId);
			if (snackbarError === "$exception") {
				showSnackbar({
					variant: "error",
					message: getErrorMessage(err),
				})
			}
		}
	}, [api, clearCurrentFormSelected, handleSubmit, fnCtxs, onClick, showSnackbar, snackbarSuccess, startLoading, stopLoading, modalId, reloadDataTable, formState, trigger, snackbarError, navigateTo, navigate])

	const handleConfirm = useCallback((isConfirm: boolean) => {
		if (isConfirm) {
			executeActions(confirmBox?.True || [])
		} else {
			executeActions(confirmBox?.False || [])
		}
	}, [confirmBox, executeActions])

	const handleClick = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
		let [a1] = actions || []

		if (a1 === "ConfirmBox") {
			if (shouldValidateBeforeConfirm()) {
				const isValid = await trigger()

				if (!isValid) {
					showValidationAlert()
					return
				}
			}

			setOpen(true)
			return;
		}

		await executeActions(actions, e)


	}, [actions, executeActions, shouldValidateBeforeConfirm, trigger, showValidationAlert])

	return <>

		<ButtonBase
			label={label}
			icon={icon}
			variant={variant}
			color={color}
			onClick={handleClick}
		/>
		<ConfirmBox
			id="confirmBox"
			open={open}
			onOpenChange={() => setOpen(prev => !prev)}
			onConfirm={handleConfirm}
			title={confirmBox?.title || ""}
			description={confirmBox?.description || ""}
		/>
	</>
})

Button.displayName = 'Button';

export { Button, ButtonBase };
