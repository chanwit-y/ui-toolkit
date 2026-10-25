/**
 * The types `scripts/gen-schemas.ts` turns into JSON Schema for the MCP: every
 * item config (the registry in `itemTypes.ts` names one per component type) plus
 * the shapes the tools take besides a config. A new config type is added here
 * and in the registry; the drift test fails until both agree.
 */
export const SCHEMA_ROOTS: { file: string; types: string[] }[] = [
  {
    file: 'src/components/Layout/types.ts',
    types: [
      'TextFieldConfig',
      'TextareaConfig',
      'SelectFieldConfig',
      'MultiAutocompleteConfig',
      'CheckboxConfig',
      'SwitchConfig',
      'RadioConfig',
      'DateConfig',
      'UploadImageConfig',
      'UploadFileConfig',
      'DataTableConfig',
      'DataTableEditableConfig',
      'FormListConfig',
      'RepeaterConfig',
      'TextConfig',
      'TypographyConfig',
      'AvatarConfig',
      'DividerConfig',
      'ButtonItemConfig',
      'HiddenConfig',
      'PaperConfig',
      'CardConfig',
      'HtmlContentConfig',
      'CustomComponentConfig',
      'ApprovalLineConfig',
      'SwitchProfileConfig',
      'ReplaceProfileConfig',
      'WorkflowEditorConfig',
      'TabConfig',
      'ModalConfig',
      'DrawerConfig',
      'PopoverConfig',
      'ContainerConfig',
      'GridItemSettings',
      'GridContainerSettings',
      'ShowWhen',
      'DataCondition',
      'ItemBinding',
    ],
  },
  { file: 'src/components/Api/types.ts', types: ['EndpointDef'] },
  { file: 'src/components/Model/types.ts', types: ['ModelField'] },
]
