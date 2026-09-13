import { Modal } from '@gummy-ui/ui'
import type { ReactNode } from 'react'
import { Button } from './Button'

/** A small confirm sheet on the library Modal (delete / reset / detach). */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  danger = true,
  onConfirm,
  onClose,
}: {
  title: string
  body: ReactNode
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal
      id="studio-confirm"
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={title}
      width="430px"
    >
      <div className="pt-1 text-ui leading-relaxed text-ink-2">{body}</div>
      <div className="mt-4 flex justify-end gap-2 border-t border-line pt-3">
        <Button type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={onConfirm}
          className={danger ? 'border-danger bg-danger' : undefined}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
