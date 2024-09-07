import { MenuItem } from '@mui/material'
import { useState } from 'react'
import MessageDialog from './MessageDialog'

interface AppMenuItemProps {
  title: string
  handleClose?: () => void
}

/**
 * Actual menu item component that will be rendered in the host app.
 *
 * @param param
 * @returns
 */
const AppMenuItem = ({
  title = 'Simple Menu Example',
  handleClose,
}: AppMenuItemProps): JSX.Element => {
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleCloseDialog = () => {
    setDialogOpen(false)
    handleClose && handleClose()
  }

  const handleClick = (): void => {
    console.log('Click detected in Simple Menu app')
    setDialogOpen(true)
  }

  return (
    <>
      <MenuItem onClick={handleClick}>{title}</MenuItem>
      <MessageDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        message="Hello from the Simple Menu app! (AppMenuItem)"
      />
    </>
  )
}

export default AppMenuItem
