import React, { useState } from 'react'
import {
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material'

interface OpenExternalAppMenuProps {
  handleClose?: () => void
}

const OpenExternalAppMenu = ({
  handleClose,
}: OpenExternalAppMenuProps): JSX.Element => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setDialogOpen(true)
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setUrl('')
    setError('')
    handleClose?.()
  }

  const handleSubmit = () => {
    try {
      new URL(url) // Validate URL
      window.open(url, '_blank')
      handleDialogClose()
    } catch (e) {
      setError('Please enter a valid URL')
    }
  }

  return (
    <>
      <MenuItem onClick={handleMenuClick}>Open External App</MenuItem>

      <Dialog
        open={dialogOpen}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onClose={handleDialogClose}
      >
        <DialogTitle>Enter External App URL</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="URL"
            type="url"
            fullWidth
            value={url}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              // Do not propagate the event to the parent
              e.preventDefault()
              e.stopPropagation()
              setUrl(e.target.value)
              setError('')
            }}
            error={!!error}
            helperText={error}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!url}>
            Open
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default OpenExternalAppMenu
