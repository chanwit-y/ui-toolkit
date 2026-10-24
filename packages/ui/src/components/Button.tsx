import { Button as RadixButton, type ThemeProps } from '@radix-ui/themes';
import { forwardRef, useCallback, useState, type ElementRef } from "react";
import { useFormContext } from "react-hook-form";
import { getErrorMessage } from "../util/error";
import { ActionContext, ButtonAction, ButtonProps, ButtonVariant } from "./@types";
import { ConfirmBox } from "./ConfirmBox";
import { useLoading, useTheme } from "./context";
import { useData } from "./context/DataProvider";
import { useStord } from "./core/stord";
import { useNavigateTo } from "./core/pages";
import { useRowScope } from "./core/rowScope";
import { getStateStore, readSlice } from "./core/stateStore";
import { isCustomAction, resolveCustomAction, useActions } from "./core/actions";
import { useAuthOptional } from "../auth/azure/context";
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
	disabled?: boolean;
};

/**
 * Presentational button: the engine `Button`'s visuals (themed Radix button +
 * optional IconData glyph + label) without its form/action plumbing. The engine
 * `Button` renders through this, so the two can't drift.
 */
const ButtonBase = forwardRef<ElementRef<typeof RadixButton>, ButtonBaseProps>(
	({ label, icon, variant = "contained", color, onClick, disabled }, ref) => {
		const theme = useTheme();
		return (
			<RadixButton
				ref={ref}
				disabled={disabled}
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
	const { clearCurrentFormSelected, contextData } = useData()
	const { showSnackbar } = useSnackbar()
	const { handleSubmit, formState, trigger, getValues, setValue } = useFormContext()
	const { startLoading, stopLoading } = useLoading()
	const customActions = useActions()
	const auth = useAuthOptional()
	const rowScope = useRowScope()

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
							// An invalid form ends the chain: the actions after the
							// submit (StopLoading, CloseModal, …) assume it went through,
							// and closing the modal / drawer over a failed validation
							// would throw the user's input away.
							loaderId && stopLoading(loaderId)
							return
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
					case 'ReloadDataTable':
						if (reloadDataTable && fnCtxs[reloadDataTable]) await fnCtxs[reloadDataTable]()
						else console.warn(`[Button] ReloadDataTable: nothing registered under "${reloadDataTable}"`)
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
					case 'OpenModal':
						// Modals and drawers register `(open: boolean) => void` under their id.
						if (modalId) fnCtxs?.[modalId]?.bind(fnCtxs)?.(true)
						else console.warn("[Button] OpenModal needs `modalId` (the modal's or drawer's id)")
						break;
					case 'CloseModal':
						fnCtxs?.[modalId ?? "modal"]?.bind(fnCtxs)?.(false)
						fnCtxs?.["modalDatable"]?.bind(fnCtxs)?.(false)
						fnCtxs?.["modalEdit"]?.bind(fnCtxs)?.(false)
						break;
					case 'Navigate':
						navigateTo(navigate)
						break;
					case 'SignIn':
						if (auth) await auth.signIn()
						else console.warn(`[Button] "${label}": SignIn needs an <AzureAuth> (or <GummyApp> with project.auth) above the page — skipped.`)
						break;
					case 'SignOut':
						if (auth) await auth.signOut()
						else console.warn(`[Button] "${label}": SignOut needs an <AzureAuth> (or <GummyApp> with project.auth) above the page — skipped.`)
						break;
					default: {
						// "fn:<name>" — a consumer-coded action from the ActionsProvider
						// registry. It gets the same services the built-ins use, as one
						// context object; `false` ends the chain; an unknown name warns
						// and is skipped (see core/actions.tsx).
						if (!isCustomAction(action)) break;
						const fn = resolveCustomAction(customActions, action, label)
						if (!fn) break;
						const ctx: ActionContext = {
							form: {
								getValues: () => getValues(),
								setValue: (name, value) => setValue(name, value, { shouldDirty: true, shouldValidate: formState.isSubmitted }),
								trigger: () => trigger(),
								errors: formState.errors,
							},
							row: rowScope?.row,
							contextData,
							state: {
								get: readSlice,
								set: (key, data) => getStateStore(key).getState().setData(data),
							},
							api,
							fns: {
								reload: async (name) => {
									if (fnCtxs[name]) await fnCtxs[name]()
									else console.warn(`[Button] reload: nothing registered under "${name}"`)
								},
								openModal: (id) => fnCtxs?.[id]?.bind(fnCtxs)?.(true),
								closeModal: (id) => fnCtxs?.[id]?.bind(fnCtxs)?.(false),
							},
							snackbar: (variant, message) => showSnackbar({ variant, message }),
							startLoading,
							stopLoading,
							navigate: (target) => navigateTo(target),
							auth: auth
								? { status: auth.status, email: auth.account?.email, name: auth.account?.name, signIn: auth.signIn, signOut: auth.signOut, getToken: auth.getToken }
								: undefined,
							element: { label, actions, modalId, reloadDataTable, navigate, confirmBox },
							event,
						}
						const result = await fn(ctx)
						if (result === false) {
							loaderId && stopLoading(loaderId)
							return
						}
						break;
					}
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
	}, [api, clearCurrentFormSelected, handleSubmit, fnCtxs, onClick, showSnackbar, snackbarSuccess, startLoading, stopLoading, modalId, reloadDataTable, formState, trigger, snackbarError, navigateTo, navigate, customActions, auth, label, actions, confirmBox, contextData, getValues, setValue, rowScope])

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
