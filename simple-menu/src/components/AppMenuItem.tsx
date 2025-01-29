import { MenuItem } from '@mui/material'
import React, { useState } from 'react'
import MessageDialog from './MessageDialog'
import { JSX } from 'react/jsx-runtime'

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
  title = 'Simple Dialog Example',
  handleClose,
}: AppMenuItemProps): JSX.Element => {
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleCloseDialog = () => {
    setDialogOpen(false)
    handleClose && handleClose()
  }

  const handleClick = (e: React.MouseEvent): void => {
    setDialogOpen(true)
  }

  return (
    <>
      <MenuItem onClick={handleClick}>{title}</MenuItem>
      <MessageDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        title="Hello Cytoscape World"
        message="This dialog is created by an App (AppMenuItem)"
        linkText="App developer's guide"
        linkUrl="https://github.com/cytoscape/cytoscape-web-app-examples"
      />
    </>
  )
}

export default AppMenuItem
