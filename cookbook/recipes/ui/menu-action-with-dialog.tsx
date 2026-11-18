/**
 * @recipe Ask for input in a dialog from an Apps menu item
 * @aliases menu item with a dialog, prompt the user, input dialog, form
 *   dialog, apps menu action, ask for a value, find nodes by name, search
 *   dialog
 * @apis workspace.getCurrentNetworkId, dialog.open, table.getTable,
 *   selection.exclusiveSelect
 * @related ui/open-own-panel-after-action, selection/select-by-attribute
 *
 * ## When to use
 *
 * An Apps menu item needs something from the user before it acts: a text, a
 * number, a choice. This one asks for part of a node name, and selects the
 * nodes of the current network whose name contains it.
 *
 * ## Preconditions
 *
 * - `apis` is the `onClick` parameter of an `'apps-menu'` entry: the app's
 *   own object.
 * - A network is open. Give the entry `requires: { network: true }`, and the
 *   host greys it out until one is.
 *
 * ## Side effects
 *
 * - Opens a dialog in the host's frame: the host draws the title bar and its
 *   Close "X", and the recipe's component is the body.
 * - **Select** replaces the network's selection with the matches
 *   (`selection:changed`, no undo entry) and closes the dialog. With no
 *   match, the dialog stays open and says so, and the selection is unchanged.
 * - **Cancel**, the "X" and Escape close it and change nothing. A click
 *   outside the dialog does not close it.
 * - The host closes the dialog when the app is disabled.
 *
 * ## Pitfalls
 *
 * - **A menu entry is plain data.** It has no component and renders nothing:
 *   its `onClick` opens the dialog with `apis.dialog.open` and returns. The
 *   host closes the menu before `onClick` runs.
 * - **The form is a component.** `render` returns an element; the state
 *   (`useState`) lives in the component it renders, which re-renders on its
 *   own.
 * - **The dialog acts on the network it was opened for.** The recipe reads
 *   the current network when the item is chosen, and keeps that id. If the
 *   network is gone when the user confirms, the host's failure is shown in
 *   the dialog.
 * - **One dialog per id.** Opening again with the same `id` replaces the open
 *   dialog instead of stacking a second one: choosing the item twice shows
 *   one dialog.
 * - **Nobody sees what `onClick` returns.** The host only logs a rejected
 *   promise. Report a failure in the dialog, where the user is looking.
 * - Mutation topics: one `exclusiveSelect` call, so there is no partial
 *   result; selecting records no undo entry.
 *
 * ## Don't
 *
 * - Don't use `window.prompt`: it stops the whole page, and cannot be styled
 *   or validated.
 * - Don't look for a `component` on an `'apps-menu'` entry: it has none. The
 *   host draws the entry from its `label`, `tooltip` and `icon`.
 * - Don't call hooks in `render` itself: it is a function, not a component.
 *
 * ## Wiring
 *
 * Owner-bound: `apis` is the `onClick` parameter (`wiring/from-apps-menu.ts`).
 * `useAppContext()?.apis` in a component also works (`wiring/from-panel.tsx`).
 */
import type {
  ApiFailure,
  ApiResult,
  AppContextApis,
  IdType,
} from 'cyweb/ApiTypes'
import { Box, Button, TextField, Typography } from '@mui/material'
import { useState } from 'react'

const DIALOG_ID = 'select-by-name'

const failure = (code: string, message: string): ApiFailure => ({
  success: false,
  error: { code, severity: 'error', message },
})

/** Select the nodes whose name contains `text`, ignoring case. */
function selectByName(
  apis: Pick<AppContextApis, 'table' | 'selection'>,
  networkId: IdType,
  text: string,
): ApiResult<{ selected: number }> {
  const table = apis.table.getTable(networkId, 'node', { columns: ['name'] })
  if (!table.success) return table
  const wanted = text.trim().toLowerCase()
  const ids: IdType[] = []
  for (const row of table.data.rows) {
    const name = row.name
    if (typeof name === 'string' && name.toLowerCase().includes(wanted)) {
      ids.push(String(row.id))
    }
  }
  if (ids.length === 0) return { success: true, data: { selected: 0 } }
  const selected = apis.selection.exclusiveSelect(networkId, ids, [])
  if (!selected.success) return selected
  return { success: true, data: { selected: ids.length } }
}

interface FormProps {
  select: (text: string) => ApiResult<{ selected: number }>
  close: () => void
}

function SelectByNameForm({ select, close }: FormProps) {
  const [text, setText] = useState('')
  const [message, setMessage] = useState('')

  const submit = (): void => {
    const result = select(text)
    if (!result.success) setMessage(result.error.message)
    else if (result.data.selected === 0) {
      setMessage(`No node name contains "${text.trim()}".`)
    } else close()
  }

  return (
    <Box
      component="form"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <TextField
        autoFocus
        fullWidth
        margin="dense"
        label="Part of a node name"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      {message !== '' && (
        <Typography role="alert" color="error" variant="body2">
          {message}
        </Typography>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
        <Button onClick={close}>Cancel</Button>
        <Button
          type="submit"
          variant="contained"
          disabled={text.trim() === ''}
        >
          Select
        </Button>
      </Box>
    </Box>
  )
}

export function openSelectByNameDialog(
  apis: Pick<AppContextApis, 'workspace' | 'dialog' | 'table' | 'selection'>,
): ApiResult<{ dialogId: string }> {
  const current = apis.workspace.getCurrentNetworkId()
  if (!current.success) return current
  const { networkId } = current.data
  if (networkId === '') return failure('RECIPE_NO_NETWORK', 'no network is open')

  return apis.dialog.open({
    id: DIALOG_ID,
    title: 'Select nodes by name',
    render: ({ close }) => (
      <SelectByNameForm
        close={close}
        select={(text) => selectByName(apis, networkId, text)}
      />
    ),
  })
}
